<script lang="ts">
  import type { GuestbookEntry } from '$lib/api-client'
  import ConfirmDialog from './ui/ConfirmDialog.svelte'
  import Icon from './ui/Icon.svelte'
  import { fmtDate, initials } from './format'

  let { entries, onDelete }: { entries: GuestbookEntry[]; onDelete: (id: string) => Promise<void> } = $props()

  type Filter = 'all' | 'Hadir' | 'Ragu-ragu' | 'Tidak Hadir'
  let query = $state('')
  let filter = $state<Filter>('all')
  let pending = $state<GuestbookEntry | null>(null)
  let deleting = $state(false)

  const TONE: Record<string, string> = { Hadir: 'green', 'Ragu-ragu': 'amber', 'Tidak Hadir': 'red' }

  const visible = $derived(
    entries.filter((e) => {
      if (filter !== 'all' && e.attendance !== filter) return false
      const q = query.trim().toLowerCase()
      return !q || e.name.toLowerCase().includes(q) || e.message.toLowerCase().includes(q)
    }),
  )

  async function confirmDelete() {
    if (!pending?.id) return
    deleting = true
    try {
      await onDelete(pending.id)
      pending = null
    } finally {
      deleting = false
    }
  }
</script>

<div class="adm-card-head">
  <div>
    <h2 class="adm-card-title">Ucapan Tamu</h2>
    <p class="adm-card-sub">{entries.length} ucapan di undangan demo (#1)</p>
  </div>
  <label class="adm-search search">
    <Icon name="search" size={16} />
    <input class="adm-input" type="search" placeholder="Cari nama atau ucapan" bind:value={query} aria-label="Cari ucapan" />
  </label>
</div>

<div class="adm-chips" role="group" aria-label="Filter kehadiran">
  {#each [['all', 'Semua'], ['Hadir', 'Hadir'], ['Ragu-ragu', 'Ragu-ragu'], ['Tidak Hadir', 'Tidak hadir']] as const as [id, label] (id)}
    <button type="button" class="adm-chip" class:active={filter === id} onclick={() => (filter = id)}>
      {label} <span class="adm-chip-count">{id === 'all' ? entries.length : entries.filter((e) => e.attendance === id).length}</span>
    </button>
  {/each}
</div>

<ul class="list">
  {#each visible as entry (entry.id)}
    <li>
      <span class="adm-avatar">{initials(entry.name)}</span>
      <div class="body">
        <div class="top">
          <strong>{entry.name}</strong>
          <span class="adm-pill {TONE[entry.attendance] ?? ''}">{entry.attendance}</span>
          <span class="date">{fmtDate(entry.created_at || '')}</span>
        </div>
        <p>{entry.message}</p>
      </div>
      <button type="button" class="adm-iconbtn del" title="Hapus ucapan" aria-label="Hapus ucapan dari {entry.name}" onclick={() => (pending = entry)}>
        <Icon name="trash" size={16} />
      </button>
    </li>
  {:else}
    <li class="adm-empty">{entries.length ? 'Tidak ada ucapan yang cocok.' : 'Belum ada ucapan.'}</li>
  {/each}
</ul>

{#if pending}
  <ConfirmDialog
    title="Hapus ucapan dari {pending.name}?"
    message="Ucapan akan dihapus permanen dari undangan demo dan tidak bisa dikembalikan."
    confirmLabel="Hapus ucapan"
    tone="danger"
    busy={deleting}
    onConfirm={confirmDelete}
    onCancel={() => (pending = null)}
  />
{/if}

<style>
  .search {
    width: min(280px, 100%);
  }
  .list {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 0;
    border-top: 1px solid var(--adm-line);
  }
  li:first-child {
    border-top: 0;
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .top strong {
    font-weight: 600;
  }
  .date {
    font-size: 12px;
    color: var(--adm-muted);
  }
  p {
    margin: 6px 0 0;
    line-height: 1.5;
    color: var(--adm-ink-2);
    overflow-wrap: anywhere;
  }
  .del {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
  }
  .del:hover {
    color: var(--adm-red);
  }
</style>
