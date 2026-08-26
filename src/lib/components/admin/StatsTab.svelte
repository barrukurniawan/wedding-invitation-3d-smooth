<script lang="ts">
  import type { GuestbookStats } from '$lib/api-client'
  import StatCard from './StatCard.svelte'

  let { stats }: { stats: GuestbookStats } = $props()
</script>

<h2 class="text-lg font-semibold text-rose-300">Statistik</h2>
<div class="mt-4 grid grid-cols-4 gap-4">
  <StatCard label="Total" value={stats.total} tone="blue" />
  <StatCard label="Hadir" value={stats.hadir} tone="green" />
  <StatCard label="Ragu-ragu" value={stats.ragu} tone="yellow" />
  <StatCard label="Tidak Hadir" value={stats.tidakHadir} tone="rose" />
</div>
