<script lang="ts">
  import { onMount, type Component } from 'svelte'
  import { configError, configStatus, loadConfig } from '../../stores/weddingConfig.svelte'
  import TenantStateScreen from './TenantStateScreen.svelte'

  let InvitationApp = $state<Component>()

  async function bootstrap() {
    await loadConfig()
    if ($configStatus === 'ready') {
      const module = await import('../../../App.svelte')
      InvitationApp = module.default
    }
  }

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
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
  <TenantStateScreen state="loading" />
{/if}
