<script lang="ts">
  import { onMount } from 'svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  let iframeEl = $state<HTMLIFrameElement>()
  let loaded = $state(false)

  function sendConfig() {
    if (!iframeEl?.contentWindow || !$weddingConfig) return
    iframeEl.contentWindow.postMessage(
      {
        type: 'SET_WEDDING_CONFIG',
        config: $weddingConfig,
      },
      '*',
    )
  }

  onMount(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'GARDEN_READY') {
        sendConfig()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  })
</script>

<div class="garden-2d-container">
  <iframe
    bind:this={iframeEl}
    src="/demo/wedding-garden-2.html"
    title="Undangan Pernikahan 2D Pixel Garden"
    class="garden-2d-frame"
    allow="autoplay"
    onload={() => {
      loaded = true
      sendConfig()
      // Send again after brief delay to ensure game engine is initialized
      setTimeout(sendConfig, 800)
    }}
  ></iframe>
</div>

<style>
  .garden-2d-container {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    background: #405d3a;
  }
  .garden-2d-frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }
</style>
