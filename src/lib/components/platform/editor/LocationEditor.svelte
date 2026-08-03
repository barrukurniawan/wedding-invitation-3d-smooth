<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()
</script>

<div class="form-section">
  <h3>Lokasi Pernikahan &amp; Peta Navigasi</h3>
  <p class="section-desc">Berikan petunjuk lokasi lengkap agar para tamu dapat menuju lokasi acara dengan mudah.</p>

  <div class="grid-2">
    <label class="col-span-2">
      Alamat Lengkap Venue / Gedung
      <textarea bind:value={config.venue_address} rows="3" placeholder="Alamat jalan, gedung, kota..."></textarea>
    </label>
    <label class="col-span-2">
      Link Google Maps (URL Tautan Navigasi)
      <input bind:value={config.maps_url} placeholder="https://maps.app.goo.gl/..." />
    </label>
  </div>
</div>
