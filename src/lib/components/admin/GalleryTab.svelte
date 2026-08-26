<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config, onUploadPhoto, onRemovePhoto }: { config: WeddingConfig; onUploadPhoto: (e: Event) => void; onRemovePhoto: (idx: number) => void } = $props()

  const fileInputClass =
    'block w-full cursor-pointer text-sm text-stone-400 file:mr-4 file:rounded-lg file:border-0 file:bg-rose-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-rose-500'
</script>

<h2 class="text-lg font-semibold text-rose-300">Galeri Foto</h2>
<div class="mt-4">
  <input type="file" accept="image/*" onchange={onUploadPhoto} class={fileInputClass} />
  <p class="mt-1 text-xs text-stone-500">Pilih foto satu per satu untuk diunggah (Maks 2MB per foto).</p>
</div>
<div class="mt-4 grid grid-cols-3 gap-3">
  {#each config.gallery_photos as photo, i (photo)}
    <div class="relative">
      <img src={photo} alt="Foto {i + 1}" class="aspect-square w-full rounded-lg object-cover" />
      <button class="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white hover:bg-red-600" onclick={() => onRemovePhoto(i)}>✕</button>
    </div>
  {:else}
    <p class="col-span-3 py-8 text-center text-sm text-stone-500">Belum ada foto.</p>
  {/each}
</div>
