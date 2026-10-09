<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import FilePick from './ui/FilePick.svelte'
  import Icon from './ui/Icon.svelte'

  let { config, onUploadQris }: { config: WeddingConfig; onUploadQris: (e: Event) => void } = $props()
</script>

<h2 class="adm-card-title">Amplop Digital</h2>
<p class="adm-card-sub">QRIS dan rekening yang ditampilkan ke tamu di undangan demo.</p>

<div class="layout">
  <div class="adm-field">
    <span class="adm-label">Gambar QRIS</span>
    {#if config.qris_image}
      <img src={config.qris_image} alt="QRIS" class="qris" />
    {:else}
      <span class="qris empty"><Icon name="image" /></span>
    {/if}
    <FilePick label={config.qris_image ? 'Ganti QRIS' : 'Unggah QRIS'} accept="image/*" onChange={onUploadQris} hint="Maks. 2 MB" />
  </div>

  <div class="fields">
    <div class="adm-field"><label class="adm-label" for="bank-name">Bank</label><input id="bank-name" bind:value={config.bank_name} class="adm-input" /></div>
    <div class="adm-field"><label class="adm-label" for="bank-account">Nomor rekening</label><input id="bank-account" bind:value={config.bank_account} class="adm-input" inputmode="numeric" /></div>
    <div class="adm-field"><label class="adm-label" for="bank-holder">Atas nama</label><input id="bank-holder" bind:value={config.bank_holder} class="adm-input" /></div>
  </div>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: 24px;
    margin-top: 18px;
  }
  .qris {
    width: 180px;
    height: 180px;
    border-radius: 16px;
    object-fit: cover;
    border: 1px solid var(--adm-line);
    margin-bottom: 6px;
  }
  .qris.empty {
    display: grid;
    place-items: center;
    background: var(--adm-soft);
    color: var(--adm-muted);
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  @media (max-width: 640px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
