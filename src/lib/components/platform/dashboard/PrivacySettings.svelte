<script lang="ts">
  // Undangan privat (PLAN_UNDANGAN_PRIVAT.md §3.1): Publik / Privat, default Publik.
  import Icon from '$lib/components/icons/Icon.svelte'
  import { ApiError, regenerateMyGeneralCode, updateMyPrivacy, type OwnerInvitation, type PrivacyMode, type WeddingConfig } from '$lib/api-client'

  type Props = {
    invitation: OwnerInvitation
    myConfig: WeddingConfig | null
    onSaved: (config: WeddingConfig) => void
  }
  let { invitation, myConfig, onSaved }: Props = $props()

  const mode = $derived<PrivacyMode>(myConfig?.privacy_mode ?? 'public')
  const isPrivate = $derived(mode !== 'public')
  const deviceLimit = $derived(myConfig?.privacy_device_limit ?? null)
  const generalLink = $derived.by(() => {
    const code = myConfig?.privacy_general_code
    if (!code) return ''
    const url = new URL(invitation.public_url.replace(/\/+$/, ''))
    url.searchParams.set('k', code)
    return url.toString().replace(/\/\?k=/, '?k=')
  })

  let saving = $state(false)
  let message = $state('')
  let copied = $state(false)

  async function save(settings: { privacy_mode?: PrivacyMode; privacy_device_limit?: number | null }, okText: string) {
    saving = true
    message = 'Menyimpan...'
    try {
      onSaved(await updateMyPrivacy(settings))
      message = `✓ ${okText}`
    } catch (err) {
      message = err instanceof ApiError ? `Gagal: ${err.message}` : 'Gagal menyimpan perubahan.'
    } finally {
      saving = false
    }
  }

  function setPrivate(next: boolean) {
    if (next === isPrivate) return
    if (next) void save({ privacy_mode: 'private' }, 'Undangan sekarang privat. Kirim link pribadi dari daftar tamu di bawah.')
    else void save({ privacy_mode: 'public' }, 'Undangan sekarang publik: siapa pun yang tahu alamatnya bisa membuka.')
  }

  async function newGeneralLink() {
    if (!confirm('Buat link umum baru? Link umum lama langsung tidak berlaku.')) return
    saving = true
    try {
      const result = await regenerateMyGeneralCode()
      if (myConfig) onSaved({ ...myConfig, privacy_general_code: result.privacy_general_code })
      message = '✓ Link umum baru dibuat. Link lama sudah tidak berlaku.'
    } catch (err) {
      message = err instanceof ApiError ? `Gagal: ${err.message}` : 'Link umum belum dapat dibuat.'
    } finally {
      saving = false
    }
  }

  async function copyGeneralLink() {
    try {
      await navigator.clipboard.writeText(generalLink)
      copied = true
      setTimeout(() => (copied = false), 2000)
    } catch {
      message = 'Link belum dapat disalin. Salin manual dari kotak di atas.'
    }
  }
</script>

<section class="tema-section privacy-settings">
  <h4 class="tema-label"><Icon name="lock" size={16} /> Privasi undangan</h4>
  <div class="tema-seg" role="radiogroup" aria-label="Privasi undangan">
    <button type="button" role="radio" aria-checked={!isPrivate} class:active={!isPrivate} disabled={saving} onclick={() => setPrivate(false)}>Publik</button>
    <button type="button" role="radio" aria-checked={isPrivate} class:active={isPrivate} disabled={saving} onclick={() => setPrivate(true)}>Privat</button>
  </div>
  <p class="tema-hint privacy-hint">
    {#if isPrivate}
      Hanya tamu yang membuka lewat link pribadi (daftar di bawah) atau link umum yang bisa melihat undangan lengkap.
    {:else}
      Siapa pun yang tahu alamat undangan bisa membukanya. Pilih Privat bila undangan hanya untuk tamu yang kamu kirimi link.
    {/if}
  </p>

  {#if isPrivate}
    <fieldset class="privacy-box" disabled={saving}>
      <legend>Pengunjung tanpa link khusus</legend>
      <label>
        <input type="radio" name="privacy-mode" checked={mode === 'private'} onchange={() => void save({ privacy_mode: 'private' }, 'Pengunjung tanpa link tidak bisa melihat apa pun.')} />
        <span><strong>Tidak bisa melihat apa pun</strong><small>Hanya muncul tulisan "Undangan ini privat".</small></span>
      </label>
      <label>
        <input type="radio" name="privacy-mode" checked={mode === 'hide_details'} onchange={() => void save({ privacy_mode: 'hide_details' }, 'Pengunjung tanpa link melihat undangan tanpa detail.')} />
        <span><strong>Bisa lihat undangan, tanpa detail</strong><small>Alamat, peta, rekening/QRIS, alamat kado, dan buku tamu disembunyikan.</small></span>
      </label>
    </fieldset>

    <fieldset class="privacy-box" disabled={saving}>
      <legend>Batas perangkat per link tamu</legend>
      <label class="privacy-inline">
        <select
          value={deviceLimit === null ? 'none' : String(deviceLimit)}
          onchange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value
            void save({ privacy_device_limit: v === 'none' ? null : Number(v) }, v === 'none' ? 'Batas perangkat dimatikan.' : `Satu link tamu maksimal ${v} perangkat.`)
          }}
        >
          {#each [1, 2, 3, 4, 5] as n (n)}<option value={String(n)}>{n} perangkat</option>{/each}
          <option value="none">Tanpa batas</option>
        </select>
      </label>
      <small class="privacy-note">Link yang diteruskan ke orang lain tidak bisa dibuka di perangkat berikutnya. Buka di HP lalu browser lain dari jaringan yang sama tetap dihitung satu. Reset perangkat tamu dari daftar tamu di bawah.</small>
    </fieldset>

    <fieldset class="privacy-box" disabled={saving}>
      <legend>Link umum</legend>
      <small class="privacy-note">Untuk tamu di luar daftar (misalnya grup keluarga). Undangan tertulis "Tamu Undangan" dan tidak dibatasi perangkat.</small>
      {#if generalLink}
        <code class="privacy-link">{generalLink}</code>
        <span class="privacy-actions">
          <button type="button" class="primary-btn-sm" onclick={() => void copyGeneralLink()}>{copied ? 'Tersalin ✓' : 'Salin link umum'}</button>
          <button type="button" class="ghost-btn-sm" onclick={() => void newGeneralLink()}>Buat link baru</button>
        </span>
      {:else}
        <button type="button" class="ghost-btn-sm" onclick={() => void newGeneralLink()}>Buat link umum</button>
      {/if}
    </fieldset>
  {/if}

  {#if message}<p class="venue-switch-msg">{message}</p>{/if}
</section>

<style>
  .privacy-hint { margin-top: 10px; }
  .privacy-box { display: grid; gap: 10px; margin: 14px 0 0; padding: 14px 16px; border: 1px solid var(--line, #eadfe1); border-radius: 14px; background: #fff; min-width: 0; }
  .privacy-box legend { padding: 0 6px; font-size: .8rem; font-weight: 700; color: var(--ink, #2d2525); }
  .privacy-box label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
  .privacy-box label input { margin-top: 3px; accent-color: #8f1d45; }
  .privacy-box label span { display: grid; gap: 2px; }
  .privacy-box label strong { font-size: .88rem; }
  .privacy-box small { color: var(--muted, #7a6a6d); font-size: .78rem; line-height: 1.5; }
  .privacy-inline select { padding: 8px 12px; border: 1px solid var(--line, #e6d6d9); border-radius: 10px; background: #fff; font-size: .88rem; }
  .privacy-link { display: block; overflow-wrap: anywhere; padding: 10px 12px; border-radius: 10px; background: var(--paper, #faf6f3); font-size: .8rem; }
  .privacy-actions { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
