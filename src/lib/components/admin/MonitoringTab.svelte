<script lang="ts">
  import { onDestroy } from 'svelte'
  import { getAnalyticsSummary, getAnalyticsVisitors, type AnalyticsSummary, type AnalyticsVisitors } from '$lib/api-client'
  import StatCard from './StatCard.svelte'
  import { fmtIdr } from './format'

  const POLL_MS = 20000

  let summary = $state<AnalyticsSummary | null>(null)
  let visitors = $state<AnalyticsVisitors | null>(null)
  let range = $state<7 | 30>(7)
  let loading = $state(true)
  let errorMsg = $state('')
  let updatedAt = $state('')

  async function load() {
    if (typeof document !== 'undefined' && document.hidden) return
    try {
      const [s, v] = await Promise.all([getAnalyticsSummary(), getAnalyticsVisitors(range)])
      summary = s
      visitors = v
      errorMsg = ''
      updatedAt = new Date().toLocaleTimeString('id-ID')
    } catch {
      errorMsg = 'Gagal memuat data monitoring.'
    } finally {
      loading = false
    }
  }

  function switchRange(next: 7 | 30) {
    range = next
    void load()
  }

  const interval = setInterval(load, POLL_MS)
  void load()
  onDestroy(() => clearInterval(interval))

  const maxViews = $derived(Math.max(1, ...(visitors?.series.map((p) => p.views) ?? [1])))
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <h2 class="text-lg font-semibold text-rose-300">Monitoring Platform</h2>
  <span class="text-xs text-stone-500">
    {#if loading}Memuat...{:else}Diperbarui {updatedAt}{/if}
  </span>
</div>

{#if errorMsg}<p class="mt-2 text-xs text-red-400">{errorMsg}</p>{/if}

{#if summary}
  <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
    <StatCard label="Total User" value={summary.users.total} sub="+{summary.users.new30d} dalam 30 hari" tone="blue" />
    <StatCard label="Undangan Aktif" value={summary.tenants.active} sub="{summary.tenants.total} total subdomain" tone="green" />
    <StatCard label="Menunggu Verifikasi" value={summary.tenants.pending} sub="{summary.tenants.draft} draft" tone="yellow" />
    <StatCard
      label="Pembayaran Diterima"
      value={summary.payments.receivedCount}
      sub={fmtIdr(summary.payments.amountReceived)}
      tone="green"
    />
    <StatCard label="RSVP Hadir" value={summary.rsvps.hadir} sub="dari {summary.rsvps.total} ucapan" tone="green" />
    <StatCard label="RSVP Ragu-ragu" value={summary.rsvps.ragu} sub="belum pasti hadir" tone="yellow" />
    <StatCard label="RSVP Tidak Hadir" value={summary.rsvps.tidakHadir} sub="konfirmasi tidak hadir" tone="rose" />
    <StatCard label="Pembayaran Pending" value={summary.payments.pendingCount} sub="menunggu validasi" tone="blue" />
  </div>
{/if}

{#if visitors}
  <div class="mt-5 rounded-xl border border-stone-800 bg-stone-950 p-4">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold uppercase tracking-wider text-stone-400">Kunjungan {range} Hari Terakhir</p>
      <div class="flex gap-1">
        <button
          class="rounded-md px-2 py-0.5 text-xs font-medium {range === 7 ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}"
          onclick={() => switchRange(7)}>7H</button
        >
        <button
          class="rounded-md px-2 py-0.5 text-xs font-medium {range === 30 ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}"
          onclick={() => switchRange(30)}>30H</button
        >
      </div>
    </div>

    {#if visitors.series.length === 0}
      <p class="py-8 text-center text-sm text-stone-500">Belum ada data kunjungan.</p>
    {:else}
      <svg viewBox="0 0 {visitors.series.length * 24} 120" class="mt-3 h-32 w-full" preserveAspectRatio="none" role="img" aria-label="Grafik kunjungan harian">
        {#each visitors.series as point, i (point.date)}
          {@const barWidth = 9}
          {@const viewHeight = Math.max(2, Math.round((point.views / maxViews) * 100))}
          {@const uniqueHeight = Math.max(2, Math.round((point.uniques / maxViews) * 100))}
          <rect x={i * 24 + 1} y={110 - viewHeight} width={barWidth} height={viewHeight} rx="2" fill="#fb7185"></rect>
          <rect x={i * 24 + 12} y={110 - uniqueHeight} width={barWidth - 2} height={uniqueHeight} rx="2" fill="#78350f"></rect>
        {/each}
      </svg>
      <div class="mt-2 flex items-center gap-4 text-[11px] text-stone-500">
        <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-sm bg-rose-400"></span> Pageviews</span>
        <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-sm bg-yellow-900"></span> Visitor unik</span>
        <span class="ml-auto">{visitors.series[0].date} — {visitors.series[visitors.series.length - 1].date}</span>
      </div>
    {/if}
  </div>

  <div class="mt-5 grid gap-4 md:grid-cols-2">
    <div class="rounded-xl border border-stone-800 bg-stone-950 p-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-stone-400">Subdomain Terpopuler</p>
      {#if visitors.topSlugs.length === 0}
        <p class="py-6 text-center text-sm text-stone-500">Belum ada kunjungan undangan.</p>
      {:else}
        <table class="mt-3 w-full text-left text-sm">
          <thead>
            <tr class="text-xs uppercase tracking-wider text-stone-500">
              <th class="pb-2 font-semibold">Subdomain</th>
              <th class="pb-2 text-right font-semibold">Views</th>
              <th class="pb-2 text-right font-semibold">Unik</th>
            </tr>
          </thead>
          <tbody>
            {#each visitors.topSlugs as item (item.slug)}
              <tr class="border-t border-stone-800">
                <td class="py-1.5 font-medium text-stone-200">{item.slug}</td>
                <td class="py-1.5 text-right text-stone-300">{item.views}</td>
                <td class="py-1.5 text-right text-stone-400">{item.uniques}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

    <div class="rounded-xl border border-stone-800 bg-stone-950 p-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-stone-400">Registrasi Terbaru</p>
      {#if visitors.recentUsers.length === 0}
        <p class="py-6 text-center text-sm text-stone-500">Belum ada registrasi.</p>
      {:else}
        <ul class="mt-3 space-y-2.5">
          {#each visitors.recentUsers as user, i (user.email ?? i)}
            <li class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-stone-200">{user.displayName}</p>
                <p class="truncate text-xs text-stone-500">{user.email || '—'}</p>
              </div>
              <span class="shrink-0 text-[11px] text-stone-500">{new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  {#if visitors.topPaths.length > 0}
    <div class="mt-5 rounded-xl border border-stone-800 bg-stone-950 p-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-stone-400">Halaman Terkunjungi</p>
      <div class="mt-3 flex flex-wrap gap-2">
        {#each visitors.topPaths as p (p.path)}
          <span class="rounded-lg bg-stone-800 px-2.5 py-1 text-xs text-stone-300">{p.path} <span class="font-semibold text-rose-300">{p.views}</span></span>
        {/each}
      </div>
    </div>
  {/if}
{/if}
