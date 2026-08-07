<script lang="ts">
  import { browser } from '$app/environment'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  let audio: HTMLAudioElement | null = $state(null)
  let playing = $state(false)
  let currentUrl = $state('')
  let needsGesture = $state(false)
  let gestureBound = false

  function removeGestureListeners() {
    if (!browser || !gestureBound) return
    window.removeEventListener('pointerdown', retryFromGesture)
    window.removeEventListener('keydown', retryFromGesture)
    gestureBound = false
  }

  function bindGestureListeners() {
    if (!browser || gestureBound) return
    window.addEventListener('pointerdown', retryFromGesture, { once: true, passive: true })
    window.addEventListener('keydown', retryFromGesture, { once: true })
    gestureBound = true
  }

  function retryFromGesture() {
    gestureBound = false
    void playAudio()
  }

  async function playAudio() {
    ensureAudio()
    if (!audio) return false
    try {
      await audio.play()
      playing = true
      needsGesture = false
      removeGestureListeners()
      return true
    } catch {
      playing = false
      needsGesture = true
      bindGestureListeners()
      return false
    }
  }

  function ensureAudio() {
    if (!browser) return
    const targetUrl = $weddingConfig?.bgm_url || '/audio/Marry%20You.mp3'
    
    // If audio is already initialized and the URL changed
    if (audio && currentUrl !== targetUrl) {
      const wasPlaying = playing
      audio.pause()
      audio.src = targetUrl
      audio.load()
      currentUrl = targetUrl
      if (wasPlaying) {
        audio.play().catch(() => { playing = false; needsGesture = true; bindGestureListeners() })
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

  $effect(() => {
    if ($weddingConfig && browser && !audio) void playAudio()
  })

  $effect(() => () => removeGestureListeners())

  function toggle() {
    ensureAudio()
    if (!audio) return
    if (playing) {
      audio.pause()
      playing = false
    } else {
      void playAudio()
    }
  }
</script>

<button
  class="audio-control absolute z-40 flex items-center justify-center"
  class:is-playing={playing}
  onclick={toggle}
  title={playing ? 'Jeda musik' : 'Putar musik'}
  aria-label={playing ? 'Jeda musik latar' : 'Putar musik latar'}
  aria-pressed={playing}
  aria-describedby={needsGesture ? 'audio-hint' : undefined}
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 9.5h3.2L12.5 6v12l-4.3-3.5H5z" />
    {#if playing}
      <path class="sound-wave wave-one" d="M15.2 9.1a4 4 0 0 1 0 5.8" />
      <path class="sound-wave wave-two" d="M17.7 6.9a7 7 0 0 1 0 10.2" />
    {:else}
      <path d="m15.2 10 4 4m0-4-4 4" />
    {/if}
  </svg>
  <span class="audio-status" aria-hidden="true"></span>
</button>
{#if needsGesture && !playing}
  <span id="audio-hint" class="audio-hint">Nyalakan musik</span>
{/if}

<style>
  .audio-control {
    top: calc(env(safe-area-inset-top) + 0.75rem);
    right: max(0.75rem, env(safe-area-inset-right));
    width: 2.8rem;
    height: 2.8rem;
    border: 1px solid var(--hud-edge);
    border-radius: 50%;
    background: var(--hud-ivory);
    box-shadow: inset 0 1px 0 var(--hud-edge-soft), 0 12px 26px -18px rgba(55, 30, 37, 0.8);
    color: var(--hud-maroon);
    transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
    -webkit-backdrop-filter: blur(16px) saturate(1.05);
    backdrop-filter: blur(16px) saturate(1.05);
  }

  .audio-hint {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 4.1rem);
    right: max(0.75rem, env(safe-area-inset-right));
    z-index: 40;
    border: 1px solid var(--hud-edge);
    border-radius: 0.7rem;
    background: var(--hud-ivory-strong);
    padding: 0.42rem 0.65rem;
    color: var(--hud-maroon);
    font: 650 0.68rem/1 Outfit, sans-serif;
    box-shadow: var(--hud-shadow);
  }

  .audio-control:hover { background: var(--hud-ivory-strong); }
  .audio-control:active { transform: scale(0.94); }
  .audio-control:focus-visible { outline: 2px solid var(--hud-gold); outline-offset: 3px; }

  .audio-control svg {
    width: 1.35rem;
    height: 1.35rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.65;
  }

  .audio-control svg path:first-child {
    fill: rgba(113, 54, 69, 0.12);
  }

  .audio-status {
    position: absolute;
    right: 0.18rem;
    bottom: 0.2rem;
    width: 0.46rem;
    height: 0.46rem;
    border: 1px solid rgba(255, 250, 242, 0.95);
    border-radius: 50%;
    background: #9a858a;
    transition: background 180ms ease, box-shadow 180ms ease;
  }

  .is-playing .audio-status {
    background: var(--hud-gold);
    box-shadow: 0 0 0 2px rgba(201, 164, 94, 0.18);
  }

  .is-playing .wave-one { animation: audio-wave 1.4s ease-in-out infinite; }
  .is-playing .wave-two { animation: audio-wave 1.4s 120ms ease-in-out infinite; }

  @keyframes audio-wave {
    0%, 100% { opacity: 0.48; }
    50% { opacity: 1; }
  }

  @media (min-width: 768px) and (pointer: fine) {
    .audio-control {
      top: calc(env(safe-area-inset-top) + 1rem);
      right: max(1rem, env(safe-area-inset-right));
    }
  }

  @media (pointer: coarse) and (orientation: landscape) and (max-height: 520px) {
    .audio-control {
      top: calc(env(safe-area-inset-top) + 0.45rem);
      right: max(0.85rem, env(safe-area-inset-right));
      width: 2.5rem;
      height: 2.5rem;
    }

    .audio-control svg { width: 1.2rem; height: 1.2rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .audio-control,
    .audio-status { transition: none; }
    .sound-wave { animation: none !important; opacity: 1; }
  }
</style>
