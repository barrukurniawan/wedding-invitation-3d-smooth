<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import Icon from './ui/Icon.svelte'

  let { config }: { config: WeddingConfig } = $props()
</script>

<h2 class="adm-card-title">Lokasi</h2>
<p class="adm-card-sub">Alamat dan tautan Google Maps untuk tombol petunjuk arah.</p>

<div class="fields">
  <div class="adm-field"><label class="adm-label" for="venue-address">Alamat lokasi</label><input id="venue-address" bind:value={config.venue_address} class="adm-input" /></div>
  <div class="adm-field">
    <label class="adm-label" for="maps-url">URL Google Maps</label>
    <input id="maps-url" bind:value={config.maps_url} class="adm-input" placeholder="https://maps.app.goo.gl/..." />
    {#if config.maps_url}
      <a class="adm-hint test-link" href={config.maps_url} target="_blank" rel="noreferrer"><Icon name="pin" size={13} /> Uji tautan</a>
    {/if}
  </div>
</div>

<style>
  .fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 18px;
    max-width: 640px;
  }
  .test-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--adm-accent);
    font-weight: 600;
  }
</style>
