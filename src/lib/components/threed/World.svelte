<script lang="ts">
  import { Canvas } from '@threlte/core'
  import Scene from './Scene.svelte'

  let {
    lowPower = false,
    onReady
  }: {
    lowPower?: boolean
    onReady?: () => void
  } = $props()
</script>

<Canvas shadows={!lowPower} dpr={lowPower ? 1.5 : [1, 2]}>
  <Scene {lowPower} {onReady} />
</Canvas>
