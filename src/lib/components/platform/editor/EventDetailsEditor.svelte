<script lang="ts">
  import Icon from '$lib/components/icons/Icon.svelte'
  import type { WeddingConfig } from '$lib/api-client'
  import {
    extractIsoDate,
    extractTimes,
    formatIndonesianDate,
    buildTimeString,
    combineToIsoDateTime,
  } from '$lib/utils/dateFormatter'

  let { config = $bindable() }: { config: WeddingConfig } = $props()

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
    akadIsoDate = val
    // If resepsi date is not filled yet, auto-populate same date
    if (val && !resepsiIsoDate) {
      resepsiIsoDate = val
      syncResepsi()
    }
    syncAkad()
  }

  function handleResepsiDateInput(e: Event) {
    resepsiIsoDate = (e.target as HTMLInputElement).value
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
    Tanggal akad dipakai untuk hitung mundur di undangan.
  </p>

  <!-- 1. AKAD NIKAH -->
  <div class="card-subGroup">
    <div class="event-head border-b border-stone-100">
      <div class="event-title">
        <span class="text-lg"><Icon name="rings" size={20} /></span>
        <h4 style="margin: 0; font-size: 1.1rem; color: #8f1d45;">1. Akad Nikah</h4>
      </div>
      {#if akadIsoDate}
        <span class="text-xs text-rose-800 font-semibold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
          <Icon name="calendar" size={14} /> {formatIndonesianDate(akadIsoDate)}
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
        Tanggal Akad
        <input
          type="date"
          value={akadIsoDate}
          onchange={handleAkadDateInput}
          class="cursor-pointer font-medium"
          class:input-empty={!akadIsoDate}
          class:input-filled={Boolean(akadIsoDate)}
        />
      </label>

      <!-- Waktu Akad -->
      <label>
        Jam Akad
        <div class="time-row">
          <input
            type="time"
            bind:value={akadStartTime}
            onchange={syncAkad}
            class="text-center font-medium"
            class:input-empty={!akadStartTime}
            class:input-filled={Boolean(akadStartTime)}
          />
          <span class="time-sep">s/d</span>
          <input
            type="time"
            bind:value={akadEndTime}
            onchange={syncAkad}
            class="text-center font-medium"
            class:input-empty={!akadEndTime}
            class:input-filled={Boolean(akadEndTime)}
          />
          <select
            bind:value={akadTimezone}
            onchange={syncAkad}
            class="tz-select font-bold bg-white text-center"
            aria-label="Zona waktu"
          >
            <option value="WIB">WIB</option>
            <option value="WITA">WITA</option>
            <option value="WIT">WIT</option>
          </select>
        </div>
      </label>

      <!-- Tempat Akad -->
      <label class="col-span-2">
        Tempat Akad
        <input
          bind:value={config.akad_location}
          placeholder="Masjid / Kediaman mempelai"
          class:input-empty={!config.akad_location}
          class:input-filled={Boolean(config.akad_location)}
        />
      </label>
    </div>
  </div>

  <!-- 2. RESEPSI PERNIKAHAN -->
  <div class="card-subGroup">
    <div class="event-head border-b border-stone-100">
      <div class="event-title">
        <span class="text-lg"><Icon name="party" size={20} /></span>
        <h4 style="margin: 0; font-size: 1.1rem; color: #8f1d45;">2. Resepsi Pernikahan</h4>
      </div>
      {#if akadIsoDate && resepsiIsoDate !== akadIsoDate}
        <button
          type="button"
          class="text-xs text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
          onclick={copyAkadDateToResepsi}
        >
          <Icon name="zap" size={14} /> Samakan Tanggal Akad
        </button>
      {/if}
    </div>

    <div class="grid-2">
      <!-- Tanggal Resepsi -->
      <label>
        Tanggal Resepsi
        <input
          type="date"
          value={resepsiIsoDate}
          onchange={handleResepsiDateInput}
          class="cursor-pointer font-medium"
          class:input-empty={!resepsiIsoDate}
          class:input-filled={Boolean(resepsiIsoDate)}
        />
      </label>

      <!-- Waktu Resepsi -->
      <label>
        Jam Resepsi
        <div class="time-row">
          <input
            type="time"
            bind:value={resepsiStartTime}
            onchange={syncResepsi}
            class="text-center font-medium"
            class:input-empty={!resepsiStartTime}
            class:input-filled={Boolean(resepsiStartTime)}
          />
          <span class="time-sep">s/d</span>
          <input
            type="time"
            bind:value={resepsiEndTime}
            onchange={syncResepsi}
            class="text-center font-medium"
            class:input-empty={!resepsiEndTime}
            class:input-filled={Boolean(resepsiEndTime)}
          />
          <select
            bind:value={resepsiTimezone}
            onchange={syncResepsi}
            class="tz-select font-bold bg-white text-center"
            aria-label="Zona waktu"
          >
            <option value="WIB">WIB</option>
            <option value="WITA">WITA</option>
            <option value="WIT">WIT</option>
          </select>
        </div>
      </label>

      <!-- Tempat Resepsi -->
      <label class="col-span-2">
        Tempat Resepsi
        <input
          bind:value={config.resepsi_location}
          placeholder="Gedung / Ballroom hotel"
          class:input-empty={!config.resepsi_location}
          class:input-filled={Boolean(config.resepsi_location)}
        />
      </label>
    </div>
  </div>

  <!-- 3. LOKASI VENUE & GOOGLE MAPS -->
  <div class="card-subGroup" style="border: 1.5px solid #f59e0b;">
    <div class="event-head border-b border-amber-100">
      <div class="event-title">
        <span class="text-lg"><Icon name="pin" size={20} /></span>
        <h4 style="margin: 0; font-size: 1.1rem; color: #92400e;">3. Alamat &amp; Google Maps</h4>
      </div>
      {#if config.maps_url}
        <span class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Icon name="check" size={14} /> Maps terpasang
        </span>
      {:else}
        <span class="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
          <Icon name="alert" size={14} /> Wajib diisi
        </span>
      {/if}
    </div>

    <div class="grid-2">
      <!-- Alamat Lengkap Venue -->
      <label class="col-span-2">
        Alamat Lengkap Venue
        <textarea
          bind:value={config.venue_address}
          rows="3"
          placeholder="Contoh: Jl. Gatot Subroto No. 54, Jakarta Selatan"
          class:input-empty={!config.venue_address}
          class:input-filled={Boolean(config.venue_address)}
        ></textarea>
      </label>

      <!-- Link Google Maps -->
      <label class="col-span-2">
        <div class="maps-label">
          <span>Link Google Maps</span>
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            class="maps-open"
          >
            <Icon name="map" size={15} /> Buka Maps
          </a>
        </div>
        <div class="maps-row">
          <input
            bind:value={config.maps_url}
            placeholder="https://maps.app.goo.gl/..."
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
              <Icon name="compass" size={15} /> Uji Link
            </a>
          {/if}
        </div>
      </label>
    </div>
  </div>
</div>

<style>
  .event-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; padding-bottom: 10px; margin-bottom: 14px; }
  .event-head > :last-child { white-space: nowrap; }
  .event-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .time-row { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 76px; align-items: center; gap: 8px; }
  .time-row input { min-width: 0; padding-left: 6px !important; padding-right: 6px !important; }
  .time-row .tz-select { width: 100%; padding: 12px 4px; }
  .time-sep { color: #a8a29e; font-size: .75rem; font-weight: 700; }
  .maps-label { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 12px; }
  .maps-open { display: inline-flex; align-items: center; gap: 4px; color: #8f1d45; font-size: .78rem; font-weight: 700; text-decoration: none; text-transform: none; letter-spacing: 0; white-space: nowrap; }
  .maps-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .maps-row input { flex: 1; min-width: 0; }
  @media (max-width: 420px) {
    .time-row { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); }
    .time-row .tz-select { grid-column: 1 / -1; }
    .maps-row { flex-wrap: wrap; }
    .maps-row a { width: 100%; justify-content: center; }
  }
</style>
