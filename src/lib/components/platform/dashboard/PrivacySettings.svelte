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
    <div class="privacy-box">
      <p class="privacy-legend">Yang dilihat pengunjung tanpa link khusus</p>
      <div class="privacy-options" role="radiogroup" aria-label="Yang dilihat pengunjung tanpa link khusus">
        <button type="button" role="radio" aria-checked={mode === 'private'} class="privacy-option" class:active={mode === 'private'} disabled={saving}
          onclick={() => mode !== 'private' && void save({ privacy_mode: 'private' }, 'Pengunjung tanpa link hanya melihat halaman "khusus tamu undangan".')}>
          <span class="privacy-preview privacy-preview--lock" aria-hidden="true">
            <span class="pv-lock">🔒</span>
            <span class="pv-line pv-line--title"></span>
            <span class="pv-line"></span>
            <span class="pv-line pv-line--short"></span>
          </span>
          <span class="privacy-option-text">
            <b>Halaman khusus tamu</b>
            <small>Hanya tampil "Maaf, undangan ini khusus untuk tamu undangan". Nama, foto, dan acara tidak terlihat.</small>
          </span>
          {#if mode === 'private'}<span class="privacy-check"><Icon name="check" size={16} /></span>{/if}
        </button>
        <button type="button" role="radio" aria-checked={mode === 'hide_details'} class="privacy-option" class:active={mode === 'hide_details'} disabled={saving}
          onclick={() => mode !== 'hide_details' && void save({ privacy_mode: 'hide_details' }, 'Pengunjung tanpa link melihat undangan tanpa alamat, rekening, dan buku tamu.')}>
          <span class="privacy-preview privacy-preview--partial" aria-hidden="true">
            <span class="pv-photo"></span>
            <span class="pv-line pv-line--title"></span>
            <span class="pv-blur"><span>🔒 Alamat</span><span>🔒 Rekening</span></span>
          </span>
          <span class="privacy-option-text">
            <b>Undangan tanpa detail</b>
            <small>Nama, foto, dan tanggal tetap tampil. Alamat, peta, rekening/QRIS, alamat kado, dan buku tamu disembunyikan.</small>
          </span>
          {#if mode === 'hide_details'}<span class="privacy-check"><Icon name="check" size={16} /></span>{/if}
        </button>
      </div>
    </div>

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
  .privacy-legend { margin: 0; font-size: .8rem; font-weight: 700; color: var(--ink, #2d2525); }
  .privacy-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  .privacy-option { position: relative; display: grid; gap: 10px; padding: 12px; border: 1.5px solid var(--line, #eadfe1); border-radius: 14px; background: #fff; text-align: left; cursor: pointer; font: inherit; color: inherit; text-transform: none; letter-spacing: normal; }
  .privacy-option:hover:not(:disabled) { border-color: #d9a9b6; }
  .privacy-option.active { border-color: #8f1d45; box-shadow: 0 0 0 3px rgba(143, 29, 69, .12); }
  .privacy-option:disabled { cursor: progress; opacity: .7; }
  .privacy-option-text { display: grid; gap: 3px; }
  .privacy-option-text b { font-size: .9rem; color: #2d2525; }
  .privacy-option-text small { color: var(--muted, #7a6a6d); font-size: .78rem; line-height: 1.5; text-transform: none; letter-spacing: normal; }
  .privacy-check { position: absolute; top: 8px; right: 8px; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: #8f1d45; --mm-ic: #fff; --mm-ic-soft: rgba(255,255,255,.3); }
  .privacy-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; height: 104px; border-radius: 10px; background: #f4f0e8; overflow: hidden; }
  .pv-lock { font-size: 22px; line-height: 1; }
  .pv-line { width: 60%; height: 6px; border-radius: 3px; background: #d8d0c4; }
  .pv-line--title { width: 70%; height: 9px; background: #bf3151; opacity: .55; }
  .pv-line--short { width: 38%; }
  .privacy-preview--partial { background: linear-gradient(#fbe9ee, #fff8ef); }
  .pv-photo { width: 64px; height: 36px; border-radius: 6px; background: linear-gradient(135deg, #e7b8c4, #c98a9b); }
  .pv-blur { display: flex; gap: 6px; }
  .pv-blur span { padding: 2px 6px; border-radius: 6px; background: rgba(255,255,255,.85); font-size: .62rem; font-weight: 700; color: #8f1d45; }
  .privacy-box label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
  .privacy-box small { color: var(--muted, #7a6a6d); font-size: .78rem; line-height: 1.5; }
  .privacy-inline select { padding: 8px 12px; border: 1px solid var(--line, #e6d6d9); border-radius: 10px; background: #fff; font-size: .88rem; }
  .privacy-link { display: block; overflow-wrap: anywhere; padding: 10px 12px; border-radius: 10px; background: var(--paper, #faf6f3); font-size: .8rem; }
  .privacy-actions { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
