<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import {
    extractIsoDate,
    extractTimes,
    formatIndonesianDate,
    buildTimeString,
    combineToIsoDateTime,
    getTodayIso,
  } from '$lib/utils/dateFormatter'

  let { config = $bindable() }: { config: WeddingConfig } = $props()

  const minSelectableDate = getTodayIso()

  // Initialize Akad state
  let akadIsoDate = $state(extractIsoDate(config.wedding_date || config.akad_date))
  const initialAkadTimes = extractTimes(config.akad_time)
  let akadStartTime = $state(initialAkadTimes.startTime)
  let akadEndTime = $state(initialAkadTimes.endTime)
  let akadTimezone = $state<'WIB' | 'WITA' | 'WIT'>(initialAkadTimes.timezone)

  // Initialize Resepsi state
  let resepsiIsoDate = $state(extractIsoDate(config.resepsi_date || config.wedding_date))
  const initialResepsiTimes = extractTimes(config.resepsi_time)
  let resepsiStartTime = $state(initialResepsiTimes.startTime || '11:00')
  let resepsiEndTime = $state(initialResepsiTimes.endTime || '14:00')
  let resepsiTimezone = $state<'WIB' | 'WITA' | 'WIT'>(initialResepsiTimes.timezone)

  // Sync Akad to config
  function syncAkad() {
    if (akadIsoDate) {
      config.akad_date = formatIndonesianDate(akadIsoDate)
      config.wedding_date = combineToIsoDateTime(akadIsoDate, akadStartTime)
    } else {
      config.wedding_date = ''
      config.akad_date = 'Tanggal akad segera diumumkan'
    }
    config.akad_time = buildTimeString(akadStartTime, akadEndTime, akadTimezone)
  }

  // Sync Resepsi to config
  function syncResepsi() {
    if (resepsiIsoDate) {
      config.resepsi_date = formatIndonesianDate(resepsiIsoDate)
    } else {
      config.resepsi_date = 'Tanggal resepsi segera diumumkan'
    }
    config.resepsi_time = buildTimeString(resepsiStartTime, resepsiEndTime, resepsiTimezone)
  }

  function handleAkadDateInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    if (val && val < minSelectableDate) {
      akadIsoDate = minSelectableDate
    } else {
      akadIsoDate = val
    }
    // If resepsi date is not filled yet, auto-populate same date
    if (akadIsoDate && !resepsiIsoDate) {
      resepsiIsoDate = akadIsoDate
      syncResepsi()
    }
    syncAkad()
  }

  function handleResepsiDateInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    if (val && val < minSelectableDate) {
      resepsiIsoDate = minSelectableDate
    } else {
      resepsiIsoDate = val
    }
    syncResepsi()
  }

  function copyAkadDateToResepsi() {
    if (akadIsoDate) {
      resepsiIsoDate = akadIsoDate
      syncResepsi()
    }
  }
</script>

<div class="form-section">
  <h3>Jadwal Acara &amp; Lokasi Venue</h3>
  <p class="section-desc">
    Tentukan jadwal akad, resepsi, dan titik Google Maps. Tanggal akad otomatis menjadi acuan hitung mundur di undangan para tamu.
  </p>

  <!-- 1. AKAD NIKAH -->
  <div class="card-subGroup">
    <div class="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-stone-100">
      <div class="flex items-center gap-2">
        <span class="text-lg">💍</span>
        <h4 style="margin: 0; font-size: 1.1rem; color: #8f1d45;">1. Akad Nikah</h4>
      </div>
      {#if akadIsoDate}
        <span class="text-xs text-rose-800 font-semibold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
          📅 {formatIndonesianDate(akadIsoDate)}
        </span>
      {:else}
        <span class="text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
          Jadwal belum ditentukan
        </span>
      {/if}
    </div>

    <div class="grid-2">
      <!-- Tanggal Akad -->
      <label>
        Tanggal Akad (Klik Kalender)
        <input
          type="date"
          min={minSelectableDate}
          value={akadIsoDate}
          onchange={handleAkadDateInput}
          class="cursor-pointer font-medium"
          class:input-empty={!akadIsoDate}
          class:input-filled={Boolean(akadIsoDate)}
        />
      </label>

      <!-- Waktu Akad -->
      <label>
        Waktu / Jam Akad
        <div class="flex items-center gap-2">
          <input
            type="time"
            bind:value={akadStartTime}
            onchange={syncAkad}
            class="text-center font-medium flex-1 min-w-0"
            class:input-empty={!akadStartTime}
            class:input-filled={Boolean(akadStartTime)}
          />
          <span class="text-stone-400 font-bold text-xs shrink-0">s/d</span>
          <input
            type="time"
            bind:value={akadEndTime}
            onchange={syncAkad}
            class="text-center font-medium flex-1 min-w-0"
            class:input-empty={!akadEndTime}
            class:input-filled={Boolean(akadEndTime)}
          />
          <select
            bind:value={akadTimezone}
            onchange={syncAkad}
            class="shrink-0 font-bold bg-white text-center"
            style="width: 78px; padding: 12px 6px;"
          >
            <option value="WIB">WIB</option>
            <option value="WITA">WITA</option>
            <option value="WIT">WIT</option>
          </select>
        </div>
      </label>

      <!-- Tempat Akad -->
      <label class="col-span-2">
        Nama Tempat / Lokasi Akad
        <input
          bind:value={config.akad_location}
          placeholder="Masjid Agung / Kediaman Mempelai"
          class:input-empty={!config.akad_location}
          class:input-filled={Boolean(config.akad_location)}
        />
      </label>
    </div>
  </div>

  <!-- 2. RESEPSI PERNIKAHAN -->
  <div class="card-subGroup">
    <div class="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-stone-100">
      <div class="flex items-center gap-2">
        <span class="text-lg">🎉</span>
        <h4 style="margin: 0; font-size: 1.1rem; color: #8f1d45;">2. Resepsi Pernikahan</h4>
      </div>
      {#if akadIsoDate && resepsiIsoDate !== akadIsoDate}
        <button
          type="button"
          class="text-xs text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
          onclick={copyAkadDateToResepsi}
        >
          ⚡ Samakan Tanggal Akad
        </button>
      {/if}
    </div>

    <div class="grid-2">
      <!-- Tanggal Resepsi -->
      <label>
        Tanggal Resepsi (Klik Kalender)
        <input
          type="date"
          min={minSelectableDate}
          value={resepsiIsoDate}
          onchange={handleResepsiDateInput}
          class="cursor-pointer font-medium"
          class:input-empty={!resepsiIsoDate}
          class:input-filled={Boolean(resepsiIsoDate)}
        />
      </label>

      <!-- Waktu Resepsi -->
      <label>
        Waktu / Jam Resepsi
        <div class="flex items-center gap-2">
          <input
            type="time"
            bind:value={resepsiStartTime}
            onchange={syncResepsi}
            class="text-center font-medium flex-1 min-w-0"
            class:input-empty={!resepsiStartTime}
            class:input-filled={Boolean(resepsiStartTime)}
          />
          <span class="text-stone-400 font-bold text-xs shrink-0">s/d</span>
          <input
            type="time"
            bind:value={resepsiEndTime}
            onchange={syncResepsi}
            class="text-center font-medium flex-1 min-w-0"
            class:input-empty={!resepsiEndTime}
            class:input-filled={Boolean(resepsiEndTime)}
          />
          <select
            bind:value={resepsiTimezone}
            onchange={syncResepsi}
            class="shrink-0 font-bold bg-white text-center"
            style="width: 78px; padding: 12px 6px;"
          >
            <option value="WIB">WIB</option>
            <option value="WITA">WITA</option>
            <option value="WIT">WIT</option>
          </select>
        </div>
      </label>

      <!-- Tempat Resepsi -->
      <label class="col-span-2">
        Nama Tempat / Lokasi Resepsi
        <input
          bind:value={config.resepsi_location}
          placeholder="Gedung Serbaguna / Ballroom Hotel"
          class:input-empty={!config.resepsi_location}
          class:input-filled={Boolean(config.resepsi_location)}
        />
      </label>
    </div>
  </div>

  <!-- 3. LOKASI VENUE & GOOGLE MAPS -->
  <div class="card-subGroup" style="border: 1.5px solid #f59e0b;">
    <div class="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-amber-100">
      <div class="flex items-center gap-2">
        <span class="text-lg">📍</span>
        <h4 style="margin: 0; font-size: 1.1rem; color: #92400e;">3. Alamat Lengkap &amp; Google Maps</h4>
      </div>
      {#if config.maps_url}
        <span class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span>✓</span> Google Maps Terpasang
        </span>
      {:else}
        <span class="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
          ⚠️ Wajib Diisi untuk Tamu
        </span>
      {/if}
    </div>

    <div class="grid-2">
      <!-- Alamat Lengkap Venue -->
      <label class="col-span-2">
        Alamat Lengkap Gedung / Venue Acara
        <textarea
          bind:value={config.venue_address}
          rows="2"
          placeholder="Contoh: Gedung Pernikahan, Jl. Gatot Subroto No. 54, Kuningan Barat, Jakarta Selatan"
          class:input-empty={!config.venue_address}
          class:input-filled={Boolean(config.venue_address)}
        ></textarea>
      </label>

      <!-- Link Google Maps -->
      <label class="col-span-2">
        <div class="flex items-center justify-between">
          <span>Link Google Maps (Tautan Navigasi Tamu)</span>
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-rose-700 hover:text-rose-900 underline font-normal"
          >
            🗺️ Buka Google Maps
          </a>
        </div>
        <div class="flex items-center gap-2">
          <input
            bind:value={config.maps_url}
            placeholder="https://maps.app.goo.gl/... atau https://goo.gl/maps/..."
            class="font-mono text-sm"
            class:input-empty={!config.maps_url}
            class:input-filled={Boolean(config.maps_url)}
          />
          {#if config.maps_url}
            <a
              href={config.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              class="ghost-btn-sm shrink-0"
              style="padding: 10px 14px; text-decoration: none;"
            >
              🧭 Uji Link
            </a>
          {/if}
        </div>
      </label>
    </div>
  </div>
</div>
