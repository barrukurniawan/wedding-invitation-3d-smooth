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

  // Nama acara bisa diubah (mis. "Pemberkatan"); acara kedua bisa dimatikan.
  // Reset memakai '' (bukan null) karena payload dashboard membuang nilai null; server mengubah '' → null.
  const firstTitle = $derived(config.akad_title?.trim() || 'Akad Nikah')
  const firstShort = $derived(config.akad_title?.trim() || 'Akad')
  const secondTitle = $derived(config.resepsi_title?.trim() || 'Resepsi')
  const secondEnabled = $derived(config.resepsi_enabled !== false)
  let editingFirst = $state(false)
  let editingSecond = $state(false)

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
      config.akad_date = `Tanggal ${firstShort.toLowerCase()} segera diumumkan`
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
    Tanggal acara pertama dipakai untuk hitung mundur di undangan. Nama acara bisa diubah, misalnya jadi <strong>Pemberkatan</strong>.
  </p>

  <!-- 1. AKAD NIKAH -->
  <div class="card-subGroup">
    <div class="event-head border-b border-stone-100">
      <div class="event-title">
        <span class="text-lg"><Icon name="rings" size={20} /></span>
        <h4 style="margin: 0; font-size: 1.1rem; color: #8f1d45;">1. {firstTitle}</h4>
        <button type="button" class="rename-btn" onclick={() => (editingFirst = !editingFirst)}><Icon name="edit" size={13} /> {editingFirst ? 'Selesai' : 'Ubah nama'}</button>
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

    {#if editingFirst}
      <div class="rename-row">
        <input bind:value={config.akad_title} maxlength="60" placeholder="Akad Nikah" aria-label="Nama acara pertama" />
        <span class="rename-chips">
          {#each ['Akad Nikah', 'Pemberkatan', 'Pemberkatan Nikah', 'Holy Matrimony', 'Tasyakuran'] as option (option)}
            <button type="button" onclick={() => (config.akad_title = option === 'Akad Nikah' ? '' : option)}>{option}</button>
          {/each}
        </span>
      </div>
    {/if}

    <div class="grid-2">
      <!-- Tanggal Akad -->
      <label>
        Tanggal {firstShort}
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
        Jam {firstShort}
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
        Tempat {firstShort}
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
        <h4 style="margin: 0; font-size: 1.1rem; color: #8f1d45;" class:muted-title={!secondEnabled}>2. {secondTitle}</h4>
        {#if secondEnabled}<button type="button" class="rename-btn" onclick={() => (editingSecond = !editingSecond)}><Icon name="edit" size={13} /> {editingSecond ? 'Selesai' : 'Ubah nama'}</button>{/if}
      </div>
      <!-- Sakelar (bukan checkbox+label): aturan global dashboard membuat label kapital & input lebar 100%. -->
      <button type="button" role="switch" aria-checked={secondEnabled} aria-label="Tampilkan acara kedua" class="second-switch" class:on={secondEnabled} onclick={() => (config.resepsi_enabled = !secondEnabled)}>
        <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>
        {secondEnabled ? 'Ditampilkan' : 'Disembunyikan'}
      </button>
      {#if secondEnabled && akadIsoDate && resepsiIsoDate !== akadIsoDate}
        <button
          type="button"
          class="text-xs text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
          onclick={copyAkadDateToResepsi}
        >
          <Icon name="zap" size={14} /> Samakan tanggal {firstShort.toLowerCase()}
        </button>
      {/if}
    </div>

    {#if !secondEnabled}
      <p class="second-off">Acara kedua disembunyikan. Undangan hanya menampilkan <strong>{firstTitle}</strong>.</p>
    {:else}
    {#if editingSecond}
      <div class="rename-row">
        <input bind:value={config.resepsi_title} maxlength="60" placeholder="Resepsi" aria-label="Nama acara kedua" />
        <span class="rename-chips">
          {#each ['Resepsi', 'Ramah Tamah', 'Syukuran', 'Ngunduh Mantu', 'Wedding Party'] as option (option)}
            <button type="button" onclick={() => (config.resepsi_title = option === 'Resepsi' ? '' : option)}>{option}</button>
          {/each}
        </span>
      </div>
    {/if}
    <div class="grid-2">
      <!-- Tanggal Resepsi -->
      <label>
        Tanggal {secondTitle}
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
        Jam {secondTitle}
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
        Tempat {secondTitle}
        <input
          bind:value={config.resepsi_location}
          placeholder="Gedung / Ballroom hotel"
          class:input-empty={!config.resepsi_location}
          class:input-filled={Boolean(config.resepsi_location)}
        />
      </label>
    </div>
    {/if}
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
  .rename-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid rgba(143, 29, 69, .25); border-radius: 999px; background: #fff; color: #8f1d45; font-size: .74rem; font-weight: 700; cursor: pointer; }
  .rename-btn:hover { background: #fdf2f5; }
  .rename-row { display: grid; gap: 8px; margin: 0 0 14px; padding: 12px; border-radius: 12px; background: #fdf6f8; }
  .rename-row input { padding: 9px 12px; border: 1.5px solid #e6c9d1; border-radius: 10px; font-size: .95rem; font-weight: 600; }
  .rename-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .rename-chips button { padding: 4px 10px; border: 1px solid #ead7dc; border-radius: 999px; background: #fff; color: #6d4a54; font-size: .74rem; cursor: pointer; }
  .rename-chips button:hover { border-color: #8f1d45; color: #8f1d45; }
  .second-switch { display: inline-flex; align-items: center; gap: 8px; padding: 0; border: 0; background: none; color: #6d4a54; font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .switch-track { position: relative; flex: none; width: 40px; height: 24px; border-radius: 999px; background: #d9cfd2; transition: background .15s ease; }
  .switch-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, .2); transition: transform .15s ease; }
  .second-switch.on .switch-track { background: #8f1d45; }
  .second-switch.on .switch-knob { transform: translateX(16px); }
  .second-switch:focus-visible .switch-track { outline: 2px solid #8f1d45; outline-offset: 2px; }
  /* Safari iOS: input tanggal/jam bawaan punya lebar minimum sendiri → keluar kotak & menimpa "s/d". */
  .grid-2 > label { min-width: 0; }
  .form-section input[type='date'],
  .form-section input[type='time'] { -webkit-appearance: none; appearance: none; display: block; min-width: 0; max-width: 100%; min-height: 46px; text-align: center; }
  .form-section input[type='date']::-webkit-date-and-time-value,
  .form-section input[type='time']::-webkit-date-and-time-value { text-align: center; }
  .second-off { margin: 0; padding: 12px 14px; border-radius: 12px; background: #faf6f3; color: #7a6a6d; font-size: .85rem; }
  .muted-title { opacity: .55; }
  .event-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; padding-bottom: 10px; margin-bottom: 14px; }
  .event-head > :last-child { white-space: nowrap; }
  .event-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .time-row { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 76px; align-items: center; gap: 8px; }
  .time-row input { min-width: 0; padding-left: 6px !important; padding-right: 6px !important; }
  .time-row .tz-select { width: 100%; padding: 12px 4px; }
  .time-sep { color: #a8a29e; font-size: .75rem; font-weight: 700; text-align: center; white-space: nowrap; }
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
