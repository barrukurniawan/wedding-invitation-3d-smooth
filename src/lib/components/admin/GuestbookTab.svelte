<script lang="ts">
  import type { GuestbookEntry } from '$lib/api-client'
  import { fmtDate } from './format'

  let { entries, onRefresh, onDelete }: { entries: GuestbookEntry[]; onRefresh: () => void; onDelete: (id: string) => void } = $props()
</script>

<div class="flex items-center justify-between">
  <h2 class="text-lg font-semibold text-rose-300">Ucapan Tamu</h2>
  <button class="mt-2 text-xs text-rose-400 hover:text-rose-300" onclick={onRefresh}>Refresh</button>
</div>
<div class="mt-4 max-h-[500px] space-y-3 overflow-y-auto">
  {#each entries as entry (entry.id)}
    <div class="rounded-xl border border-stone-800 bg-stone-950 p-3">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-sm font-semibold text-white">{entry.name}</span>
          <span class="ml-2 rounded-full px-2 py-0.5 text-xs {entry.attendance === 'Hadir' ? 'bg-green-800/50 text-green-300' : entry.attendance === 'Ragu-ragu' ? 'bg-yellow-800/50 text-yellow-300' : 'bg-red-800/50 text-red-300'}">{entry.attendance}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-stone-600">{fmtDate(entry.created_at || '')}</span>
          <button class="rounded-lg bg-red-800/50 px-2 py-1 text-xs text-red-300 hover:bg-red-700" onclick={() => onDelete(entry.id!)}>Hapus</button>
        </div>
      </div>
      <p class="mt-2 text-sm text-stone-300">{entry.message}</p>
    </div>
  {:else}
    <p class="py-8 text-center text-sm text-stone-500">Belum ada ucapan.</p>
  {/each}
</div>
