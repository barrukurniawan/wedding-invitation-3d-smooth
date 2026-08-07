<script lang="ts">
  import { onMount } from 'svelte'
  import { isLoaded } from '../../stores/gameState.svelte'
  import { loadProgress } from '../../stores/loadProgress.svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'
  import InvitationLoading from './InvitationLoading.svelte'

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
  })

</script>

{#if !$isLoaded}
  <InvitationLoading
    brideName={$weddingConfig.bride_name}
    groomName={$weddingConfig.groom_name}
    progress={$loadProgress}
  />
{/if}
