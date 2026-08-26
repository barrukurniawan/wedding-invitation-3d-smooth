<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import { inputClass, labelClass } from './styles'

  let { config, onUploadQris }: { config: WeddingConfig; onUploadQris: (e: Event) => void } = $props()

  const fileInputClass =
    'block w-full cursor-pointer text-sm text-stone-400 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-700 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-stone-600'
</script>

<h2 class="text-lg font-semibold text-rose-300">Pembayaran &amp; Amplop</h2>
<div class="mt-4 space-y-4">
  <div>
    <label class={labelClass}>QRIS Image</label>
    <div class="flex items-center gap-4">
      {#if config.qris_image}
        <img src={config.qris_image} alt="QRIS" class="h-24 w-24 rounded-xl border border-stone-700 object-cover" />
      {/if}
      <div class="flex-1">
        <input type="file" accept="image/*" onchange={onUploadQris} class={fileInputClass} />
        <p class="mt-1 text-xs text-stone-500">Maks. 2MB (JPG/PNG/WebP)</p>
      </div>
    </div>
  </div>
  <div class="grid grid-cols-3 gap-4">
    <div><label for="bank-name" class={labelClass}>Bank</label><input id="bank-name" bind:value={config.bank_name} class={inputClass} /></div>
    <div><label for="bank-account" class={labelClass}>No. Rekening</label><input id="bank-account" bind:value={config.bank_account} class={inputClass} /></div>
    <div><label for="bank-holder" class={labelClass}>Atas Nama</label><input id="bank-holder" bind:value={config.bank_holder} class={inputClass} /></div>
  </div>
</div>
