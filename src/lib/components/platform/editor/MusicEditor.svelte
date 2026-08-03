<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import { uploadMusic, ApiError } from '$lib/api-client'
  import { onMount } from 'svelte'

  let { config = $bindable() }: { config: WeddingConfig } = $props()

  let uploadInputEl: HTMLInputElement | undefined = $state()
  let isUploading = $state(false)
  let uploadProgress = $state(0)
  let uploadMsg = $state('')

  const PRESETS = [
    { label: 'Ambient / Romantis (Default)', url: '/audio/ambient.mp3' },
    { label: 'Akustik Santai', url: '/audio/acoustic.mp3' },
    { label: 'Piano Elegan', url: '/audio/piano.mp3' }
  ]

  // Jika bgm_url kosong atau tidak ada di preset, asumsikan custom
  let selectedOption = $state<string>('')

  onMount(() => {
    if (!config.bgm_url) {
      selectedOption = '/audio/ambient.mp3'
      config.bgm_url = '/audio/ambient.mp3'
    } else {
      const isPreset = PRESETS.some(p => p.url === config.bgm_url)
      selectedOption = isPreset ? config.bgm_url : 'custom'
    }
  })

  function handleOptionChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.value !== 'custom') {
      config.bgm_url = target.value
    }
  }

  async function handleMusicUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    isUploading = true
    uploadProgress = 0
    uploadMsg = ''

    try {
      const result = await uploadMusic(file, (pct) => {
        uploadProgress = Math.round(pct)
      })
      config.bgm_url = result.bgm_url
      selectedOption = 'custom'
      uploadMsg = '✓ Musik berhasil diunggah!'
    } catch (err: any) {
      uploadMsg = err instanceof ApiError ? err.message : 'Gagal mengunggah musik.'
    } finally {
      isUploading = false
      if (input) input.value = '' // Reset input
    }
  }
</script>

<div class="form-section">
  <h3>Musik Latar (BGM)</h3>
  <p class="section-desc">Pilih lagu latar belakang yang akan diputar saat tamu membuka undangan 3D.</p>

  <div class="card-subGroup mt-4">
    <h4>Pilihan Musik</h4>
    
    <div class="flex flex-col gap-3 mt-4">
      {#each PRESETS as preset}
        <label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[var(--champagne)]/40 hover:bg-[var(--champagne)]/10 transition-colors">
          <input 
            type="radio" 
            name="bgm_preset" 
            value={preset.url} 
            bind:group={selectedOption}
            onchange={handleOptionChange}
            class="accent-[var(--rose)]"
          />
          <span class="text-[var(--ink)] font-medium">{preset.label}</span>
        </label>
      {/each}

      <label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[var(--champagne)]/40 hover:bg-[var(--champagne)]/10 transition-colors">
        <input 
          type="radio" 
          name="bgm_preset" 
          value="custom" 
          bind:group={selectedOption}
          class="accent-[var(--rose)]"
        />
        <span class="text-[var(--ink)] font-medium">Unggah Musik Sendiri</span>
      </label>
    </div>

    {#if selectedOption === 'custom'}
      <div class="mt-4 p-4 bg-[var(--champagne)]/10 rounded-lg border border-[var(--champagne)]/30">
        <input 
          type="file" 
          accept="audio/mpeg, audio/mp3"
          class="hidden"
          bind:this={uploadInputEl}
          onchange={handleMusicUpload}
        />
        <button 
          type="button"
          class="btn-secondary w-full py-2"
          disabled={isUploading}
          onclick={() => uploadInputEl?.click()}
        >
          {isUploading ? `Mengunggah... ${uploadProgress}%` : 'Pilih File MP3 (Maks 10MB)'}
        </button>

        {#if uploadMsg}
          <p class="text-sm mt-2 {uploadMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}">
            {uploadMsg}
          </p>
        {/if}
      </div>
    {/if}

    {#if config.bgm_url}
      <div class="mt-6">
        <p class="text-sm font-semibold text-[var(--muted)] mb-2 uppercase tracking-wide">Pratinjau Musik</p>
        <!-- svelte-ignore a11y_media_has_caption -->
        <audio 
          controls 
          src={config.bgm_url} 
          class="w-full h-10 rounded-lg outline-none"
        ></audio>
      </div>
    {/if}
  </div>
</div>
