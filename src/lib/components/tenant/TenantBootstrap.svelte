<script lang="ts">
  import { onMount, type Component } from 'svelte'
  import { configError, configStatus, loadConfig, weddingConfig } from '../../stores/weddingConfig.svelte'
  import TenantStateScreen from './TenantStateScreen.svelte'
  import InvitationLoading from '../ui/InvitationLoading.svelte'
  import { loadProgress, startFakeProgress, stopFakeProgress } from '../../stores/loadProgress.svelte'

  let InvitationApp = $state<Component>()

  async function bootstrap() {
    // Komponen 2D kecil (~2 KB): diunduh bersamaan dengan config supaya undangan 2D tidak
    // menunggu satu putaran lagi. Komponen 3D (besar, three.js) tetap baru dimuat bila perlu.
    const garden2d = import('../twod/Garden2DApp.svelte')
    await loadConfig()
    if ($configStatus !== 'ready') {
      stopFakeProgress()
      return
    }
    if ($weddingConfig?.preset === '2d_garden') {
      const module = await garden2d
      InvitationApp = module.default
    } else {
      const module = await import('../../../App.svelte')
      InvitationApp = module.default
    }
  }

  onMount(() => {
    startFakeProgress()
    void bootstrap()
  })
</script>

<!-- Aset 3D hanya untuk undangan 3D: undangan 2D (iframe garden-2d) tidak memakainya,
     dan mengunduhnya hanya berebut koneksi dengan gambar taman. -->
<svelte:head>
  {#if $configStatus === 'ready' && $weddingConfig?.preset !== '2d_garden'}
    <link rel="preload" href="/models/tamu.glb" as="fetch" crossorigin="anonymous" />
    <link rel="preload" href="/models/tamu-wanita.glb" as="fetch" crossorigin="anonymous" />
    <link rel="preload" href="/models/resepsionis.glb" as="fetch" crossorigin="anonymous" />
    <link rel="preload" href="/models/pengantin-pria.glb" as="fetch" crossorigin="anonymous" />
    <link rel="preload" href="/models/pengantin-wanita.glb" as="fetch" crossorigin="anonymous" />
    <link rel="preload" href="/nature/gltf/nature-pack.glb" as="fetch" crossorigin="anonymous" />
    <link rel="preload" href="/nature/gltf/Bush_Common_Flowers.gltf" as="fetch" crossorigin="anonymous" />
    <link rel="preload" href="/nature/gltf/Bush_Common_Flowers.bin" as="fetch" crossorigin="anonymous" />
    <link rel="preload" href="/nature/gltf/Leaves_NormalTree_C.png" as="image" />
  {/if}
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
