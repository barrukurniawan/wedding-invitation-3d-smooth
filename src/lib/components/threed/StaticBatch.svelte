<script lang="ts">
  // Bungkus dekorasi yang TIDAK bergerak dan TIDAK interaktif. Isi tetap ditulis
  // deklaratif (<T.Mesh>, {#each}); setelah ter-mount, mesh digabung per material
  // supaya draw call turun drastis. Jangan masukkan objek ber-event (onclick),
  // beranimasi, atau yang muncul belakangan (mis. vegetasi deferred).
  import { T } from '@threlte/core'
  import { onMount, type Snippet } from 'svelte'
  import * as THREE from 'three'
  import { batchStaticMeshes, type StaticBatchResult } from '../../utils/staticBatch'

  let { children }: { children: Snippet } = $props()

  const group = new THREE.Group()
  group.name = 'static-batch-root'

  onMount(() => {
    let result: StaticBatchResult | undefined
    // Tunggu satu frame supaya Threlte sudah menerapkan semua prop transform anak.
    const frame = requestAnimationFrame(() => {
      result = batchStaticMeshes(group)
    })
    return () => {
      cancelAnimationFrame(frame)
      result?.dispose()
    }
  })
</script>

<T is={group}>
  {@render children()}
</T>
