<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()

  const hasAddress = $derived(Boolean(config.gift_address?.trim()))
</script>

<div class="form-section">
  <h3>Amplop Digital &amp; Kirim Hadiah</h3>
  <p class="section-desc">Untuk tamu yang ingin memberi tanda kasih: lewat transfer/QRIS, atau mengirim hadiah ke alamat kalian.</p>

  <div class="gift-card">
    <h4>💳 Transfer &amp; QRIS</h4>
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
        Gambar QRIS / Rekening
        <input bind:value={config.qris_image} placeholder="https://..." />
      </label>
    </div>
  </div>

  <div class="gift-card">
    <h4>🎁 Alamat Kirim Hadiah <span class="optional">opsional</span></h4>
    <p class="gift-hint">Kosongkan alamat bila tidak ingin menerima kiriman hadiah; bagian ini tidak akan tampil di undangan.</p>
    <div class="grid-2">
      <label>
        Nama Penerima
        <input bind:value={config.gift_recipient} maxlength="255" placeholder="Mis. Rina Pratiwi" />
      </label>
      <label>
        No. HP Penerima (untuk kurir)
        <input bind:value={config.gift_phone} maxlength="32" inputmode="tel" placeholder="0812 3456 7890" />
      </label>
      <label class="col-span-2">
        Alamat Lengkap
        <textarea bind:value={config.gift_address} rows="3" maxlength="1000" placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, kode pos"></textarea>
      </label>
      <label class="col-span-2">
        Catatan untuk Pengirim
        <input bind:value={config.gift_note} maxlength="255" placeholder="Mis. Mohon konfirmasi via WhatsApp sebelum mengirim" />
      </label>
      <label class="check col-span-2">
        <input type="checkbox" bind:checked={config.gift_phone_public} />
        <span>Tampilkan No. HP ke tamu <small>(jika tidak dicentang, nomor hanya tersimpan untuk kalian)</small></span>
      </label>
    </div>
    {#if hasAddress}
      <p class="gift-warning">⚠️ Alamat ini dapat dilihat oleh siapa pun yang membuka link undangan kalian.</p>
    {/if}
  </div>
</div>

<style>
  .gift-card {
    margin-top: 18px;
    padding: 18px;
    border-radius: 16px;
    border: 1px solid rgba(143, 29, 69, 0.12);
    background: #fffdfb;
  }
  .gift-card h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    font-size: 1rem;
  }
  .optional {
    padding: 2px 8px;
    border-radius: 999px;
    background: #f4eaec;
    color: #8f1d45;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .gift-hint {
    margin: -6px 0 12px;
    color: #806e72;
    font-size: 0.82rem;
  }
  textarea {
    width: 100%;
    resize: vertical;
    font: inherit;
  }
  .check {
    display: flex !important;
    flex-direction: row !important;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    text-transform: none;
    letter-spacing: normal;
  }
  .check input {
    width: 18px;
    height: 18px;
    accent-color: #8f1d45;
  }
  .check small {
    color: #806e72;
    font-weight: 400;
  }
  .gift-warning {
    margin: 12px 0 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: #fff8e6;
    color: #8a5a00;
    font-size: 0.82rem;
  }
</style>
