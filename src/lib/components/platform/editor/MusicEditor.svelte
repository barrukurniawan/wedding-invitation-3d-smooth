<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import { uploadMusic, ApiError } from '$lib/api-client'
  import { onMount } from 'svelte'

  let { config = $bindable() }: { config: WeddingConfig } = $props()

  let uploadInputEl: HTMLInputElement | undefined = $state()
  let isUploading = $state(false)
  let uploadProgress = $state(0)
  let uploadMsg = $state('')

  const DEFAULT_MUSIC_URL = '/audio/Marry%20You.mp3'
  const PRESETS = [
    { label: 'Marry You (Default)', url: DEFAULT_MUSIC_URL },
    { label: 'Until I Found You', url: '/audio/Until%20I%20Found%20You.mp3' },
    { label: 'A Thousand Years', url: '/audio/A%20Thousand%20Years.mp3' },
    { label: 'Love Story', url: '/audio/Love%20Story.mp3' },
    { label: 'Sempurna', url: '/audio/Sempurna.mp3' },
    { label: 'Separuh Aku', url: '/audio/Separuh%20Aku.mp3' },
  ]

  // Jika bgm_url kosong atau tidak ada di preset, asumsikan custom
  let selectedOption = $state<string>('')

  onMount(() => {
    if (!config.bgm_url) {
       selectedOption = DEFAULT_MUSIC_URL
       config.bgm_url = DEFAULT_MUSIC_URL
       config.bgm_title = 'Marry You'
    } else {
      const isPreset = PRESETS.some(p => p.url === config.bgm_url)
      selectedOption = isPreset ? config.bgm_url : 'custom'
    }
  })

  function handleOptionChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.value !== 'custom') {
       config.bgm_url = target.value
       config.bgm_title = PRESETS.find((preset) => preset.url === target.value)?.label.replace(' (Default)', '') || ''
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
       config.bgm_title = result.bgm_title
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
         <p class="mb-2 text-sm font-medium text-[var(--ink)]">{config.bgm_title || decodeURIComponent(config.bgm_url.split('/').pop()?.replace(/\.mp3$/i, '') || '')}</p>
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
