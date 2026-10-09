<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import FilePick from './ui/FilePick.svelte'
  import Icon from './ui/Icon.svelte'

  let { config, onUploadPhoto, onRemovePhoto }: { config: WeddingConfig; onUploadPhoto: (e: Event) => void; onRemovePhoto: (idx: number) => void } = $props()
</script>

<div class="head">
  <div>
    <h2 class="adm-card-title">Galeri Foto</h2>
    <p class="adm-card-sub">{config.gallery_photos.length} foto · unggah satu per satu, maks. 2 MB per foto.</p>
  </div>
  <FilePick label="Tambah foto" accept="image/*" onChange={onUploadPhoto} />
</div>

<div class="grid">
  {#each config.gallery_photos as photo, i (photo)}
    <figure>
      <img src={photo} alt="Foto galeri {i + 1}" />
      <button type="button" class="remove" aria-label="Hapus foto {i + 1}" onclick={() => onRemovePhoto(i)}><Icon name="trash" size={14} /></button>
    </figure>
  {:else}
    <p class="adm-empty empty">Belum ada foto.</p>
  {/each}
</div>

<style>
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    margin-top: 18px;
  }
  figure {
    position: relative;
    margin: 0;
  }
  img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 16px;
  }
  .remove {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    color: var(--adm-red);
  }
  .remove:hover {
    background: var(--adm-red);
    color: #fff;
  }
  .empty {
    grid-column: 1 / -1;
  }
</style>
