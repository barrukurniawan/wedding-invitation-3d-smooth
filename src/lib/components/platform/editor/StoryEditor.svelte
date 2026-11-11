<script lang="ts">
  // Cerita Kami (undangan 2D): maks 5 momen, tiap momen boleh punya 1 foto.
  import Icon from '$lib/components/icons/Icon.svelte'
  import { uploadPhoto, type StoryMoment, type WeddingConfig } from '$lib/api-client'
  import { prepareImageUpload } from '$lib/utils/prepareImageUpload'

  let { config = $bindable() }: { config: WeddingConfig } = $props()

  const MAX_MOMENTS = 5
  const MAX_FILE = 10 * 1024 * 1024
  const moments = $derived(config.story_moments ?? [])
  let uploadingIndex = $state<number | null>(null)
  let message = $state('')

  function setMoments(next: StoryMoment[]) {
    config.story_moments = next
  }

  function addMoment() {
    if (moments.length >= MAX_MOMENTS) return
    setMoments([...moments, { time: '', title: '', description: '', photo: '' }])
  }

  function removeMoment(index: number) {
    setMoments(moments.filter((_, i) => i !== index))
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= moments.length) return
    const next = [...moments]
    ;[next[index], next[target]] = [next[target], next[index]]
    setMoments(next)
  }

  function update(index: number, patch: Partial<StoryMoment>) {
    setMoments(moments.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  async function pickPhoto(index: number, event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { message = 'Format foto harus JPG, PNG, atau WebP.'; return }
    if (file.size > MAX_FILE) { message = 'Ukuran foto maksimal 10 MB.'; return }
    uploadingIndex = index
    message = 'Mengunggah foto...'
    try {
      const prepared = await prepareImageUpload(file)
      const result = await uploadPhoto(prepared, 'story')
      update(index, { photo: result.photo_url })
      message = '✓ Foto terpasang. Tekan Simpan Perubahan di bawah.'
    } catch (err) {
      message = err instanceof Error && err.message ? `Gagal: ${err.message}` : 'Foto belum dapat diunggah.'
    } finally {
      uploadingIndex = null
    }
  }
</script>

<div class="form-section">
  <h3>Cerita Kami</h3>
  <p class="section-desc">
    Perjalanan kalian yang tampil di jembatan <strong>Cerita Kami</strong> pada undangan 2D. Maksimal {MAX_MOMENTS} cerita,
    tiap cerita boleh diberi 1 foto. Kalau dikosongkan, undangan menampilkan satu momen "Hari bahagia" otomatis.
  </p>

  {#each moments as moment, index (index)}
    <div class="story-card">
      <div class="story-head">
        <strong>Cerita {index + 1}</strong>
        <span class="story-tools">
          <button type="button" disabled={index === 0} onclick={() => move(index, -1)} aria-label="Naikkan urutan">↑</button>
          <button type="button" disabled={index === moments.length - 1} onclick={() => move(index, 1)} aria-label="Turunkan urutan">↓</button>
          <button type="button" class="danger" onclick={() => removeMoment(index)} aria-label={`Hapus cerita ${index + 1}`}><Icon name="trash" size={14} /> Hapus</button>
        </span>
      </div>

      <div class="story-grid">
        <div class="story-field">
          <span class="story-label">Waktu</span>
          <input value={moment.time} maxlength="60" placeholder="Juni 2022" oninput={(e) => update(index, { time: (e.currentTarget as HTMLInputElement).value })} />
        </div>
        <div class="story-field">
          <span class="story-label">Judul</span>
          <input value={moment.title} maxlength="80" placeholder="Pertemuan pertama" oninput={(e) => update(index, { title: (e.currentTarget as HTMLInputElement).value })} />
        </div>
        <div class="story-field wide">
          <span class="story-label">Cerita <small>{moment.description.length}/500</small></span>
          <textarea value={moment.description} maxlength="500" rows="3" placeholder="Berkenalan di acara seorang teman, lalu obrolan kami tidak pernah berhenti." oninput={(e) => update(index, { description: (e.currentTarget as HTMLTextAreaElement).value })}></textarea>
        </div>
      </div>

      <div class="story-photo">
        {#if moment.photo}
          <img src={moment.photo} alt={`Foto cerita ${index + 1}`} loading="lazy" />
          <span class="story-photo-actions">
            <label class="photo-btn">Ganti foto<input type="file" accept="image/jpeg,image/png,image/webp" onchange={(e) => void pickPhoto(index, e)} /></label>
            <button type="button" class="photo-btn ghost" onclick={() => update(index, { photo: '' })}>Lepas foto</button>
          </span>
        {:else}
          <label class="photo-btn">
            {uploadingIndex === index ? 'Mengunggah...' : '+ Tambah foto (opsional)'}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingIndex !== null} onchange={(e) => void pickPhoto(index, e)} />
          </label>
        {/if}
      </div>
    </div>
  {/each}

  {#if moments.length < MAX_MOMENTS}
    <button type="button" class="add-story" onclick={addMoment}>+ Tambah cerita <small>({moments.length}/{MAX_MOMENTS})</small></button>
  {:else}
    <p class="story-note">Sudah {MAX_MOMENTS} cerita (maksimal).</p>
  {/if}
  {#if message}<p class="story-note">{message}</p>{/if}
</div>

<style>
  .story-card { margin-top: 16px; padding: 16px; border: 1px solid #eadfe1; border-radius: 16px; background: #fff; }
  .story-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; color: #8f1d45; }
  .story-tools { display: flex; align-items: center; gap: 6px; }
  .story-tools button { display: inline-flex; align-items: center; gap: 4px; min-width: 32px; justify-content: center; padding: 5px 9px; border: 1px solid #ead7dc; border-radius: 999px; background: #fff; color: #6d4a54; font: inherit; font-size: .78rem; font-weight: 700; cursor: pointer; }
  .story-tools button:disabled { opacity: .35; cursor: default; }
  .story-tools button.danger { color: #b42345; border-color: #f0c9d2; --mm-ic: #b42345; }
  .story-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 12px; }
  .story-field { display: grid; gap: 6px; min-width: 0; }
  .story-field.wide { grid-column: 1 / -1; }
  .story-label { display: flex; justify-content: space-between; font-size: .8rem; font-weight: 700; color: #4a3a3d; }
  .story-label small { font-weight: 500; color: #9a8a8d; }
  .story-photo { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 12px; }
  .story-photo img { width: 120px; height: 84px; object-fit: cover; border-radius: 12px; border: 1px solid #eadfe1; }
  .story-photo-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  /* display/flex-direction eksplisit: aturan global dashboard membuat label jadi kolom + kapital. */
  .photo-btn { display: inline-flex; flex-direction: row; align-items: center; width: auto; padding: 8px 14px; border: 1px dashed #c98ea1; border-radius: 999px; background: #fdf6f8; color: #8f1d45; font: inherit; font-size: .8rem; font-weight: 700; text-transform: none; letter-spacing: 0; cursor: pointer; }
  .photo-btn.ghost { border-style: solid; border-color: #ead7dc; background: #fff; color: #6d4a54; }
  .photo-btn input { display: none; }
  .add-story { margin-top: 16px; width: 100%; padding: 12px; border: 1.5px dashed #c98ea1; border-radius: 14px; background: #fdf6f8; color: #8f1d45; font: inherit; font-size: .9rem; font-weight: 700; cursor: pointer; }
  .add-story small { font-weight: 500; opacity: .75; }
  .story-note { margin: 12px 0 0; color: #7a6a6d; font-size: .82rem; }
  @media (max-width: 520px) { .story-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
