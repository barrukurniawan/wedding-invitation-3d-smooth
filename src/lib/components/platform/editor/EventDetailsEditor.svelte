<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()
</script>

<div class="form-section">
  <h3>Jadwal &amp; Waktu Acara</h3>
  <p class="section-desc">Tentukan waktu utama pernikahan untuk penghitung waktu mundur (countdown) dan jadwal akad/resepsi.</p>

  <label class="mb-16">
    Tanggal Utama Pernikahan (Countdown)
    <input type="datetime-local" bind:value={config.wedding_date} required />
  </label>

  <div class="card-subGroup">
    <h4>1. Akad Nikah</h4>
    <div class="grid-3">
      <label>
        Tanggal Akad
        <input bind:value={config.akad_date} placeholder="Minggu, 16 Agustus 2026" />
      </label>
      <label>
        Waktu Akad
        <input bind:value={config.akad_time} placeholder="08:00 - 10:00 WIB" />
      </label>
      <label>
        Lokasi Akad
        <input bind:value={config.akad_location} placeholder="Kediaman Mempelai Wanita" />
      </label>
    </div>
  </div>

  <div class="card-subGroup">
    <h4>2. Resepsi Pernikahan</h4>
    <div class="grid-3">
      <label>
        Tanggal Resepsi
        <input bind:value={config.resepsi_date} placeholder="Minggu, 16 Agustus 2026" />
      </label>
      <label>
        Waktu Resepsi
        <input bind:value={config.resepsi_time} placeholder="11:00 - 14:00 WIB" />
      </label>
      <label>
        Lokasi Resepsi
        <input bind:value={config.resepsi_location} placeholder="Gedung Serbaguna" />
      </label>
    </div>
  </div>
</div>
