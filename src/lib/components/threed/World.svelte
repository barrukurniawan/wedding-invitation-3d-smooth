<script lang="ts">
  import { onMount } from 'svelte'
  import { Canvas } from '@threlte/core'
  import Scene from './Scene.svelte'

  let {
    lowPower,
    onReady
  }: {
    lowPower?: boolean
    onReady?: () => void
  } = $props()

  let resolvedLowPower = $state(lowPower ?? false)

  if (lowPower === undefined) {
    onMount(() => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      const dpr = window.devicePixelRatio || 1
      resolvedLowPower = isMobile || dpr >= 1.5
    })
  }
</script>

<Canvas dpr={resolvedLowPower ? 1.25 : [1, 1.5]}>
  <Scene lowPower={resolvedLowPower} {onReady} />
</Canvas>
