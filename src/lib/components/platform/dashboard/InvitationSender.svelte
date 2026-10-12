<script lang="ts">
  import Icon from '$lib/components/icons/Icon.svelte'
  import { ApiError, createMyContact, deleteMyContact, getMyContacts, type InvitationContact, type OwnerInvitation, type WeddingConfig } from '$lib/api-client'

  type Props = { invitation: OwnerInvitation; myConfig: WeddingConfig | null }
  let { invitation, myConfig }: Props = $props()

  const DEFAULT_TEMPLATE = 'Assalamualaikum Warahmatullahi Wabarakatuh. Hai {nama}! Kami mengundang kamu ke pernikahan {mempelai}.\n\nBuka undangan digital kami di sini:\n{link}\n\nKami tunggu kehadiranmu!'

  let contacts = $state<InvitationContact[]>([])
  let limit = $state(100)
  let loading = $state(true)
  let saving = $state(false)
  let error = $state('')
  let nameInput = $state('')
  let phoneInput = $state('')
  let genderInput = $state<'m' | 'f'>('m')
  let template = $state(DEFAULT_TEMPLATE)
  let editingTemplate = $state(false)

  const isActive = $derived(invitation.status === 'active')

  $effect(() => { void loadContacts() })

  async function loadContacts() {
    loading = true
    try {
      const result = await getMyContacts()
      contacts = result.contacts
      limit = result.limit
      error = ''
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Daftar tamu belum dapat dimuat.'
    } finally { loading = false }
  }

  async function addContact(event: SubmitEvent) {
    event.preventDefault()
    if (!nameInput.trim() || !phoneInput.trim()) { error = 'Isi nama dan nomor WhatsApp tamu.'; return }
    saving = true
    error = ''
    try {
      const result = await createMyContact(nameInput, phoneInput, genderInput)
      contacts = [...contacts, result.contact]
      nameInput = ''
      phoneInput = ''
      genderInput = 'm'
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Tamu belum dapat ditambahkan.'
    } finally { saving = false }
  }

  async function removeContact(contact: InvitationContact) {
    try {
      await deleteMyContact(contact.id)
      contacts = contacts.filter((item) => item.id !== contact.id)
    } catch (err) { error = err instanceof ApiError ? err.message : 'Tamu belum dapat dihapus.' }
  }

  function messageFor(contact: InvitationContact) {
    const couple = myConfig?.bride_name && myConfig?.groom_name
      ? `${myConfig.bride_name} & ${myConfig.groom_name}`
      : 'pernikahan kami'
    const personalizedUrl = new URL(invitation.public_url.replace(/\/+$/, ''))
    personalizedUrl.searchParams.set('send', contact.name.trim())
    if (contact.gender === 'f') {
      personalizedUrl.searchParams.set('g', 'f')
    } else {
      personalizedUrl.searchParams.set('g', 'm')
    }
    personalizedUrl.search = personalizedUrl.searchParams.toString().replace(/\+/g, '%20')
    const personalizedLink = personalizedUrl.toString().replace(/\/?\?send=/, '?send=')
    return template.replaceAll('{nama}', contact.name).replaceAll('{mempelai}', couple).replaceAll('{link}', personalizedLink)
  }

  const waUrl = (contact: InvitationContact) => `https://wa.me/${contact.phone}?text=${encodeURIComponent(messageFor(contact))}`

  // Anti-banned WhatsApp: maksimal 3 chat per menit (jendela geser), lalu jeda.
  // Kunci cooldown lama tetap dipakai supaya jeda yang sedang berjalan ikut dihormati.
  const MAX_PER_MINUTE = 10
  const WINDOW_MS = 60_000
  const COOLDOWN_KEY = 'marryme_wa_cooldown_until'
  const SENT_LOG_KEY = 'marryme_wa_sent_log'
  const openedKey = $derived(`marryme_wa_opened_${invitation.id}`)
  const readJson = <T,>(key: string, fallback: T): T => {
    try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback } catch { return fallback }
  }
  const writeJson = (key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* mode privat */ }
  }

  let now = $state(Date.now())
  let cooldownUntil = $state(readJson<number>(COOLDOWN_KEY, 0) || 0)
  let sentLog = $state<number[]>(readJson<number[]>(SENT_LOG_KEY, []))
  // Penanda "Terkirim" hanya di browser ini (tidak mengubah data server).
  let opened = $state<string[]>([])
  $effect(() => { opened = readJson<string[]>(openedKey, []) })

  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(timer)
  })
  const cooldownLeft = $derived(Math.max(0, Math.ceil((cooldownUntil - now) / 1000)))
  const fmtLeft = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  function onSend(event: MouseEvent, contact: InvitationContact) {
    if (!isActive || cooldownLeft > 0) { event.preventDefault(); return }
    const t = Date.now()
    sentLog = [...sentLog.filter((x) => t - x < WINDOW_MS), t]
    writeJson(SENT_LOG_KEY, sentLog)
    if (sentLog.length >= MAX_PER_MINUTE) {
      cooldownUntil = sentLog[0] + WINDOW_MS
      writeJson(COOLDOWN_KEY, cooldownUntil)
    }
    if (!opened.includes(contact.id)) {
      opened = [...opened, contact.id]
      writeJson(openedKey, opened)
    }
  }

  const previewText = $derived(
    template
      .replaceAll('{nama}', contacts[0]?.name || 'Budi')
      .replaceAll('{mempelai}', myConfig?.bride_name && myConfig?.groom_name ? `${myConfig.bride_name} & ${myConfig.groom_name}` : 'kami')
      .replaceAll('{link}', '🔗 link undangan')
  )
</script>

<div class="workspace-panel invitation-sender">
  <div class="sender-header">
    <div>
      <h3>Kirim Undangan</h3>
      <p class="section-desc">Tambah tamu, lalu klik <strong>Kirim</strong> untuk membuka WhatsApp.</p>
    </div>
    <span class="contact-count">{contacts.length}/{limit} tamu</span>
  </div>

  {#if !isActive}
    <p class="sender-notice"><Icon name="clock" size={16} /> Tombol Kirim aktif setelah undangan diaktifkan.</p>
  {/if}

  <form class="add-row" onsubmit={addContact}>
    <input bind:value={nameInput} placeholder="Nama tamu" maxlength="255" aria-label="Nama tamu" />
    <input bind:value={phoneInput} placeholder="No. WhatsApp" maxlength="32" inputmode="tel" aria-label="Nomor WhatsApp" />
    <div class="avatar-pick" role="radiogroup" aria-label="Avatar tamu di undangan" title="Avatar tamu di undangan">
      <button type="button" role="radio" aria-checked={genderInput === 'm'} class:active={genderInput === 'm'} onclick={() => (genderInput = 'm')}>
        <img src="/media/guests/guest-m.webp" alt="" /><span>Pria</span>
      </button>
      <button type="button" role="radio" aria-checked={genderInput === 'f'} class:active={genderInput === 'f'} onclick={() => (genderInput = 'f')}>
        <img src="/media/guests/guest-f.webp" alt="" /><span>Wanita</span>
      </button>
    </div>
    <button type="submit" class="add-btn" disabled={saving || contacts.length >= limit}>
      {#if saving}Menambah...{:else}+ Tambah{/if}
    </button>
  </form>

  {#if error}<p class="sender-error" role="alert"><Icon name="alert" size={15} /> {error}</p>{/if}

  <div class="guest-list">
    {#if loading}
      <p class="sender-muted">Memuat daftar tamu...</p>
    {:else if !contacts.length}
      <p class="sender-empty">Belum ada tamu. Tambahkan nama &amp; nomor WhatsApp di atas.</p>
    {:else}
      {#each contacts as contact (contact.id)}
        {@const sent = opened.includes(contact.id)}
        <div class="guest-row">
          <img class="guest-avatar" src={contact.gender === 'f' ? '/media/guests/guest-f.webp' : '/media/guests/guest-m.webp'} alt={contact.gender === 'f' ? 'Wanita' : 'Pria'} loading="lazy" />
          <div class="guest-info">
            <strong>{contact.name}</strong>
            <span>+{contact.phone}</span>
          </div>
          <div class="guest-actions">
            {#if sent}<span class="sent-tag"><Icon name="check" size={14} /> Terkirim</span>{/if}
            {#if isActive && cooldownLeft > 0}
              <span class="send-btn waiting">Tunggu {fmtLeft(cooldownLeft)}</span>
            {:else if isActive}
              <a class="send-btn" class:ghost={sent} href={waUrl(contact)} target="_blank" rel="noopener noreferrer" onclick={(e) => onSend(e, contact)}>
                <Icon name="send" size={15} /> {sent ? 'Kirim ulang' : 'Kirim via WA'}
              </a>
            {:else}
              <span class="send-btn waiting">Kirim via WA</span>
            {/if}
            <button type="button" class="delete-btn" aria-label={`Hapus ${contact.name}`} title="Hapus" onclick={() => void removeContact(contact)}>
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="message-box">
    {#if editingTemplate}
      <textarea bind:value={template} rows="6" aria-label="Template pesan WhatsApp"></textarea>
      <div class="message-foot">
        <small>Kode otomatis: <code>{'{nama}'}</code> <code>{'{mempelai}'}</code> <code>{'{link}'}</code></small>
        <span class="message-btns">
          <button type="button" class="link-btn" onclick={() => (template = DEFAULT_TEMPLATE)}>Reset</button>
          <button type="button" class="done-btn" onclick={() => (editingTemplate = false)}>Selesai</button>
        </span>
      </div>
    {:else}
      <p class="message-preview"><Icon name="chat" size={16} /> <span>{previewText}</span></p>
      <button type="button" class="link-btn" onclick={() => (editingTemplate = true)}><Icon name="edit" size={14} /> Ubah pesan</button>
    {/if}
  </div>

  <p class="sender-foot"><Icon name="tip" size={14} /> Maks. {MAX_PER_MINUTE} kiriman per menit agar nomormu aman. Pesan tetap kamu kirim sendiri di WhatsApp.</p>
</div>

<style>
  .invitation-sender { position: relative; width: 100%; min-width: 0; box-sizing: border-box; }
  .sender-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
  .sender-header h3 { margin-bottom: 6px; }
  .sender-header .section-desc { margin: 0; }
  .contact-count { flex: none; padding: 5px 11px; border-radius: 999px; background: #f7eaed; color: #8f1d45; font-size: .8rem; font-weight: 700; }
  .sender-notice { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; padding: 10px 14px; border-radius: 12px; background: #fdf6ec; color: #7a5a2e; font-size: .85rem; }

  .add-row { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto auto; align-items: center; gap: 10px; padding: 12px; border: 1px solid rgba(143, 29, 69, .14); border-radius: 16px; background: #fdf8f9; }
  .add-row input { width: 100%; min-width: 0; height: 46px; box-sizing: border-box; border: 1px solid #e6dcdc; border-radius: 12px; padding: 0 14px; background: #fff; color: inherit; font: inherit; font-size: .92rem; }
  .add-row input:focus { outline: none; border-color: #8f1d45; }
  .avatar-pick { display: flex; gap: 6px; }
  .avatar-pick button { display: flex; align-items: center; gap: 6px; height: 46px; padding: 0 12px 0 4px; border: 2px solid #eadfdf; border-radius: 12px; background: #fff; color: #7a6a6d; font: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; transition: border-color .15s, color .15s; }
  .avatar-pick button img { width: 34px; height: 34px; border-radius: 9px; object-fit: cover; object-position: top; background: #c55e5e; opacity: .55; transition: opacity .15s; }
  .avatar-pick button.active { border-color: #8f1d45; color: #8f1d45; }
  .avatar-pick button.active img { opacity: 1; }
  .add-btn { height: 46px; padding: 0 20px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #a52552, #8f1d45); color: #fff; font: inherit; font-weight: 700; white-space: nowrap; cursor: pointer; box-shadow: 0 4px 12px rgba(143, 29, 69, .22); }
  .add-btn:disabled, .delete-btn:disabled { opacity: .5; cursor: not-allowed; }

  .sender-error { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; color: #b42345; font-size: .85rem; font-weight: 600; }
  .sender-muted, .sender-empty { margin: 0; color: var(--muted, #777); font-size: .88rem; }
  .sender-empty { padding: 26px 16px; border: 1px dashed #e6d6d9; border-radius: 14px; text-align: center; }

  .guest-list { display: grid; gap: 8px; margin-top: 18px; }
  .guest-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #eee5e5; border-radius: 14px; background: #fff; }
  .guest-avatar { width: 40px; height: 40px; border-radius: 12px; object-fit: cover; object-position: top; background: #c55e5e; }
  .guest-info { display: grid; gap: 2px; min-width: 0; }
  .guest-info strong { overflow: hidden; color: #2d2525; font-size: .95rem; text-overflow: ellipsis; white-space: nowrap; }
  .guest-info span { color: #7a6a6d; font-size: .82rem; }
  .guest-actions { display: flex; align-items: center; gap: 8px; }
  .sent-tag { display: inline-flex; align-items: center; gap: 4px; color: #15803d; font-size: .78rem; font-weight: 700; white-space: nowrap; --mm-ic: #15803d; --mm-ic-soft: #dcfce7; }
  .send-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 999px; background: #8f1d45; color: #fff; font-size: .82rem; font-weight: 700; text-decoration: none; white-space: nowrap; --mm-ic: #fff; --mm-ic-soft: rgba(255, 255, 255, .28); }
  .send-btn:hover { background: #761639; }
  .send-btn.ghost { background: #fff; color: #8f1d45; border: 1px solid rgba(143, 29, 69, .3); --mm-ic: #8f1d45; --mm-ic-soft: #f6c5d2; }
  .send-btn.waiting { background: #f1ecec; color: #9a8a8d; cursor: not-allowed; }
  .delete-btn { display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; }
  .delete-btn:hover { background: #fdf0f3; }

  .message-box { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 18px; padding: 12px 14px; border-radius: 14px; background: #faf6f4; border: 1px solid #efe6e3; }
  .message-preview { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; margin: 0; color: #5f5255; font-size: .86rem; }
  .message-preview span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .message-box textarea { width: 100%; box-sizing: border-box; border: 1px solid #e6dcdc; border-radius: 12px; padding: 12px 14px; background: #fff; color: inherit; font: inherit; font-size: .9rem; line-height: 1.5; resize: vertical; }
  .message-box textarea:focus { outline: none; border-color: #8f1d45; }
  .message-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; width: 100%; }
  .message-foot small { color: #7a6a6d; }
  .message-foot code { padding: 1px 5px; border-radius: 5px; background: #fff; border: 1px solid #eadfdf; font-size: .78rem; }
  .message-btns { display: flex; gap: 8px; }
  .link-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border: 1px solid rgba(143, 29, 69, .25); border-radius: 999px; background: #fff; color: #8f1d45; font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .done-btn { padding: 7px 14px; border: 0; border-radius: 999px; background: #8f1d45; color: #fff; font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; }
  .sender-foot { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; color: #8a7a7d; font-size: .78rem; }

  @media (max-width: 720px) {
    .add-row { grid-template-columns: 1fr 1fr; }
    .add-row input { grid-column: 1 / -1; }
    .avatar-pick { grid-column: 1 / 2; }
    .avatar-pick button { flex: 1; justify-content: center; }
    .add-btn { grid-column: 2 / 3; }
  }
  @media (max-width: 480px) {
    .add-row input { grid-column: 1 / -1; }
    .avatar-pick { grid-column: 1 / -1; }
    .add-btn { grid-column: 1 / -1; }
    .guest-row { grid-template-columns: 36px minmax(0, 1fr); }
    .guest-avatar { width: 36px; height: 36px; }
    .guest-actions { grid-column: 1 / -1; justify-content: flex-end; }
  }
</style>
