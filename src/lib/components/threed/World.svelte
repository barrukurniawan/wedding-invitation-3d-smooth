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

<Canvas dpr={lowPower ? 1.25 : [1, 1.5]}>
  <Scene {lowPower} {onReady} />
</Canvas>
