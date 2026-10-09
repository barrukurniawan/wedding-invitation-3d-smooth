<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import FilePick from './ui/FilePick.svelte'
  import Icon from './ui/Icon.svelte'

  let { config, onUploadPhoto }: { config: WeddingConfig; onUploadPhoto: (e: Event) => void } = $props()
</script>

<h2 class="adm-card-title">Data Pengantin</h2>
<p class="adm-card-sub">Nama mempelai, orang tua, foto utama, dan kutipan pembuka.</p>

<div class="form-grid">
  <div class="adm-field"><label class="adm-label" for="bride-name">Nama mempelai wanita</label><input id="bride-name" bind:value={config.bride_name} class="adm-input" /></div>
  <div class="adm-field"><label class="adm-label" for="groom-name">Nama mempelai pria</label><input id="groom-name" bind:value={config.groom_name} class="adm-input" /></div>
  <div class="adm-field"><label class="adm-label" for="bride-parents">Orang tua mempelai wanita</label><input id="bride-parents" bind:value={config.bride_parents} class="adm-input" /></div>
  <div class="adm-field"><label class="adm-label" for="groom-parents">Orang tua mempelai pria</label><input id="groom-parents" bind:value={config.groom_parents} class="adm-input" /></div>

  <div class="adm-field span-2">
    <span class="adm-label">Foto utama pernikahan</span>
    <div class="photo-row">
      {#if config.wedding_photo}
        <img src={config.wedding_photo} alt="Foto utama" class="photo" />
      {:else}
        <span class="photo empty"><Icon name="image" /></span>
      {/if}
      <FilePick label={config.wedding_photo ? 'Ganti foto' : 'Unggah foto'} accept="image/*" onChange={onUploadPhoto} hint="Maks. 2 MB (JPG/PNG/WebP)" />
    </div>
  </div>

  <div class="adm-field span-2">
    <label class="adm-label" for="quote">Ayat / kutipan pembuka</label>
    <textarea id="quote" bind:value={config.quote} class="adm-input" placeholder="Maha suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan..."></textarea>
  </div>
</div>

<style>
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 18px;
  }
  .span-2 {
    grid-column: 1 / -1;
  }
  .photo-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .photo {
    width: 96px;
    height: 96px;
    border-radius: 16px;
    object-fit: cover;
    border: 1px solid var(--adm-line);
  }
  .photo.empty {
    display: grid;
    place-items: center;
    background: var(--adm-soft);
    color: var(--adm-muted);
  }
  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
