<script lang="ts">
  import { fade } from 'svelte/transition';

  type Props = {
    slugInput: string
    brideInput: string
    groomInput: string
    busy: boolean
    slugPattern: string
    handleCreate: () => Promise<void>
  }
  
  let { slugInput = $bindable(), brideInput = $bindable(), groomInput = $bindable(), busy, slugPattern, handleCreate }: Props = $props()
</script>

<div class="relative w-full max-w-2xl mx-auto p-8 md:p-12 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden" in:fade={{ duration: 400, delay: 100 }}>
  <!-- Decorative background elements -->
  <div class="absolute -top-24 -right-24 w-64 h-64 bg-rose-200/40 rounded-full blur-3xl pointer-events-none"></div>
  <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-200/40 rounded-full blur-3xl pointer-events-none"></div>
  
  <div class="relative z-10 text-center mb-10">
    <span class="inline-block py-1 px-4 rounded-full bg-gradient-to-r from-amber-100 to-rose-100 text-amber-900 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
      Mulai Perjalanan Kalian
    </span>
    <h2 class="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4">Tentukan Alamat Link Undangan</h2>
    <p class="text-slate-500 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
      Pilih subdomain unik yang singkat dan mudah diingat oleh keluarga serta para tamu.
    </p>
  </div>

  <form
    class="relative z-10 space-y-8"
    onsubmit={(event) => {
      event.preventDefault()
      void handleCreate()
    }}
  >
    <div class="space-y-2 group">
      <label class="block text-sm font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-amber-600">
        Alamat Undangan (Subdomain)
      </label>
      <div class="flex items-center rounded-2xl shadow-sm border border-slate-200 bg-white/90 overflow-hidden focus-within:ring-4 focus-within:ring-amber-400/20 focus-within:border-amber-400 transition-all duration-300">
        <input
          bind:value={slugInput}
          maxlength="63"
          pattern={slugPattern}
          placeholder="nama-pasangan"
          required
          autocomplete="off"
          spellcheck="false"
          class="flex-1 bg-transparent py-4 px-5 text-slate-800 placeholder-slate-400 outline-none text-lg font-medium w-full"
        />
        <span class="px-5 py-4 bg-slate-50/80 text-slate-500 font-medium border-l border-slate-200 shrink-0">
          .marryme.web.id
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-2 group">
        <label class="block text-sm font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-amber-600">
          Nama Mempelai Wanita
        </label>
        <input 
          bind:value={brideInput} 
          maxlength="255" 
          placeholder="Mis: Kia Anindya" 
          class="w-full bg-white/90 border border-slate-200 rounded-2xl py-4 px-5 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 transition-all duration-300 font-medium"
        />
      </div>
      <div class="space-y-2 group">
        <label class="block text-sm font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-amber-600">
          Nama Mempelai Pria
        </label>
        <input 
          bind:value={groomInput} 
          maxlength="255" 
          placeholder="Mis: Toni Pratama" 
          class="w-full bg-white/90 border border-slate-200 rounded-2xl py-4 px-5 text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 transition-all duration-300 font-medium"
        />
      </div>
    </div>

    <div class="pt-4">
      <button 
        type="submit" 
        disabled={busy || !slugInput.trim()}
        class="w-full relative overflow-hidden group rounded-2xl bg-slate-900 text-white font-bold text-lg py-4 px-8 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        <div class="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:group-hover:opacity-0"></div>
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
