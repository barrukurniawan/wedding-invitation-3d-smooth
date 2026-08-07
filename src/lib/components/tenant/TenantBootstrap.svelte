<script lang="ts">
  import { onMount, type Component } from 'svelte'
  import { configError, configStatus, loadConfig } from '../../stores/weddingConfig.svelte'
  import TenantStateScreen from './TenantStateScreen.svelte'
  import InvitationLoading from '../ui/InvitationLoading.svelte'
  import { loadProgress, startFakeProgress, stopFakeProgress } from '../../stores/loadProgress.svelte'

  let InvitationApp = $state<Component>()

  async function bootstrap() {
    const appPromise = import('../../../App.svelte')
    await loadConfig()
    if ($configStatus !== 'ready') {
      stopFakeProgress()
      return
    }
    const module = await appPromise
    InvitationApp = module.default
  }

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
    startFakeProgress()
    void bootstrap()
  })
</script>

{#if $configStatus === 'ready' && InvitationApp}
  <InvitationApp />
{:else if $configStatus === 'expired'}
  <TenantStateScreen state="expired" />
{:else if $configStatus === 'suspended'}
  <TenantStateScreen state="suspended" />
{:else if $configStatus === 'notFound'}
  <TenantStateScreen state="notFound" />
{:else if $configStatus === 'error'}
  <TenantStateScreen state="error" message={$configError} onRetry={() => void bootstrap()} />
  {:else}
    <InvitationLoading progress={$loadProgress} />
  {/if}
