<script lang="ts">
  import { browser } from '$app/environment'

  let audio: HTMLAudioElement | null = $state(null)
  let playing = $state(false)

  function ensureAudio() {
    if (!audio && browser) {
      audio = new Audio('/audio/ambient.mp3')
      audio.loop = true
      audio.volume = 0.4
    }
  }

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
