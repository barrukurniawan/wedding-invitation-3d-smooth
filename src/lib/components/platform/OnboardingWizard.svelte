<script lang="ts">
  import { fade } from 'svelte/transition'

  type Props = {
    slugInput: string
    brideInput: string
    groomInput: string
    presetInput?: '3d_summer' | '2d_garden'
    busy: boolean
    errorMessage?: string
    slugPattern?: string
    handleCreate: () => Promise<void>
  }
  
  let { slugInput = $bindable(), brideInput = $bindable(), groomInput = $bindable(), presetInput = $bindable('3d_summer'), busy, errorMessage = '', handleCreate }: Props = $props()
</script>

<!-- Ambient Dynamic Theme Scenery Background (Changes with Selected Preset) -->
<div class="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
  <!-- 3D Summer Island Backdrop -->
  <div 
    class="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out transform"
    style="background-image: url('/media/preset-3d-desktop.png?v=2'); opacity: {presetInput === '3d_summer' ? '0.42' : '0'}; transform: scale({presetInput === '3d_summer' ? '1' : '1.04'}); filter: blur(2px);"
  ></div>

  <!-- 2D Pixel Garden Backdrop -->
  <div 
    class="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out transform"
    style="background-image: url('/media/preset-2d-desktop.png?v=3'); opacity: {presetInput === '2d_garden' ? '0.45' : '0'}; transform: scale({presetInput === '2d_garden' ? '1' : '1.04'}); filter: blur(2px);"
  ></div>

  <!-- Soft Vignette & Frosted Gradient for Perfect Form Readability -->
  <div class="absolute inset-0 bg-gradient-to-b from-stone-100/60 via-white/80 to-stone-100/90 backdrop-blur-[2px] transition-colors duration-700 {presetInput === '3d_summer' ? 'bg-amber-950/5' : 'bg-emerald-950/5'}"></div>
</div>

<div class="relative w-full max-w-2xl mx-auto p-6 sm:p-10 md:p-12 rounded-3xl bg-white/85 backdrop-blur-2xl border transition-all duration-500 {presetInput === '3d_summer' ? 'border-amber-200/80 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.2)]' : 'border-emerald-200/80 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)]'} overflow-hidden" in:fade={{ duration: 400, delay: 100 }}>
  <!-- Decorative Ambient Glows -->
  {#if presetInput === '3d_summer'}
    <div class="absolute -top-24 -right-24 w-72 h-72 bg-amber-300/35 rounded-full blur-3xl pointer-events-none transition-all duration-700"></div>
    <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-rose-300/30 rounded-full blur-3xl pointer-events-none transition-all duration-700"></div>
  {:else}
    <div class="absolute -top-24 -right-24 w-72 h-72 bg-emerald-300/35 rounded-full blur-3xl pointer-events-none transition-all duration-700"></div>
    <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-300/30 rounded-full blur-3xl pointer-events-none transition-all duration-700"></div>
  {/if}
  
  <div class="relative z-10 text-center mb-7">
    <span class="inline-flex items-center gap-1.5 py-1 px-4 rounded-full text-xs font-bold tracking-widest uppercase mb-3 shadow-sm transition-all duration-500 {presetInput === '3d_summer' ? 'bg-gradient-to-r from-amber-100 to-rose-100 text-amber-900' : 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-900'}">
      <span>✨</span> Mulai Perjalanan Kalian
    </span>
    <h2 class="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-2">Tentukan Desain & Link Undangan</h2>
    <p class="text-slate-500 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
      Pilih preset dunia virtual yang kalian sukai dan tentukan alamat subdomain unik untuk para tamu.
    </p>
  </div>

  <form
    class="relative z-10 space-y-6"
    onsubmit={(event) => {
      event.preventDefault()
      void handleCreate()
    }}
  >
    {#if errorMessage}
      <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2.5 shadow-sm">
        <span class="text-lg">⚠️</span>
        <span>{errorMessage}</span>
      </div>
    {/if}

    <!-- Preset Theme Selector with Visual Game Thumbnails -->
    <div class="space-y-3">
      <div class="flex items-center justify-between ml-1">
        <span class="block text-sm font-semibold text-slate-700">
          Pilih Preset Desain Undangan
        </span>
        <span class="text-xs font-medium px-2.5 py-0.5 rounded-full transition-colors duration-300 {presetInput === '3d_summer' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
          {presetInput === '3d_summer' ? '🏝️ 3D Summer' : '🌿 2D Garden'}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Preset 1: 3D Summer Island -->
        <button
          type="button"
          class="relative text-left rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-start group {presetInput === '3d_summer' ? 'border-amber-500 bg-amber-50/70 shadow-lg ring-4 ring-amber-400/20' : 'border-slate-200 bg-white/90 hover:border-slate-300 hover:shadow-md'}"
          onclick={() => presetInput = '3d_summer'}
        >
          <!-- Gameplay Image Preview Banner -->
          <div class="relative w-full h-28 overflow-hidden bg-slate-100 shrink-0">
            <img 
              src="/media/preset-3d-desktop.png?v=2" 
              alt="Preview Gameplay 3D Summer Island" 
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
            <div class="absolute top-2.5 left-2.5">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-white bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                PRESET 01
              </span>
            </div>
            {#if presetInput === '3d_summer'}
              <div class="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <span>✓</span> Terpilih
              </div>
            {/if}
          </div>

          <div class="p-3.5 flex-1 flex flex-col justify-start">
            <h4 class="font-bold text-slate-800 text-base flex items-center gap-1.5">
              <span>🏝️</span> Dunia 3D Summer Island
            </h4>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed">
              Petualangan 3D interaktif orang ketiga di pulau taman tropis dengan avatar & confetti.
            </p>
          </div>
        </button>

        <!-- Preset 2: 2D Pixel Garden -->
        <button
          type="button"
          class="relative text-left rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-start group {presetInput === '2d_garden' ? 'border-emerald-500 bg-emerald-50/70 shadow-lg ring-4 ring-emerald-400/20' : 'border-slate-200 bg-white/90 hover:border-slate-300 hover:shadow-md'}"
          onclick={() => presetInput = '2d_garden'}
        >
          <!-- Gameplay Image Preview Banner -->
          <div class="relative w-full h-28 overflow-hidden bg-slate-100 shrink-0">
            <img 
              src="/media/preset-2d-desktop.png?v=3" 
              alt="Preview Gameplay 2D Pixel Garden" 
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
            <div class="absolute top-2.5 left-2.5">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 bg-emerald-950/85 backdrop-blur-sm px-2 py-0.5 rounded-full border border-emerald-400/30">
                PRESET 02 · RINGAN
              </span>
            </div>
            {#if presetInput === '2d_garden'}
              <div class="absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <span>✓</span> Terpilih
              </div>
            {/if}
          </div>

          <div class="p-3.5 flex-1 flex flex-col justify-start">
            <h4 class="font-bold text-slate-800 text-base flex items-center gap-1.5">
              <span>🌿</span> Dunia 2D Pixel Garden
            </h4>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed">
              Sangat ringan di semua ponsel, retro pixel RPG, air mancur & musisi danau dengan multiplayer.
            </p>
          </div>
        </button>
      </div>

      <p class="text-xs text-slate-400 ml-1">
        💡 Tenang, kalian bisa beralih tema kapan saja di menu pengaturan tanpa kehilangan data.
      </p>
    </div>

    <!-- Subdomain Input -->
    <div class="space-y-2 group">
      <label for="invitation-slug" class="block text-sm font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-amber-600">
        Alamat Undangan (Subdomain)
      </label>
      <div class="flex items-center rounded-2xl shadow-sm border border-slate-200 bg-white overflow-hidden focus-within:ring-4 {presetInput === '3d_summer' ? 'focus-within:ring-amber-400/20 focus-within:border-amber-400' : 'focus-within:ring-emerald-400/20 focus-within:border-emerald-400'} transition-all duration-300">
        <input
          id="invitation-slug"
          bind:value={slugInput}
          maxlength="63"
          placeholder="nama-pasangan"
          required
          autocomplete="off"
          spellcheck="false"
          class="flex-1 bg-transparent py-3.5 sm:py-4 px-4 sm:px-5 text-slate-800 placeholder-slate-400 outline-none text-base sm:text-lg font-medium w-full"
        />
        <span class="px-3.5 sm:px-5 py-3.5 sm:py-4 bg-slate-50 text-slate-500 font-medium text-sm sm:text-base border-l border-slate-200 shrink-0">
          .marryme.web.id
        </span>
      </div>
    </div>

    <!-- Couple Names Inputs -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <div class="space-y-2 group">
        <label for="bride-name" class="block text-sm font-semibold text-slate-700 ml-1 transition-colors {presetInput === '3d_summer' ? 'group-focus-within:text-amber-600' : 'group-focus-within:text-emerald-600'}">
          Nama Mempelai Wanita
        </label>
        <input 
          id="bride-name"
          bind:value={brideInput}
          maxlength="255" 
          placeholder="Mis: Kia Anindya" 
          class="w-full bg-white border border-slate-200 rounded-2xl py-3.5 sm:py-4 px-4 sm:px-5 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 {presetInput === '3d_summer' ? 'focus:ring-amber-400/20 focus:border-amber-400' : 'focus:ring-emerald-400/20 focus:border-emerald-400'} transition-all duration-300 font-medium"
        />
      </div>
      <div class="space-y-2 group">
        <label for="groom-name" class="block text-sm font-semibold text-slate-700 ml-1 transition-colors {presetInput === '3d_summer' ? 'group-focus-within:text-amber-600' : 'group-focus-within:text-emerald-600'}">
          Nama Mempelai Pria
        </label>
        <input 
          id="groom-name"
          bind:value={groomInput}
          maxlength="255" 
          placeholder="Mis: Toni Pratama" 
          class="w-full bg-white border border-slate-200 rounded-2xl py-3.5 sm:py-4 px-4 sm:px-5 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 {presetInput === '3d_summer' ? 'focus:ring-amber-400/20 focus:border-amber-400' : 'focus:ring-emerald-400/20 focus:border-emerald-400'} transition-all duration-300 font-medium"
        />
      </div>
    </div>

    <!-- Submit Button -->
    <div class="pt-2 sm:pt-4">
      <button 
        type="submit" 
        disabled={busy || !slugInput.trim()}
        class="w-full relative overflow-hidden group rounded-2xl bg-slate-900 text-white font-bold text-base sm:text-lg py-4 px-8 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        <div class="absolute inset-0 w-full h-full {presetInput === '3d_summer' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500' : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600'} opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:group-hover:opacity-0"></div>
        <span class="relative flex items-center justify-center gap-3">
          {#if busy}
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Membuat...</span>
          {:else}
            <span class="text-xl">🚀</span> Mulai Buat Undangan
          {/if}
        </span>
      </button>
    </div>
  </form>
</div>
