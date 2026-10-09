<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import FilePick from './ui/FilePick.svelte'
  import Icon from './ui/Icon.svelte'

  let { config, onUploadMusic }: { config: WeddingConfig; onUploadMusic: (e: Event) => void } = $props()
</script>

<h2 class="adm-card-title">Acara &amp; Musik</h2>
<p class="adm-card-sub">Tanggal untuk hitung mundur, detail akad dan resepsi, serta musik latar.</p>

<div class="adm-field" style="margin-top: 18px; max-width: 320px">
  <label class="adm-label" for="wedding-date">Tanggal pernikahan (hitung mundur)</label>
  <input id="wedding-date" type="datetime-local" bind:value={config.wedding_date} class="adm-input" />
</div>

<div class="groups">
  <section class="adm-card-soft">
    <h3><Icon name="calendar" size={16} /> Akad nikah</h3>
    <div class="row">
      <div class="adm-field"><label class="adm-label" for="akad-date">Tanggal</label><input id="akad-date" bind:value={config.akad_date} class="adm-input" /></div>
      <div class="adm-field"><label class="adm-label" for="akad-time">Waktu</label><input id="akad-time" bind:value={config.akad_time} class="adm-input" /></div>
      <div class="adm-field"><label class="adm-label" for="akad-location">Lokasi</label><input id="akad-location" bind:value={config.akad_location} class="adm-input" /></div>
    </div>
  </section>

  <section class="adm-card-soft">
    <h3><Icon name="heart" size={16} /> Resepsi</h3>
    <div class="row">
      <div class="adm-field"><label class="adm-label" for="resepsi-date">Tanggal</label><input id="resepsi-date" bind:value={config.resepsi_date} class="adm-input" /></div>
      <div class="adm-field"><label class="adm-label" for="resepsi-time">Waktu</label><input id="resepsi-time" bind:value={config.resepsi_time} class="adm-input" /></div>
      <div class="adm-field"><label class="adm-label" for="resepsi-location">Lokasi</label><input id="resepsi-location" bind:value={config.resepsi_location} class="adm-input" /></div>
    </div>
  </section>

  <section class="adm-card-soft">
    <h3><Icon name="music" size={16} /> Musik latar (putar otomatis)</h3>
    <div class="row two">
      <div class="adm-field"><label class="adm-label" for="bgm-title">Judul lagu</label><input id="bgm-title" bind:value={config.bgm_title} class="adm-input" placeholder="Mis. Marry You" /></div>
      <div class="adm-field">
        <span class="adm-label">File MP3</span>
        <FilePick label="Unggah MP3" accept="audio/mp3,audio/mpeg" onChange={onUploadMusic} />
      </div>
    </div>
    {#if config.bgm_url}
      <p class="active-file"><span class="adm-pill green">Aktif</span> <span>{config.bgm_url}</span></p>
    {/if}
  </section>
</div>

<style>
  .groups {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 18px;
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .row.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
  }
  .active-file {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 0;
    font-size: 12.5px;
    color: var(--adm-muted);
    word-break: break-all;
  }
  @media (max-width: 760px) {
    .row,
    .row.two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
