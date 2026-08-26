<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import { inputClass, labelClass } from './styles'

  let { config, onUploadMusic }: { config: WeddingConfig; onUploadMusic: (e: Event) => void } = $props()

  const fileInputClass =
    'block w-full cursor-pointer text-sm text-stone-400 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-700 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-stone-600'
</script>

<h2 class="text-lg font-semibold text-rose-300">Detail Acara</h2>
<div class="mt-4 space-y-4">
  <div><label for="wedding-date" class={labelClass}>Tanggal Pernikahan (untuk countdown)</label><input id="wedding-date" type="datetime-local" bind:value={config.wedding_date} class={inputClass} /></div>

  <div class="rounded-xl border border-stone-800 bg-stone-950 p-4">
    <p class="text-xs font-semibold uppercase tracking-wider text-rose-300">Musik Backsound (Auto-Play)</p>
    <div class="mt-2 grid grid-cols-2 gap-3">
      <div><label for="bgm-title" class={labelClass}>Judul Lagu</label><input id="bgm-title" bind:value={config.bgm_title} class={inputClass} placeholder="Misal: Marry You" /></div>
      <div>
        <label class={labelClass}>File MP3</label>
        <input type="file" accept="audio/mp3,audio/mpeg" onchange={onUploadMusic} class={fileInputClass} />
      </div>
    </div>
    {#if config.bgm_url}
      <p class="mt-2 text-xs text-green-400">✅ File aktif: {config.bgm_url}</p>
    {/if}
  </div>

  <div class="rounded-xl border border-stone-800 bg-stone-950 p-4">
    <p class="text-xs font-semibold uppercase tracking-wider text-rose-300">Akad Nikah</p>
    <div class="mt-2 grid grid-cols-3 gap-3">
      <div><label for="akad-date" class={labelClass}>Tanggal</label><input id="akad-date" bind:value={config.akad_date} class={inputClass} /></div>
      <div><label for="akad-time" class={labelClass}>Waktu</label><input id="akad-time" bind:value={config.akad_time} class={inputClass} /></div>
      <div><label for="akad-location" class={labelClass}>Lokasi</label><input id="akad-location" bind:value={config.akad_location} class={inputClass} /></div>
    </div>
  </div>
  <div class="rounded-xl border border-stone-800 bg-stone-950 p-4">
    <p class="text-xs font-semibold uppercase tracking-wider text-rose-300">Resepsi</p>
    <div class="mt-2 grid grid-cols-3 gap-3">
      <div><label for="resepsi-date" class={labelClass}>Tanggal</label><input id="resepsi-date" bind:value={config.resepsi_date} class={inputClass} /></div>
      <div><label for="resepsi-time" class={labelClass}>Waktu</label><input id="resepsi-time" bind:value={config.resepsi_time} class={inputClass} /></div>
      <div><label for="resepsi-location" class={labelClass}>Lokasi</label><input id="resepsi-location" bind:value={config.resepsi_location} class={inputClass} /></div>
    </div>
  </div>
</div>
