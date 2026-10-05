<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()
</script>

<div class="form-section">
  <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
    <div>
      <h3 style="margin: 0;">Lokasi Pernikahan &amp; Peta Navigasi</h3>
      <p class="section-desc" style="margin: 4px 0 0;">
        Berikan petunjuk lokasi lengkap agar para tamu dapat membuka rute navigasi GPS menuju venue dengan mudah.
      </p>
    </div>

    {#if config.maps_url}
      <span class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
        <span>✓</span> Link Maps Siap
      </span>
    {:else}
      <span class="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
        <span>⚠️</span> Wajib Diisi
      </span>
    {/if}
  </div>

  <div class="card-subGroup" style="margin-top: 12px; border: 2px solid #f59e0b; background: linear-gradient(to bottom, #fffdfa, #ffffff);">
    <div class="space-y-4">
      <!-- Alamat Lengkap Venue -->
      <div class="flex flex-col gap-1.5">
        <label for="location-venue-address" class="text-xs font-bold text-stone-700 flex items-center justify-between">
          <span>ALAMAT LENGKAP VENUE / GEDUNG</span>
          <span class="text-[11px] font-normal text-stone-400">Jalan, No, Gedung, Kelurahan, Kecamatan, Kota</span>
        </label>
        <textarea
          id="location-venue-address"
          bind:value={config.venue_address}
          rows="3"
          placeholder="Contoh: Gedung Serbaguna Pernikahan, Jl. Gatot Subroto No. Kav. 54, RT.1/RW.2, Kuningan Barat, Mampang Prapatan, Jakarta Selatan"
          class="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm shadow-sm leading-relaxed"
        ></textarea>
      </div>

      <!-- Link Google Maps -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label for="location-maps-url" class="text-xs font-bold text-stone-700">
            LINK GOOGLE MAPS (URL NAVIGASI GPS)
          </label>
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs font-semibold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
          >
            <span>🗺️</span> Cari di Google Maps
          </a>
        </div>
        <div class="flex items-center gap-2">
          <input
            id="location-maps-url"
            bind:value={config.maps_url}
            placeholder="https://maps.app.goo.gl/... atau https://goo.gl/maps/..."
            class="flex-1 bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm shadow-sm font-mono"
          />
          {#if config.maps_url}
            <a
              href={config.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold border border-stone-300 shrink-0 transition flex items-center gap-1"
            >
              <span>🧭</span> Uji Link
            </a>
          {/if}
        </div>
        <div class="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-stone-600 mt-1">
          <p class="font-semibold text-amber-900 mb-1">💡 Cara mudah mengambil link Google Maps:</p>
          <ol class="list-decimal list-inside space-y-0.5 text-stone-600 text-[11.5px]">
            <li>Buka <strong>Google Maps</strong> di HP atau Komputer Anda.</li>
            <li>Cari nama gedung / tempat pernikahan Anda.</li>
            <li>Klik tombol <strong>Share / Bagikan</strong>, lalu pilih <strong>Salin Tautan / Copy Link</strong>.</li>
            <li>Paste link tersebut ke dalam kolom input di atas.</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</div>
