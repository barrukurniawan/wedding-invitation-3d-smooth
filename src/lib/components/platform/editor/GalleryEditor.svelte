<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import { ApiError, uploadPhoto, deletePhoto } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()

  // ── Cover photo state ───────────────────────────────────────────────────────
  let uploadingCover = $state(false)
  let coverProgress = $state(0)
  let coverMsg = $state('')
  let coverInputEl = $state<HTMLInputElement | null>(null)

  // ── Gallery state ───────────────────────────────────────────────────────────
  let uploadingGallery = $state(false)
  let galleryProgress = $state(0)
  let galleryMsg = $state('')
  let galleryInputEl = $state<HTMLInputElement | null>(null)
  let isDragging = $state(false)
  let deletingUrl = $state<string | null>(null)

  const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

  function validateFile(file: File): string | null {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return 'Format harus JPG, PNG, atau WebP.'
    }
    if (file.size > MAX_SIZE) return 'Ukuran file maksimal 5 MB.'
    return null
  }

  // ── Cover photo upload ──────────────────────────────────────────────────────
  async function handleCoverUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const err = validateFile(file)
    if (err) { coverMsg = err; input.value = ''; return }

    uploadingCover = true
    coverMsg = ''
    coverProgress = 0
    try {
      const result = await uploadPhoto(file, 'cover', (pct) => { coverProgress = pct })
      config.wedding_photo = result.photo_url
      coverMsg = '✓ Foto cover berhasil diunggah!'
    } catch (err) {
      coverMsg = err instanceof ApiError ? err.message : 'Gagal mengunggah foto cover.'
    } finally {
      uploadingCover = false
      coverProgress = 0
      if (input) input.value = ''
    }
  }

  async function removeCover() {
    if (!config.wedding_photo) return
    deletingUrl = config.wedding_photo
    try {
      await deletePhoto(config.wedding_photo)
      config.wedding_photo = ''
      coverMsg = ''
    } catch (err) {
      coverMsg = err instanceof ApiError ? err.message : 'Gagal menghapus foto.'
    } finally {
      deletingUrl = null
    }
  }

  // ── Gallery multi-upload ────────────────────────────────────────────────────
  async function uploadFiles(files: File[]) {
    if (!files.length) return
    const gallery = config.gallery_photos || []
    if (gallery.length >= 30) {
      galleryMsg = 'Maksimal 30 foto galeri sudah tercapai.'
      return
    }

    uploadingGallery = true
    galleryMsg = ''
    galleryProgress = 0
    let uploaded = 0

    for (const file of files.slice(0, 30 - gallery.length)) {
      const err = validateFile(file)
      if (err) { galleryMsg = `${file.name}: ${err}`; continue }

      try {
        const result = await uploadPhoto(file, 'gallery', (pct) => {
          galleryProgress = Math.round(((uploaded + pct / 100) / files.length) * 100)
        })
        config.gallery_photos = [...(config.gallery_photos || []), result.photo_url]
        uploaded++
      } catch (err) {
        galleryMsg = err instanceof ApiError ? err.message : `Gagal upload ${file.name}.`
      }
    }

    if (!galleryMsg) galleryMsg = `✓ ${uploaded} foto berhasil diunggah!`
    uploadingGallery = false
    galleryProgress = 0
    if (galleryInputEl) galleryInputEl.value = ''
  }

  function onGalleryInputChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.length) uploadFiles(Array.from(input.files))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    isDragging = false
    const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
    )
    if (files.length) uploadFiles(files)
  }

  async function removeGalleryPhoto(url: string) {
    deletingUrl = url
    galleryMsg = ''
    try {
      await deletePhoto(url)
      config.gallery_photos = (config.gallery_photos || []).filter((p) => p !== url)
    } catch (err) {
      galleryMsg = err instanceof ApiError ? err.message : 'Gagal menghapus foto.'
    } finally {
      deletingUrl = null
    }
  }
</script>

<div class="form-section">
  <h3>Galeri Foto &amp; Foto Utama</h3>
  <p class="section-desc">
    Foto-foto yang akan ditampilkan dalam pigura 3D di dunia virtual pernikahan kalian. Maks 30 foto, JPG/PNG/WebP, maks 5 MB per file.
  </p>

  <!-- ── Foto Cover Utama ── -->
  <div class="cover-upload-section">
    <div class="cover-label-row">
      <span class="field-label">Foto Utama Pasangan (Cover)</span>
      {#if uploadingCover}
        <span class="uploading-badge">Mengunggah... {coverProgress}%</span>
      {/if}
    </div>

    {#if config.wedding_photo}
      <!-- Preview cover yang sudah ada -->
      <div class="cover-preview">
        <img src={config.wedding_photo} alt="Foto utama pasangan" class="cover-img" />
        <div class="cover-overlay">
          <button
            type="button"
            class="replace-btn"
            disabled={uploadingCover}
            onclick={() => coverInputEl?.click()}
          >
            🔄 Ganti Foto
          </button>
          <button
            type="button"
            class="delete-cover-btn"
            disabled={deletingUrl === config.wedding_photo}
            onclick={removeCover}
          >
            🗑 Hapus
          </button>
        </div>
      </div>
    {:else}
      <!-- Upload area cover -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="upload-zone cover-zone"
        class:uploading={uploadingCover}
        onclick={() => !uploadingCover && coverInputEl?.click()}
        onkeydown={(e) => e.key === 'Enter' && !uploadingCover && coverInputEl?.click()}
        role="button"
        tabindex="0"
      >
        {#if uploadingCover}
          <div class="upload-spinner"></div>
          <span>Mengunggah... {coverProgress}%</span>
          <div class="progress-bar"><div class="progress-fill" style="width:{coverProgress}%"></div></div>
        {:else}
          <span class="upload-icon">🖼</span>
          <span class="upload-hint">Klik untuk pilih foto utama pasangan</span>
          <span class="upload-sub">JPG, PNG, atau WebP · Maks 5 MB</span>
        {/if}
      </div>
    {/if}

    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      bind:this={coverInputEl}
      onchange={handleCoverUpload}
      style="display:none"
    />

    {#if coverMsg}
      <p class="upload-msg" class:success={coverMsg.startsWith('✓')} class:error={!coverMsg.startsWith('✓')}>{coverMsg}</p>
    {/if}
  </div>

  <div class="section-divider"></div>

  <!-- ── Galeri Foto ── -->
  <div class="gallery-upload-section">
    <div class="gallery-header-row">
      <span class="field-label">Galeri Foto ({(config.gallery_photos || []).length} / 30)</span>
      {#if uploadingGallery}
        <span class="uploading-badge">Mengunggah... {galleryProgress}%</span>
      {/if}
    </div>

    <!-- Drop Zone -->
    {#if (config.gallery_photos || []).length < 30}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="upload-zone gallery-drop-zone"
        class:dragging={isDragging}
        class:uploading={uploadingGallery}
        ondragenter={(e) => { e.preventDefault(); isDragging = true }}
        ondragleave={() => { isDragging = false }}
        ondragover={(e) => e.preventDefault()}
        ondrop={onDrop}
        onclick={() => !uploadingGallery && galleryInputEl?.click()}
        onkeydown={(e) => e.key === 'Enter' && !uploadingGallery && galleryInputEl?.click()}
        role="button"
        tabindex="0"
      >
        {#if uploadingGallery}
          <div class="upload-spinner"></div>
          <span>Mengunggah... {galleryProgress}%</span>
          <div class="progress-bar"><div class="progress-fill" style="width:{galleryProgress}%"></div></div>
        {:else if isDragging}
          <span class="upload-icon">📂</span>
          <span>Lepaskan untuk mengunggah!</span>
        {:else}
          <span class="upload-icon">📷</span>
          <span class="upload-hint">Seret &amp; lepas foto di sini, atau <u>klik untuk pilih</u></span>
          <span class="upload-sub">Bisa pilih banyak sekaligus · JPG, PNG, WebP · Maks 5 MB per file</span>
        {/if}
      </div>
    {/if}

    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      bind:this={galleryInputEl}
      onchange={onGalleryInputChange}
      style="display:none"
    />

    {#if galleryMsg}
      <p class="upload-msg" class:success={galleryMsg.startsWith('✓')} class:error={!galleryMsg.startsWith('✓')}>{galleryMsg}</p>
    {/if}

    <!-- Grid Foto Galeri -->
    <div class="gallery-grid">
      {#each config.gallery_photos || [] as photo, idx}
        <div class="gallery-item" class:deleting={deletingUrl === photo}>
          <img src={photo} alt="Foto Galeri {idx + 1}" loading="lazy" />
          <div class="gallery-item-overlay">
            <span class="gallery-item-num">{idx + 1}</span>
            <button
              type="button"
              class="remove-photo-btn"
              title="Hapus foto"
              disabled={deletingUrl === photo}
              onclick={() => removeGalleryPhoto(photo)}
            >
              {deletingUrl === photo ? '…' : '✕'}
            </button>
          </div>
        </div>
      {:else}
        <div class="gallery-empty">
          <span>Belum ada foto galeri</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .cover-upload-section,
  .gallery-upload-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cover-label-row,
  .gallery-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .field-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #554b47;
  }

  .uploading-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: #8f1d45;
    background: #fdf0f3;
    padding: 3px 10px;
    border-radius: 999px;
  }

  /* ── Upload Zone ── */
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 28px 20px;
    border: 2px dashed #ddd3ce;
    border-radius: 12px;
    background: #fffdfb;
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s, background 0.15s;
    user-select: none;
  }

  .upload-zone:hover:not(.uploading) {
    border-color: #c4455e;
    background: #fff8f9;
  }

  .upload-zone.dragging {
    border-color: #8f1d45;
    border-style: solid;
    background: #fdf0f3;
  }

  .upload-zone.uploading {
    cursor: wait;
    opacity: 0.8;
  }

  .cover-zone { min-height: 120px; }
  .gallery-drop-zone { min-height: 100px; }

  .upload-icon { font-size: 1.8rem; }
  .upload-hint { font-size: 0.875rem; color: #554b47; font-weight: 500; }
  .upload-sub { font-size: 0.75rem; color: #9e8e89; }

  /* ── Spinner ── */
  .upload-spinner {
    width: 28px; height: 28px;
    border: 3px solid rgba(143, 29, 69, 0.15);
    border-top-color: #8f1d45;
    border-radius: 50%;
    animation: spin 700ms linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Progress bar ── */
  .progress-bar {
    width: 100%;
    max-width: 200px;
    height: 4px;
    background: #ead9d6;
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: #8f1d45;
    border-radius: 2px;
    transition: width 0.2s ease;
  }

  /* ── Cover preview ── */
  .cover-preview {
    position: relative;
    width: 100%;
    max-width: 320px;
    border-radius: 10px;
    overflow: hidden;
    aspect-ratio: 3 / 2;
  }
  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .cover-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .cover-preview:hover .cover-overlay { opacity: 1; }
  .replace-btn, .delete-cover-btn {
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .replace-btn { background: white; color: #292321; }
  .replace-btn:hover { background: #f0ece8; }
  .delete-cover-btn { background: #c0392b; color: white; }
  .delete-cover-btn:hover { background: #a93226; }

  /* ── Divider ── */
  .section-divider {
    height: 1px;
    background: #eadbd6;
    margin: 8px 0;
  }

  /* ── Gallery Grid ── */
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }

  .gallery-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    background: #f3ede9;
    transition: opacity 0.2s;
  }
  .gallery-item.deleting { opacity: 0.5; pointer-events: none; }

  .gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .gallery-item-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 6px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .gallery-item:hover .gallery-item-overlay { opacity: 1; }

  .gallery-item-num {
    font-size: 0.65rem;
    font-weight: 700;
    color: rgba(255,255,255,0.8);
    line-height: 1;
    padding: 2px 5px;
    background: rgba(0,0,0,0.35);
    border-radius: 4px;
  }

  .remove-photo-btn {
    width: 22px; height: 22px;
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(192, 57, 43, 0.85);
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    line-height: 1;
    transition: background 0.15s;
  }
  .remove-photo-btn:hover { background: #c0392b; }

  .gallery-empty {
    grid-column: 1 / -1;
    padding: 24px;
    text-align: center;
    color: #9e8e89;
    font-size: 0.85rem;
    border: 1px dashed #ddd3ce;
    border-radius: 8px;
  }

  /* ── Messages ── */
  .upload-msg {
    margin: 0;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.82rem;
    line-height: 1.4;
    background: #f5f0ed;
    color: #554b47;
  }
  .upload-msg.success { background: #f0faf4; color: #1a5c3a; }
  .upload-msg.error { background: #fff4f6; color: #8f1d45; }
</style>
