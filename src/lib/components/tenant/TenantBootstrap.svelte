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
    startFakeProgress()
    void bootstrap()
  })
</script>

<svelte:head>
  <link rel="preload" href="/models/tamu.glb" as="fetch" crossorigin="anonymous" />
  <link rel="preload" href="/models/tamu-wanita.glb" as="fetch" crossorigin="anonymous" />
  <link rel="preload" href="/models/resepsionis.glb" as="fetch" crossorigin="anonymous" />
  <link rel="preload" href="/models/pengantin-pria.glb" as="fetch" crossorigin="anonymous" />
  <link rel="preload" href="/models/pengantin-wanita.glb" as="fetch" crossorigin="anonymous" />
  <link rel="preload" href="/nature/gltf/Bush_Common_Flowers.gltf" as="fetch" crossorigin="anonymous" />
  <link rel="preload" href="/nature/gltf/Bush_Common_Flowers.bin" as="fetch" crossorigin="anonymous" />
  <link rel="preload" href="/nature/gltf/Leaves_NormalTree_C.png" as="image" />
</svelte:head>

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
