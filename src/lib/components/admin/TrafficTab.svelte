<script lang="ts">
  // Trafik semua web: marryme.web.id (platform) vs subdomain undangan, sumber trafik,
  // halaman platform terpopuler, dan trafik tiap subdomain (termasuk yang belum dikunjungi).
  import { onMount } from 'svelte'
  import {
    getAdminSubdomains,
    getPlatformTraffic,
    type AdminSubdomain,
    type PlatformTraffic,
    type TrafficRange,
  } from '$lib/api-client'
  import BarChart from './ui/BarChart.svelte'
  import Icon from './ui/Icon.svelte'
  import KpiCard from './ui/KpiCard.svelte'
  import SourceBars from './ui/SourceBars.svelte'
  import { fmtDayLabel, fmtNumber, fmtRelative, statusMeta } from './format'

  let range = $state<TrafficRange>(30)
  let traffic = $state<PlatformTraffic | null>(null)
  let subdomains = $state<AdminSubdomain[]>([])
  let loading = $state(true)
  let errorMsg = $state('')
  let query = $state('')

  async function load() {
    loading = true
    try {
      const [t, s] = await Promise.all([getPlatformTraffic(range), getAdminSubdomains(range)])
      traffic = t
      subdomains = s.items
      errorMsg = ''
    } catch {
      errorMsg = 'Gagal memuat data trafik.'
    } finally {
      loading = false
    }
  }

  onMount(load)

  function setRange(next: TrafficRange) {
    range = next
    void load()
  }

  const totals = $derived(traffic?.totals)
  const points = $derived(
    (traffic?.series ?? []).map((p) => ({
      label: fmtDayLabel(p.date),
      title: fmtDayLabel(p.date, true),
      values: [p.invitationViews, p.platformViews],
    })),
  )
  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
  const ranked = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return subdomains
      .filter((s) => !q || [s.slug, s.owner_email, s.owner_name].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => b.views - a.views || b.total_views - a.total_views || a.slug.localeCompare(b.slug))
  })
  const maxViews = $derived(Math.max(1, ...subdomains.map((s) => s.views)))
  const maxPath = $derived(Math.max(1, ...(traffic?.platformPaths.map((p) => p.views) ?? [1])))
</script>

<div class="toolbar">
  <span class="adm-hint">{loading ? 'Memuat...' : `Data ${range} hari terakhir (WIB)`}</span>
  <div class="adm-seg" role="group" aria-label="Rentang waktu">
    {#each [7, 30, 90] as const as d (d)}
      <button type="button" class:active={range === d} onclick={() => setRange(d)}>{d}H</button>
    {/each}
  </div>
</div>

{#if errorMsg}<p class="adm-error" style="margin-bottom: 12px">{errorMsg}</p>{/if}

{#if totals}
  <div class="adm-grid adm-grid-kpi">
    <KpiCard hero label="Total Kunjungan" value={fmtNumber(totals.views)} icon="eye" badge="{fmtNumber(totals.uniques)} unik" note="semua web" />
    <KpiCard
      label="marryme.web.id"
      value={fmtNumber(totals.platformViews)}
      icon="sun"
      badge="{pct(totals.platformViews, totals.views)}%"
      badgeTone="rose"
      note="{fmtNumber(totals.platformUniques)} unik · landing & dashboard"
    />
    <KpiCard
      label="Subdomain Undangan"
      value={fmtNumber(totals.invitationViews)}
      icon="globe"
      badge="{pct(totals.invitationViews, totals.views)}%"
      badgeTone="rose"
      note="{fmtNumber(totals.invitationUniques)} unik"
    />
    <KpiCard
      label="Subdomain Dikunjungi"
      value="{totals.activeSlugs}/{subdomains.length}"
      icon="trend"
      badge="{totals.uniques > 0 ? (totals.views / totals.uniques).toFixed(1) : '0'} hal/kunjungan"
      note=""
    />
  </div>

  <div class="adm-card adm-section">
    <div class="adm-card-head">
      <div>
        <h2 class="adm-card-title">Pageviews per hari</h2>
        <p class="adm-card-sub">Bertumpuk: subdomain undangan + marryme.web.id</p>
      </div>
      <div class="legend">
        <span><i style="background: var(--adm-accent)"></i>Undangan</span>
        <span><i style="background: var(--adm-ink)"></i>marryme.web.id</span>
      </div>
    </div>
    {#if totals.views === 0}
      <p class="adm-empty">Belum ada kunjungan dalam {range} hari terakhir.</p>
    {:else}
      <BarChart
        {points}
        series={[
          { name: 'Undangan', color: 'var(--adm-accent)', striped: true },
          { name: 'marryme.web.id', color: 'var(--adm-ink)' },
        ]}
        stacked
        height={220}
      />
    {/if}
  </div>

  <div class="adm-grid adm-grid-2 adm-section">
    <div class="adm-card">
      <div class="adm-card-head">
        <div>
          <h2 class="adm-card-title">Sumber trafik</h2>
          <p class="adm-card-sub">Dari utm_source dan referrer, semua web</p>
        </div>
      </div>
      {#if traffic && traffic.sources.length > 0}
        <SourceBars sources={traffic.sources} />
      {:else}
        <p class="adm-empty">Belum ada data.</p>
      {/if}
    </div>

    <div class="adm-card">
      <div class="adm-card-head">
        <div>
          <h2 class="adm-card-title">Halaman marryme.web.id</h2>
          <p class="adm-card-sub">Parameter iklan (fbclid, utm) sudah digabung</p>
        </div>
      </div>
      {#if traffic && traffic.platformPaths.length > 0}
        <ul class="paths">
          {#each traffic.platformPaths as p (p.path)}
            <li>
              <span class="path" title={p.path}>{p.path}</span>
              <span class="adm-bar-track"><span class="adm-bar-fill" style="width: {(p.views / maxPath) * 100}%"></span></span>
              <b>{fmtNumber(p.views)}</b>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="adm-empty">Belum ada kunjungan ke marryme.web.id.</p>
      {/if}
    </div>
  </div>

  <div class="adm-card adm-section">
    <div class="adm-card-head">
      <div>
        <h2 class="adm-card-title">Trafik semua subdomain</h2>
        <p class="adm-card-sub">{subdomains.length} subdomain, termasuk yang belum pernah dikunjungi</p>
      </div>
      <label class="adm-search search">
        <Icon name="search" size={16} />
        <input class="adm-input" type="search" placeholder="Cari subdomain atau email" bind:value={query} aria-label="Cari subdomain" />
      </label>
    </div>
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Subdomain</th>
            <th>Pemilik (email pembuat)</th>
            <th>Status</th>
            <th class="num">Kunjungan {range}H</th>
            <th class="num">Unik</th>
            <th>Porsi</th>
            <th class="num">Total</th>
            <th>Terakhir dikunjungi</th>
          </tr>
        </thead>
        <tbody>
          {#each ranked as item, i (item.id)}
            {@const meta = statusMeta(item.status)}
            <tr>
              <td class="cell-muted">{i + 1}</td>
              <td><a class="slug-link" href={item.public_url} target="_blank" rel="noreferrer">{item.slug}</a></td>
              <td class="cell-muted">{item.owner_email || 'tanpa email'}</td>
              <td><span class="adm-status" style="--dot: {meta.color}">{meta.label}</span></td>
              <td class="num strong">{fmtNumber(item.views)}</td>
              <td class="num">{fmtNumber(item.uniques)}</td>
              <td><span class="adm-bar-track"><span class="adm-bar-fill" style="width: {(item.views / maxViews) * 100}%"></span></span></td>
              <td class="num">{fmtNumber(item.total_views)}</td>
              <td class="cell-muted">{fmtRelative(item.last_visit)}</td>
            </tr>
          {:else}
            <tr><td colspan="9" class="adm-empty">Tidak ada subdomain yang cocok.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{:else if loading}
  <div class="adm-card"><p class="adm-empty">Memuat trafik...</p></div>
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .legend {
    display: flex;
    gap: 14px;
    font-size: 12px;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .legend i {
    width: 9px;
    height: 9px;
    border-radius: 3px;
  }
  .paths {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .paths li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(60px, 0.8fr) auto;
    align-items: center;
    gap: 12px;
    font-size: 13px;
  }
  .path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 12.5px;
  }
  .search {
    width: min(280px, 100%);
  }
  .slug-link {
    font-weight: 600;
    color: var(--adm-ink);
  }
  .slug-link:hover {
    color: var(--adm-accent);
    text-decoration: underline;
  }
  .cell-muted {
    font-size: 12px;
    color: var(--adm-muted);
    white-space: nowrap;
  }
  td.strong {
    font-weight: 600;
  }
</style>
