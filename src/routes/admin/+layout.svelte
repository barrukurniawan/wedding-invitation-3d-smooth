<script lang="ts">
  import { onMount } from 'svelte'
  import TenantStateScreen from '$lib/components/tenant/TenantStateScreen.svelte'
  import { isRootHost } from '$lib/routing/host'

  let { children } = $props()
  let rootHost = $state<boolean | null>(null)

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
    rootHost = isRootHost(window.location.hostname)
  })
</script>

{#if rootHost === true}
  {@render children()}
{:else if rootHost === false}
  <TenantStateScreen state="notFound" />
{/if}
