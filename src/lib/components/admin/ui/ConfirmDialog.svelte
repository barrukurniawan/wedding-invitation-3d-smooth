<script lang="ts">
  // Dialog konfirmasi di halaman (pengganti confirm()/prompt()). Bila `inputLabel` diisi,
  // dialog meminta teks wajib (mis. alasan penolakan) yang diteruskan ke onConfirm.
  import { fade, scale } from 'svelte/transition'

  let {
    title,
    message,
    confirmLabel = 'Lanjutkan',
    tone = 'primary',
    inputLabel = '',
    inputPlaceholder = '',
    busy = false,
    error = '',
    onConfirm,
    onCancel,
  }: {
    title: string
    message: string
    confirmLabel?: string
    tone?: 'primary' | 'danger' | 'success'
    inputLabel?: string
    inputPlaceholder?: string
    busy?: boolean
    error?: string
    onConfirm: (value: string) => void
    onCancel: () => void
  } = $props()

  let value = $state('')
  const canConfirm = $derived(!busy && (!inputLabel || value.trim().length > 0))

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (canConfirm) onConfirm(value.trim())
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && !busy && onCancel()} />

<div class="adm-overlay" transition:fade={{ duration: 120 }}>
  <div class="adm-dialog" role="dialog" aria-modal="true" aria-labelledby="adm-dialog-title" transition:scale={{ duration: 150, start: 0.96 }}>
    <form onsubmit={submit}>
      <h3 id="adm-dialog-title">{title}</h3>
      <p>{message}</p>
      {#if inputLabel}
        <div class="adm-field" style="margin-top: 14px">
          <label class="adm-label" for="adm-dialog-input">{inputLabel}</label>
          <!-- svelte-ignore a11y_autofocus -->
          <textarea id="adm-dialog-input" class="adm-input" bind:value placeholder={inputPlaceholder} autofocus></textarea>
        </div>
      {/if}
      {#if error}<p class="adm-error" style="margin-top: 10px">{error}</p>{/if}
      <div class="adm-dialog-actions">
        <button type="button" class="adm-btn ghost" onclick={onCancel} disabled={busy}>Batal</button>
        <button type="submit" class="adm-btn {tone === 'primary' ? '' : tone}" disabled={!canConfirm}>
          {busy ? 'Memproses...' : confirmLabel}
        </button>
      </div>
    </form>
  </div>
</div>
