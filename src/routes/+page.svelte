<script lang="ts">
  import { onMount } from 'svelte'
  import DashboardShell from '$lib/components/platform/DashboardShell.svelte'
  import TenantBootstrap from '$lib/components/tenant/TenantBootstrap.svelte'
  import TenantStateScreen from '$lib/components/tenant/TenantStateScreen.svelte'
  import { classifyBrowserHost, type HostContext } from '$lib/routing/host'
  import { trackVisit } from '$lib/utils/trackVisit'

  let hostContext = $state<HostContext | null>(null)

  onMount(() => {
    hostContext = classifyBrowserHost(window.location.hostname)
    trackVisit()
  })
</script>

{#if hostContext?.type === 'root'}
  <DashboardShell />
{:else if hostContext?.type === 'invitation'}
  <TenantBootstrap />
{:else if hostContext?.type === 'invalid'}
  <TenantStateScreen state="invalid" />
{:else}
  <div class="host-boot" aria-busy="true" aria-live="polite">
    <p>MarryMe</p>
  </div>
{/if}

<style>
  .host-boot {
    min-height: 100svh;
    display: grid;
    place-items: center;
    background: #f3f0e8;
    color: #191a17;
    font: 700 22px/1 Georgia, 'Times New Roman', serif;
  }
  .host-boot p {
    margin: 0;
  }
</style>
