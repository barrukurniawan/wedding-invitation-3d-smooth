<script lang="ts">
  import { onMount } from 'svelte'
  import { Canvas } from '@threlte/core'
  import Scene from './Scene.svelte'

  let {
    lowPower,
    renderQuality = 'desktop',
    highResolution = false,
    onReady
  }: {
    lowPower?: boolean
    renderQuality?: 'mobile' | 'desktop' | 'desktop-retina'
    highResolution?: boolean
    onReady?: () => void
  } = $props()

  let resolvedLowPower = $state(false)

  onMount(() => {
    if (lowPower !== undefined) {
      resolvedLowPower = lowPower
    } else {
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      const dpr = window.devicePixelRatio || 1
      resolvedLowPower = isMobile || dpr >= 1.5
    }
  })
</script>

<Canvas dpr={highResolution ? 1.5 : resolvedLowPower ? 1.25 : renderQuality === 'desktop-retina' ? 1.25 : [1, 1.25]}>
  <Scene lowPower={resolvedLowPower} {renderQuality} {onReady} />
</Canvas>
