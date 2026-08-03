<script lang="ts">
  import { browser } from '$app/environment'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  let audio: HTMLAudioElement | null = $state(null)
  let playing = $state(false)
  let currentUrl = $state('')

  function ensureAudio() {
    if (!browser) return
    const targetUrl = $weddingConfig?.bgm_url || '/audio/ambient.mp3'
    
    // If audio is already initialized and the URL changed
    if (audio && currentUrl !== targetUrl) {
      const wasPlaying = playing
      audio.pause()
      audio.src = targetUrl
      audio.load()
      currentUrl = targetUrl
      if (wasPlaying) {
        audio.play().catch(() => { playing = false })
      }
    }
    // Initial creation
    else if (!audio) {
      audio = new Audio(targetUrl)
      audio.loop = true
      audio.volume = 0.4
      currentUrl = targetUrl
    }
  }

  // Reactive effect to automatically update track if changed in config while playing
  $effect(() => {
    if ($weddingConfig?.bgm_url && audio) {
      ensureAudio()
    }
  })

  function toggle() {
    ensureAudio()
    if (!audio) return
    if (playing) {
      audio.pause()
      playing = false
    } else {
      audio.play().then(() => (playing = true)).catch(() => {})
    }
  }
</script>

<button
  class="absolute right-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-stone-700 bg-stone-900/70 text-lg backdrop-blur-md transition hover:bg-stone-800"
  onclick={toggle}
  title="Musik latar"
>
  {playing ? '🔊' : '🔇'}
</button>
