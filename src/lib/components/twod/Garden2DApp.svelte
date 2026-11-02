<script lang="ts">
  import { onMount } from 'svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'
  import { inviteKey } from '../../services/inviteAccess'

  let iframeEl = $state<HTMLIFrameElement>()
  let loaded = $state(false)

  let iframeSrc = $derived.by(() => {
    const params = new URLSearchParams()
    if ($weddingConfig?.slug) {
      params.set('site', $weddingConfig.slug)
    }
    if (typeof window !== 'undefined') {
      const currentParams = new URLSearchParams(window.location.search)
      // Nama tamu dari daftar tamu (kode valid) diutamakan di atas ?send= dari URL.
      const serverGuest = $weddingConfig?.guest
      const sendName = serverGuest?.name || currentParams.get('send')
      if (sendName) params.set('send', sendName)
      const guestGender = serverGuest?.gender || currentParams.get('g')
      if (guestGender) params.set('g', guestGender)
      // Kode tamu juga lewat URL iframe, untuk browser yang memblokir localStorage.
      const key = inviteKey()
      if (key) params.set('k', key)
    }
    const query = params.toString()
    return `/presets/garden-2d/index.html${query ? `?${query}` : ''}`
  })

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
    src={iframeSrc}
    title="Undangan Pernikahan 2D Pixel Garden"
    class="garden-2d-frame"
    allow="autoplay; fullscreen"
    onload={() => {
      loaded = true
      sendConfig()
      // Send again after brief delay to ensure game engine is initialized
      setTimeout(sendConfig, 500)
      setTimeout(sendConfig, 1500)
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
    background: #213d32;
  }
  .garden-2d-frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }
</style>
