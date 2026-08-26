<script lang="ts">
  import type { AdminInvitation } from '$lib/api-client'
  import { fmtDate } from './format'

  let {
    invitations,
    loading,
    verifyingId,
    onActivate,
    onReject,
    onRefresh,
  }: {
    invitations: AdminInvitation[]
    loading: boolean
    verifyingId: number | null
    onActivate: (id: number) => void
    onReject: (id: number) => void
    onRefresh: () => void
  } = $props()
</script>

<div class="flex items-center justify-between">
  <h2 class="text-lg font-semibold text-rose-300">Verifikasi Undangan Pasangan</h2>
  <button class="text-xs text-rose-400 hover:text-rose-300" onclick={onRefresh}>Refresh</button>
</div>
{#if loading}
  <p class="mt-4 text-center text-sm text-stone-500">Memuat daftar undangan...</p>
{:else}
  <div class="mt-4 space-y-4">
    {#each invitations as inv (inv.id)}
      <div class="rounded-xl border {inv.status === 'pending_verification' ? 'border-yellow-600/60 bg-yellow-950/20' : 'border-stone-800 bg-stone-950'} p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-base font-bold text-white">{inv.slug}.marryme.web.id</span>
              <span class="rounded-full px-2 py-0.5 text-xs font-semibold {inv.status === 'active' ? 'bg-green-800/60 text-green-300' : inv.status === 'pending_verification' ? 'bg-yellow-800/60 text-yellow-300' : 'bg-stone-800 text-stone-400'}">
                {inv.status}
              </span>
            </div>
            <p class="mt-1 text-xs text-stone-400">
              Pemilik: <strong class="text-stone-200">{inv.user_display_name || inv.user_email || 'User'}</strong> ({inv.user_email})
            </p>
            {#if inv.bride_name || inv.groom_name}
              <p class="text-xs font-medium text-rose-400">Pasangan: {inv.bride_name || '—'} &amp; {inv.groom_name || '—'}</p>
            {/if}
          </div>

          <div class="flex items-center gap-2">
            {#if inv.status !== 'active'}
              <button
                class="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                disabled={verifyingId === inv.id}
                onclick={() => onActivate(inv.id)}
              >
                Aktifkan
              </button>
            {/if}
            {#if inv.status === 'pending_verification'}
              <button
                class="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                disabled={verifyingId === inv.id}
                onclick={() => onReject(inv.id)}
              >
                Tolak
              </button>
            {/if}
          </div>
        </div>

        {#if inv.payment_proof_url}
          <div class="mt-3 rounded-lg border border-stone-800 bg-stone-900 p-3">
            <p class="text-xs text-stone-400">Bukti Transfer (dikirim {fmtDate(inv.payment_submitted_at || '')}):</p>
            <a href={inv.payment_proof_url} target="_blank" rel="noreferrer" class="mt-2 inline-block">
              <img src={inv.payment_proof_url} alt="Bukti Transfer {inv.slug}" class="max-h-48 max-w-full rounded-lg border border-stone-700 object-contain" />
            </a>
          </div>
        {:else}
          <p class="mt-2 text-xs italic text-stone-500">Belum ada bukti transfer diunggah.</p>
        {/if}
      </div>
    {:else}
      <p class="py-8 text-center text-sm text-stone-500">Belum ada pendaftaran undangan.</p>
    {/each}
  </div>
{/if}
