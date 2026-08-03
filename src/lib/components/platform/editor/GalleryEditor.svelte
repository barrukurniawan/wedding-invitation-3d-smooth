<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()
  let newPhotoUrlInput = $state('')

  function addGalleryPhoto() {
    if (!config || !newPhotoUrlInput.trim()) return
    config.gallery_photos = [...(config.gallery_photos || []), newPhotoUrlInput.trim()]
    newPhotoUrlInput = ''
  }

  function removeGalleryPhoto(index: number) {
    if (!config) return
    config.gallery_photos = (config.gallery_photos || []).filter((_, i) => i !== index)
  }
</script>

<div class="form-section">
  <h3>Galeri Foto Dunia 3D</h3>
  <p class="section-desc">Foto-foto yang akan ditampilkan dalam pigura 3D interaktif di dunia virtual pernikahan kalian.</p>

  <label class="mb-16">
    Foto Utama Pernikahan (URL Image Cover)
    <input bind:value={config.wedding_photo} placeholder="https://..." />
  </label>

  <div class="gallery-input-row">
    <input bind:value={newPhotoUrlInput} placeholder="Masukkan URL gambar foto galeri..." />
    <button type="button" class="ghost" onclick={addGalleryPhoto}>+ Tambah Foto</button>
  </div>

  <div class="gallery-grid">
    {#each config.gallery_photos || [] as photo, idx}
      <div class="gallery-item">
        <img src={photo} alt="Foto Galeri {idx + 1}" />
        <button type="button" class="remove-photo-btn" title="Hapus foto" onclick={() => removeGalleryPhoto(idx)}>✕</button>
      </div>
    {:else}
      <p class="empty-muted-box">Belum ada foto galeri. Tambahkan URL foto pada form di atas.</p>
    {/each}
  </div>
</div>
