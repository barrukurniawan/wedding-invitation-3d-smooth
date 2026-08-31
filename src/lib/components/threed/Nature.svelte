<script lang="ts">
  import { T } from '@threlte/core'
  import { useGltf } from '@threlte/extras'
  import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
  import { onDestroy, untrack } from 'svelte'
  import * as THREE from 'three'
  import { getNatureTintForUrl } from '../../constants/natureColors'

  let {
    url,
    instances,
    leafColor,
    tint,
    materialColors,
    materialDuotones,
    tintGradient,
    scale = 1
  }: {
    url: string
    instances: { position: [number, number, number]; rotationY?: number; scale?: number }[]
    leafColor?: string
    tint?: string
    materialColors?: Record<string, string>
    materialDuotones?: Record<string, { light: string; dark: string }>
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

  const generatedTextures = new Set<THREE.Texture>()
  const colorMaskCache = new WeakMap<THREE.Texture, THREE.Texture>()
  const duotoneCache = new WeakMap<THREE.Texture, Map<string, THREE.Texture>>()

  // Override warna material berdasarkan nama. RGB tekstur dan vertex color
  // dinetralkan, tetapi alpha tekstur tetap dipakai untuk siluet foliage.
  function applyMaterialColors(ref: THREE.Object3D, colors: Record<string, string>) {
    ref.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial && colors[mat.name] !== undefined) {
          if (mat.map) {
            const colorMask = toColorMaskTexture(mat.map)
            if (colorMask) mat.map = colorMask
          }
          mat.vertexColors = false
          mat.color = new THREE.Color(colors[mat.name])
          mat.needsUpdate = true
        }
      }
    })
  }

  function toColorMaskTexture(tex: THREE.Texture): THREE.Texture | null {
    if (colorMaskCache.has(tex)) return colorMaskCache.get(tex)!
    const img = tex.image as (HTMLImageElement | HTMLCanvasElement) | undefined
    if (!img || !img.width || !img.height) return null
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img as CanvasImageSource, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = data.data
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 255
        pixels[i + 1] = 255
        pixels[i + 2] = 255
      }
      ctx.putImageData(data, 0, 0)
      const out = cloneTextureSettings(tex, canvas)
      colorMaskCache.set(tex, out)
      generatedTextures.add(out)
      return out
    } catch {
      return null
    }
  }

  function toDuotoneTexture(
    tex: THREE.Texture,
    lightColor: string,
    darkColor: string
  ): THREE.Texture | null {
    const cacheKey = `${lightColor}|${darkColor}`
    const cachedByColor = duotoneCache.get(tex)
    if (cachedByColor?.has(cacheKey)) return cachedByColor.get(cacheKey)!

    const img = tex.image as (HTMLImageElement | HTMLCanvasElement) | undefined
    if (!img || !img.width || !img.height) return null

    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img as CanvasImageSource, 0, 0)

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = data.data
      const light = new THREE.Color(lightColor).convertLinearToSRGB()
      const dark = new THREE.Color(darkColor).convertLinearToSRGB()

      for (let i = 0; i < pixels.length; i += 4) {
        const luminance = (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255
        pixels[i] = Math.round((dark.r + (light.r - dark.r) * luminance) * 255)
        pixels[i + 1] = Math.round((dark.g + (light.g - dark.g) * luminance) * 255)
        pixels[i + 2] = Math.round((dark.b + (light.b - dark.b) * luminance) * 255)
      }

      ctx.putImageData(data, 0, 0)
      const out = cloneTextureSettings(tex, canvas)
      if (!cachedByColor) duotoneCache.set(tex, new Map([[cacheKey, out]]))
      else cachedByColor.set(cacheKey, out)
      generatedTextures.add(out)
      return out
    } catch {
      return null
    }
  }

  function applyMaterialDuotones(ref: THREE.Object3D, duotones: Record<string, { light: string; dark: string }>) {
    ref.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial)) continue
        const duotone = duotones[mat.name]
        if (!duotone) continue
        if (mat.map) {
          const map = toDuotoneTexture(mat.map, duotone.light, duotone.dark)
          if (map) mat.map = map
        }
        mat.vertexColors = false
        mat.color = new THREE.Color('#ffffff')
        mat.needsUpdate = true
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
      const out = cloneTextureSettings(tex, canvas)
      luminanceCache.set(tex, out)
      generatedTextures.add(out)
      return out
    } catch {
      return null
    }
  }

  function cloneTextureSettings(source: THREE.Texture, canvas: HTMLCanvasElement) {
    const out = new THREE.CanvasTexture(canvas)
    out.colorSpace = source.colorSpace
    out.wrapS = source.wrapS
    out.wrapT = source.wrapT
    out.minFilter = source.minFilter
    out.magFilter = source.magFilter
    out.generateMipmaps = source.generateMipmaps
    out.flipY = source.flipY
    out.needsUpdate = true
    return out
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

  const gltf = untrack(() => useGltf(url, { meshoptDecoder: MeshoptDecoder }))
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
    if (materialDuotones) applyMaterialDuotones(prepared, materialDuotones)
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

    // Frustum culling optimization: split instances into chunks of max 100
    // so bounding spheres are tighter and Three.js frustum culling is more effective
    const CHUNK_SIZE = 100
    const numChunks = Math.ceil(instances.length / CHUNK_SIZE)

    for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
      const start = chunkIdx * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, instances.length)
      const chunkInstances = instances.slice(start, end)

      prepared.traverse((obj) => {
        const source = obj as THREE.Mesh
        if (!source.isMesh || source instanceof THREE.SkinnedMesh) return

        const mesh = new THREE.InstancedMesh(source.geometry, source.material, chunkInstances.length)
        mesh.name = `${source.name || 'nature'}-instances-${chunkIdx}`
        mesh.castShadow = false
        mesh.receiveShadow = false
        mesh.frustumCulled = true // enable frustum culling (default, but explicit)

        chunkInstances.forEach((instance, index) => {
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
    }

    const dispose = () => {
      for (const mesh of meshes) {
        mesh.dispose()
        mesh.geometry.dispose()
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const material of materials) material.dispose()
      }
      for (const texture of generatedTextures) texture.dispose()
      generatedTextures.clear()
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
