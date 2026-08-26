<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import { inputClass, labelClass } from './styles'

  let { config, onUploadPhoto }: { config: WeddingConfig; onUploadPhoto: (e: Event) => void } = $props()

  const fileInputClass =
    'block w-full cursor-pointer text-sm text-stone-400 file:mr-4 file:rounded-lg file:border-0 file:bg-rose-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-rose-500'
</script>

<h2 class="text-lg font-semibold text-rose-300">Data Pengantin</h2>
<div class="mt-4 grid grid-cols-2 gap-4">
  <div><label for="bride-name" class={labelClass}>Nama Mempelai Wanita</label><input id="bride-name" bind:value={config.bride_name} class={inputClass} /></div>
  <div><label for="groom-name" class={labelClass}>Nama Mempelai Pria</label><input id="groom-name" bind:value={config.groom_name} class={inputClass} /></div>
  <div><label for="bride-parents" class={labelClass}>Orangtua Wanita</label><input id="bride-parents" bind:value={config.bride_parents} class={inputClass} /></div>
  <div><label for="groom-parents" class={labelClass}>Orangtua Pria</label><input id="groom-parents" bind:value={config.groom_parents} class={inputClass} /></div>

  <div class="col-span-2">
    <label class={labelClass}>Foto Utama Pernikahan</label>
    <div class="flex items-center gap-4">
      {#if config.wedding_photo}
        <img src={config.wedding_photo} alt="Foto Utama" class="h-24 w-24 rounded-xl border border-stone-700 object-cover" />
      {/if}
      <div class="flex-1">
        <input type="file" accept="image/*" onchange={onUploadPhoto} class={fileInputClass} />
        <p class="mt-1 text-xs text-stone-500">Maks. 2MB (JPG/PNG/WebP)</p>
      </div>
    </div>
  </div>

  <div class="col-span-2"><label for="quote" class={labelClass}>Ayat / Quotes Pembuka</label><textarea id="quote" bind:value={config.quote} class="{inputClass} min-h-24 resize-y" placeholder="Maha suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan..."></textarea></div>
</div>
