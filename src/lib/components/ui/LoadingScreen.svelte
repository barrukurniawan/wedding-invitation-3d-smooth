<script lang="ts">
  import { onMount } from 'svelte'
  import { isLoaded, sceneLoadError } from '../../stores/gameState.svelte'
  import { loadProgress } from '../../stores/loadProgress.svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'
  import InvitationLoading from './InvitationLoading.svelte'

  let elapsed = $state(0)
  let timer: ReturnType<typeof setInterval> | null = null

  onMount(() => {
    timer = setInterval(() => { elapsed += 1 }, 1000)
    return () => { if (timer) clearInterval(timer) }
  })

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
  })

</script>

{#if !$isLoaded}
  {#if $sceneLoadError || elapsed >= 25}
    <div class="scene-error" role="alert">
      <p class="scene-error-title">Undangan belum siap dibuka</p>
      <p class="scene-error-copy">Perangkat belum berhasil menyiapkan grafis 3D. Muat ulang halaman untuk mencoba lagi.</p>
      <button class="scene-retry" onclick={() => window.location.reload()}>Muat ulang</button>
    </div>
  {:else}
    <InvitationLoading
      brideName={$weddingConfig.bride_name}
      groomName={$weddingConfig.groom_name}
      progress={$loadProgress}
    />
  {/if}
{/if}

<style>
  .scene-error {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: grid;
    place-content: center;
    padding: 2rem;
    background: #fff8ef;
    color: #713645;
    text-align: center;
    font-family: Outfit, system-ui, sans-serif;
  }
  .scene-error-title { margin: 0; font: 600 1.5rem/1.2 'Playfair Display', Georgia, serif; }
  .scene-error-copy { max-width: 23rem; margin: 0.75rem auto 0; color: #806e72; line-height: 1.5; }
  .scene-retry { margin: 1.25rem auto 0; border: 0; border-radius: 0.8rem; background: #713645; padding: 0.75rem 1.2rem; color: white; font: 600 0.9rem/1 Outfit, system-ui, sans-serif; }
</style>
