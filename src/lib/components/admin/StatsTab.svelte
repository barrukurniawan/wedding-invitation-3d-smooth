<script lang="ts">
  import type { GuestbookStats } from '$lib/api-client'
  import KpiCard from './ui/KpiCard.svelte'

  let { stats }: { stats: GuestbookStats } = $props()
</script>

<div class="adm-grid adm-grid-kpi">
  <KpiCard hero label="Total Ucapan" value={stats.total} icon="message" note="undangan demo" />
  <KpiCard label="Hadir" value={stats.hadir} icon="check" badge="{stats.total ? Math.round((stats.hadir / stats.total) * 100) : 0}%" badgeTone="green" />
  <KpiCard label="Ragu-ragu" value={stats.ragu} icon="clock" badge="{stats.total ? Math.round((stats.ragu / stats.total) * 100) : 0}%" badgeTone="amber" />
  <KpiCard label="Tidak Hadir" value={stats.tidakHadir} icon="x" badge="{stats.total ? Math.round((stats.tidakHadir / stats.total) * 100) : 0}%" badgeTone="red" />
</div>
