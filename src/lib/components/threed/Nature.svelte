<script lang="ts">
  import { T } from '@threlte/core'
  import { useGltf } from '@threlte/extras'
  import { onDestroy, untrack } from 'svelte'
  import * as THREE from 'three'
  import { getNatureTintForUrl } from '../../constants/natureColors'

  let {
    url,
    instances,
    leafColor,
    tint,
    materialColors,
    tintGradient,
    scale = 1
  }: {
    url: string
    instances: { position: [number, number, number]; rotationY?: number; scale?: number }[]
    leafColor?: string
    tint?: string
    materialColors?: Record<string, string>
    tintGradient?: { leaves: string; bark: string }
    scale?: number
  } = $props()

  function applyLeafColor(ref: THREE.Object3D, color: string) {
    ref.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial && mat.name.includes('Leaves')) {
          mat.color = new THREE.Color(color)
          mat.needsUpdate = true
        }
      }
    })
  }

  // Override warna material berdasarkan nama (mis. { Grey: '#ffffff' }).
  function applyMaterialColors(ref: THREE.Object3D, colors: Record<string, string>) {
    ref.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial && colors[mat.name] !== undefined) {
          mat.color = new THREE.Color(colors[mat.name])
          mat.needsUpdate = true
        }
      }
    })
  }

  // Cache tekstur luminance agar tidak diproses ulang per instance.
  const luminanceCache = new WeakMap<THREE.Texture, THREE.Texture>()

  // Ubah tekstur atlas ke grayscale (luminance) supaya tint menghasilkan warna
  // yang setia ke hex, bukan tint × atlas berwarna gelap (multiply biasa).
  // Hasil: shading (kecerahan) tetap, hue = tint. Pixel hitam tetap hitam.
  function toLuminanceTexture(tex: THREE.Texture): THREE.Texture | null {
    if (luminanceCache.has(tex)) return luminanceCache.get(tex)!
    const img = tex.image as (HTMLImageElement | HTMLCanvasElement) | undefined
    if (!img || !img.width || !img.height) return null
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img as CanvasImageSource, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = data.data
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        d[i] = d[i + 1] = d[i + 2] = lum
      }
      ctx.putImageData(data, 0, 0)
      const out = new THREE.CanvasTexture(canvas)
      out.colorSpace = tex.colorSpace
      out.wrapS = tex.wrapS
      out.wrapT = tex.wrapT
      out.minFilter = tex.minFilter
      out.magFilter = tex.magFilter
      out.generateMipmaps = tex.generateMipmaps
      out.needsUpdate = true
      luminanceCache.set(tex, out)
      return out
    } catch {
      return null
    }
  }

  // Pewarnaan berbasis tinggi vertikal vertex: rendah = batang (bark),
  // tinggi = kanopi/daun (leaves). Andal — tidak bergantung tekstur colormap.
  function applyTintGradientByHeight(ref: THREE.Object3D, leaves: string, bark: string) {
    const leaf = new THREE.Color(leaves)
    const barkColor = new THREE.Color(bark)
    const tmp = new THREE.Color()
    ref.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.geometry) return
      const geo = mesh.geometry as THREE.BufferGeometry
      const pos = geo.getAttribute('position')
      if (!pos) return
      let minY = Infinity, maxY = -Infinity
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
      const range = maxY - minY || 1
      const colors = new Float32Array(pos.count * 3)
      for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) - minY) / range
        // Batang di ~20% bawah, daun di atas ~50%, transisi halus di antaranya.
        const k = THREE.MathUtils.smoothstep(t, 0.2, 0.5)
        tmp.copy(barkColor).lerp(leaf, k)
        colors[i * 3] = tmp.r
        colors[i * 3 + 1] = tmp.g
        colors[i * 3 + 2] = tmp.b
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geo.computeVertexNormals()
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.map = null
          mat.vertexColors = true
          mat.color = new THREE.Color('#ffffff')
          mat.needsUpdate = true
        }
      }
    })
  }


  // Tint colorize: desaturate atlas ke luminance, lalu material.color = tint.
  // #ffffff = identity (tidak ubah tekstur asli).
  function applyTint(ref: THREE.Object3D, color: string) {
    if (color === '#ffffff') return
    const target = new THREE.Color(color)
    ref.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (mat.map) {
            const lum = toLuminanceTexture(mat.map)
            if (lum) mat.map = lum
          }
          mat.color = target
          mat.needsUpdate = true
        }
      }
    })
  }

  type InstancedNature = {
    meshes: THREE.InstancedMesh[]
    dispose: () => void
  }

  let instancedNature: InstancedNature | undefined
  let destroyed = false

  const gltf = untrack(() => useGltf(url))
  const nature = untrack(async () => {
    const { scene } = await gltf
    const resolvedTint = tint ?? getNatureTintForUrl(url)
    const prepared = scene.clone(true)

    prepared.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry = mesh.geometry.clone()
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone()
    })

    if (leafColor) applyLeafColor(prepared, leafColor)
    if (materialColors) applyMaterialColors(prepared, materialColors)
    if (tintGradient) {
      applyTintGradientByHeight(prepared, tintGradient.leaves, tintGradient.bark)
    } else {
      applyTint(prepared, resolvedTint)
    }

    prepared.updateMatrixWorld(true)
    const meshes: THREE.InstancedMesh[] = []
    const transform = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Quaternion()
    const instanceScale = new THREE.Vector3()
    const rotationEuler = new THREE.Euler()

    prepared.traverse((obj) => {
      const source = obj as THREE.Mesh
      if (!source.isMesh || source instanceof THREE.SkinnedMesh) return

      const mesh = new THREE.InstancedMesh(source.geometry, source.material, instances.length)
      mesh.name = `${source.name || 'nature'}-instances`
      mesh.castShadow = false
      mesh.receiveShadow = false

      instances.forEach((instance, index) => {
        const resolvedScale = (instance.scale ?? 1) * scale
        position.fromArray(instance.position)
        rotation.setFromEuler(rotationEuler.set(0, instance.rotationY ?? 0, 0))
        instanceScale.setScalar(resolvedScale)
        transform.compose(position, rotation, instanceScale)
        transform.multiply(source.matrixWorld)
        mesh.setMatrixAt(index, transform)
      })

      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingBox()
      mesh.computeBoundingSphere()
      meshes.push(mesh)
    })

    const dispose = () => {
      for (const mesh of meshes) {
        mesh.dispose()
        mesh.geometry.dispose()
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const material of materials) material.dispose()
      }
    }

    const result = { meshes, dispose }
    if (destroyed) {
      dispose()
    } else {
      instancedNature = result
    }
    return result
  })

  onDestroy(() => {
    destroyed = true
    instancedNature?.dispose()
  })
</script>

{#await nature then { meshes }}
  {#each meshes as mesh}
    <T is={mesh} />
  {/each}
{/await}
