<script lang="ts">
  import { T } from '@threlte/core'
  import { useGltf } from '@threlte/extras'
  import { untrack } from 'svelte'
  import * as THREE from 'three'
  import { getNatureTint } from '../../constants/natureTheme'

  let {
    url,
    instances,
    leafColor,
    tint,
    materialColors,
    scale = 1
  }: {
    url: string
    instances: { position: [number, number, number]; rotationY?: number; scale?: number }[]
    leafColor?: string
    tint?: string
    materialColors?: Record<string, string>
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

  // Tint multiply: material.color × baseColorTexture. Tidak ubah visual saat #ffffff.
  function applyTint(ref: THREE.Object3D, color: string) {
    if (color === '#ffffff') return
    const target = new THREE.Color(color)
    ref.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color = target
          mat.needsUpdate = true
        }
      }
    })
  }

  const gltf = untrack(() => useGltf(url))
  const scenes = untrack(async () => {
    const { scene } = await gltf
    const resolvedTint = tint ?? getNatureTint(url)

    return instances.map(() => {
      const clone = scene.clone(true)
      if (leafColor) applyLeafColor(clone, leafColor)
      if (materialColors) applyMaterialColors(clone, materialColors)
      applyTint(clone, resolvedTint)
      return clone
    })
  })
</script>

{#await scenes then clones}
  {#each instances as inst, i}
    <T.Group position={inst.position} rotation.y={inst.rotationY ?? 0} scale={(inst.scale ?? 1) * scale}>
      <T
        is={clones[i]}
        castShadow
        receiveShadow
      />
    </T.Group>
  {/each}
{/await}
