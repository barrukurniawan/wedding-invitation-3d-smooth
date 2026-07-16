<script lang="ts">
  import { T } from '@threlte/core'
  import { useGltf } from '@threlte/extras'
  import { untrack } from 'svelte'
  import * as THREE from 'three'

  let {
    url,
    instances,
    leafColor
  }: {
    url: string
    instances: { position: [number, number, number]; rotationY?: number; scale?: number }[]
    leafColor?: string
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

  const gltf = untrack(() => useGltf(url))
  const scenes = untrack(async () => {
    const { scene } = await gltf

    return instances.map(() => {
      const clone = scene.clone(true)
      if (leafColor) applyLeafColor(clone, leafColor)
      return clone
    })
  })
</script>

{#await scenes then clones}
  {#each instances as inst, i}
    <T.Group position={inst.position} rotation.y={inst.rotationY ?? 0} scale={inst.scale ?? 1}>
      <T
        is={clones[i]}
        castShadow
        receiveShadow
      />
    </T.Group>
  {/each}
{/await}
