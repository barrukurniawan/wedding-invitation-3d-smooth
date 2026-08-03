<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()
</script>

<div class="form-section">
  <h3>Amplop Digital &amp; Hadiah Pernikahan</h3>
  <p class="section-desc">Fitur bagi para tamu yang ingin mengirimkan hadiah atau ucapan kasih via transfer/QRIS.</p>

  <div class="grid-2">
    <label>
      Bank Transfer
      <input bind:value={config.bank_name} placeholder="BCA / Mandiri / BNI" />
    </label>
    <label>
      Nomor Rekening
      <input bind:value={config.bank_account} placeholder="1234567890" />
    </label>
    <label class="col-span-2">
      Atas Nama Pemilik Rekening
      <input bind:value={config.bank_holder} placeholder="Atas nama di rekening bank" />
    </label>
    <label class="col-span-2">
      Gambar QRIS (URL Image)
      <input bind:value={config.qris_image} placeholder="https://..." />
    </label>
  </div>
</div>
