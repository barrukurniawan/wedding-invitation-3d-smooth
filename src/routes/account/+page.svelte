<script lang="ts">
  import { onMount } from 'svelte'
  import DashboardShell from '$lib/components/platform/DashboardShell.svelte'
  import TenantStateScreen from '$lib/components/tenant/TenantStateScreen.svelte'
  import { isRootHost } from '$lib/routing/host'

  let rootHost = $state<boolean | null>(null)
  onMount(() => {
    rootHost = isRootHost(window.location.hostname)
  })
</script>

{#if rootHost === true}
  <DashboardShell />
{:else if rootHost === false}
  <TenantStateScreen state="notFound" />
{/if}
