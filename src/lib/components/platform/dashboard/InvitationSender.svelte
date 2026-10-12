<script lang="ts">
  import Icon from '$lib/components/icons/Icon.svelte'
  import { ApiError, createMyContact, deleteMyContact, getMyContacts, type InvitationContact, type OwnerInvitation, type WeddingConfig } from '$lib/api-client'

  type Props = { invitation: OwnerInvitation; myConfig: WeddingConfig | null }
  let { invitation, myConfig }: Props = $props()

  let contacts = $state<InvitationContact[]>([])
  let limit = $state(100)
  let loading = $state(true)
  let saving = $state(false)
  let error = $state('')
  let nameInput = $state('')
  let phoneInput = $state('')
  let genderInput = $state<'m'|'f'>('m')
  let showCharInfo = $state(true)
  let template = $state('Assalamualaikum Warahmatullahi Wabarakatuh. Hai {nama}! Kami mengundang kamu ke pernikahan {mempelai}.\n\nBuka undangan dunia 3D kami di sini:\n{link}\n\nKami tunggu kehadiranmu!')
  let selected = $state<string[]>([])
  let opened = $state<string[]>([])
  let bulkIndex = $state<number | null>(null)
  let bulkCancelled = $state(false)

  $effect(() => { void loadContacts() })

  async function loadContacts() {
    loading = true
    try {
      const result = await getMyContacts()
      contacts = result.contacts
      limit = result.limit
      error = ''
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Daftar kontak belum dapat dimuat.'
    } finally { loading = false }
  }

  async function addContact(event: SubmitEvent) {
    event.preventDefault()
    if (!nameInput.trim() || !phoneInput.trim()) return
    saving = true
    error = ''
    try {
      const result = await createMyContact(nameInput, phoneInput, genderInput)
      contacts = [...contacts, result.contact]
      nameInput = ''
      phoneInput = ''
      genderInput = 'm'
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Kontak belum dapat ditambahkan.'
    } finally { saving = false }
  }

  async function removeContact(id: string) {
    try {
      await deleteMyContact(id)
      contacts = contacts.filter((contact) => contact.id !== id)
      selected = selected.filter((contactId) => contactId !== id)
    } catch (err) { error = err instanceof ApiError ? err.message : 'Kontak belum dapat dihapus.' }
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

  function openChat(contact: InvitationContact) {
    if (invitation.status !== 'active') return false
    const url = `https://wa.me/${contact.phone}?text=${encodeURIComponent(messageFor(contact))}`
    const popup = window.open(url, '_blank', 'noopener,noreferrer')
    if (!popup) return false
    if (!opened.includes(contact.id)) opened = [...opened, contact.id]
    return true
  }

  // Anti-banned WhatsApp: maksimal 3 kontak per sesi kirim, lalu jeda sebelum sesi berikutnya.
  const MAX_PER_BATCH = 3
  const COOLDOWN_MS = 60_000
  const COOLDOWN_KEY = 'marryme_wa_cooldown_until'
  let now = $state(Date.now())
  let cooldownUntil = $state(readCooldown())
  function readCooldown() {
    try { return Number(localStorage.getItem(COOLDOWN_KEY)) || 0 } catch { return 0 }
  }
  function startCooldown() {
    cooldownUntil = Date.now() + COOLDOWN_MS
    try { localStorage.setItem(COOLDOWN_KEY, String(cooldownUntil)) } catch { /* mode privat */ }
  }
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(timer)
  })
  const cooldownLeft = $derived(Math.max(0, Math.ceil((cooldownUntil - now) / 1000)))

  function toggleSelected(id: string) {
    if (selected.includes(id)) { selected = selected.filter((item) => item !== id); error = ''; return }
    if (selected.length >= MAX_PER_BATCH) { error = `Maksimal ${MAX_PER_BATCH} kontak sekali kirim, supaya nomor WhatsApp kamu aman dari pemblokiran.`; return }
    selected = [...selected, id]
    error = ''
  }

  function startBulk() {
    if (!selected.length) { error = 'Pilih minimal satu kontak terlebih dahulu.'; return }
    if (cooldownLeft > 0) { error = `Tunggu ${cooldownLeft} detik sebelum mengirim lagi.`; return }
    bulkCancelled = false
    bulkIndex = 0
    error = ''
  }

  function continueBulk() {
    if (bulkIndex === null) return
    if (bulkCancelled || bulkIndex >= selected.length - 1) {
      // Sesi selesai: kosongkan pilihan dan mulai jeda sebelum sesi berikutnya.
      if (!bulkCancelled) { selected = []; startCooldown() }
      bulkIndex = null
      return
    }
    bulkIndex += 1
  }

  const activeBulkContact = $derived(bulkIndex === null ? null : contacts.find((contact) => contact.id === selected[bulkIndex ?? 0]))
</script>

<div class="workspace-panel invitation-sender">
  <div class="sender-header">
    <div>
      <h3>Kirim Undangan</h3>
      <p class="section-desc">Simpan penerima dan buka chat WhatsApp dengan pesan yang sudah dipersonalisasi.</p>
    </div>
    <span class="contact-count">{contacts.length} / {limit} kontak</span>
  </div>

  {#if invitation.status !== 'active'}
    <div class="sender-notice">Link publik baru dapat dibagikan setelah undangan aktif.</div>
  {:else}
    <div class="sender-notice">WhatsApp akan membuka chat dengan pesan terisi; kamu tetap menekan <strong>Kirim</strong> di WhatsApp. Demi keamanan nomormu, pengiriman dibatasi <strong>maks. {MAX_PER_BATCH} kontak sekali kirim</strong> dengan jeda 1 menit antar sesi.</div>

    <section class="sender-section contact-section" aria-labelledby="contact-form-title">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Daftar penerima</p>
          <h4 id="contact-form-title">Tambah nomor baru</h4>
        </div>
        <span class="section-count">{contacts.length} tersimpan</span>
      </div>
      <form class="contact-form" onsubmit={addContact}>
        <label><span>Nama penerima</span><input bind:value={nameInput} placeholder="Contoh: Kurniawan Uwo" maxlength="255" aria-label="Nama penerima" /></label>
        <label><span>Nomor WhatsApp</span><input bind:value={phoneInput} placeholder="Contoh: 0812 3456 7890" maxlength="32" inputmode="tel" aria-label="Nomor WhatsApp" /></label>
        <label class="gender-group">
          <span>Karakter tamu <button type="button" class="char-info" aria-label="Apa itu karakter tamu?" onclick={() => (showCharInfo = !showCharInfo)}>?</button></span>
          <div class="gender-toggle">
            <button type="button" class:active={genderInput === 'm'} onclick={() => genderInput = 'm'}>Pria</button>
            <button type="button" class:active={genderInput === 'f'} onclick={() => genderInput = 'f'}>Wanita</button>
          </div>
        </label>
        <button type="submit" disabled={saving || contacts.length >= limit}>{saving ? 'Menambahkan...' : '+ Tambah Nomor'}</button>
      </form>
      <div class="char-hint" class:open={showCharInfo}>
        <div class="char-pics">
          <figure class:active={genderInput === 'm'}><img src="/media/guests/guest-m.webp" alt="Avatar tamu pria" loading="lazy" /><figcaption>Pria</figcaption></figure>
          <figure class:active={genderInput === 'f'}><img src="/media/guests/guest-f.webp" alt="Avatar tamu wanita" loading="lazy" /><figcaption>Wanita</figcaption></figure>
        </div>
        <p><strong>Karakter menentukan avatar tamu</strong> saat ia membuka undangan dari link yang kamu kirim. Pilih <em>Pria</em> untuk tamu laki-laki atau <em>Wanita</em> untuk tamu perempuan, supaya tamu tampil sesuai dirinya di dunia undangan.</p>
      </div>
    </section>

    <section class="sender-section template-box">
      <div class="section-heading">
        <div><p class="section-kicker">Pesan undangan</p><h4>Template pesan</h4></div>
        <span class="section-count">Personalized</span>
      </div>
      <textarea id="whatsapp-template" bind:value={template} rows="5" aria-label="Template pesan WhatsApp"></textarea>
      <small>Variabel: <code>{'{nama}'}</code>, <code>{'{mempelai}'}</code>, <code>{'{link}'}</code></small>
    </section>

    <section class="sender-section recipients-section">
      <div class="bulk-toolbar">
        <div><p class="section-kicker">Penerima</p><h4>Pilih kontak untuk dikirim</h4></div>
        <div class="bulk-actions-top"><span class="batch-limit">Pilih maks. {MAX_PER_BATCH} kontak</span><button type="button" class="bulk-button" disabled={!selected.length || cooldownLeft > 0} onclick={startBulk}>{cooldownLeft > 0 ? `Jeda ${cooldownLeft} dtk` : `Kirim (${selected.length}/${MAX_PER_BATCH})`}</button></div>
      </div>

    {#if loading}
      <p class="sender-muted">Memuat daftar kontak...</p>
    {:else if !contacts.length}
      <p class="sender-muted">Belum ada penerima. Tambahkan nomor WhatsApp pertama.</p>
    {:else}
      <div class="contact-list">
        {#each contacts as contact}
          <div class="contact-row">
            <input class="contact-checkbox" type="checkbox" checked={selected.includes(contact.id)} disabled={!selected.includes(contact.id) && selected.length >= MAX_PER_BATCH} onchange={(e) => { toggleSelected(contact.id); (e.currentTarget as HTMLInputElement).checked = selected.includes(contact.id) }} aria-label={`Pilih ${contact.name}`} />
            <span class="contact-avatar" aria-hidden="true">{contact.name.trim().charAt(0).toUpperCase()}</span>
            <div class="contact-detail">
              <strong>{contact.name} <span class="gender-icon" title={contact.gender === 'f' ? 'Wanita' : 'Pria'}><Icon name={contact.gender === 'f' ? 'bride' : 'groom'} size={15} /></span></strong>
              <span>+{contact.phone}</span>
              {#if opened.includes(contact.id)}<em>Chat dibuka</em>{/if}
            </div>
            <div class="contact-actions"><button type="button" class="delete-contact" aria-label={`Hapus penerima ${contact.name}`} title="Hapus penerima" onclick={() => void removeContact(contact.id)}>×</button></div>
          </div>
        {/each}
      </div>
    {/if}
    </section>
  {/if}

  {#if error}<p class="sender-error" role="alert">{error}</p>{/if}

  {#if activeBulkContact}
    <div class="bulk-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-title">
      <div class="bulk-card">
        <p class="bulk-progress">Kontak {(bulkIndex || 0) + 1} dari {selected.length}</p>
        <h4 id="bulk-title">Siap membuka chat {activeBulkContact.name}?</h4>
        <p>Tekan tombol di bawah, kirim pesan di WhatsApp, lalu kembali ke sini untuk melanjutkan.</p>
        <div class="bulk-actions">
          <button type="button" class="bulk-button" onclick={() => openChat(activeBulkContact)}>Buka Chat WhatsApp</button>
          <button type="button" onclick={continueBulk}>Sudah / Lanjut</button>
          <button type="button" onclick={() => { bulkCancelled = true; bulkIndex = null }}>Batal</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .invitation-sender { position: relative; width: 100%; max-width: none; min-width: 0; box-sizing: border-box; }
  .sender-header, .bulk-toolbar { display: flex; align-items: center; gap: 12px; }
  .sender-header { justify-content: space-between; margin-bottom: 22px; }
  .sender-header h3 { margin-bottom: 6px; }
  .sender-section { width: 100%; min-width: 0; box-sizing: border-box; padding: 24px; border: 1px solid rgba(100, 76, 79, .12); border-radius: 16px; background: #ffffff; box-shadow: 0 2px 14px rgba(0,0,0,0.02); }
  .sender-section + .sender-section { margin-top: 20px; }
  .section-heading, .bulk-toolbar { justify-content: space-between; }
  .section-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
  .section-heading h4, .bulk-toolbar h4 { margin: 2px 0 0; color: var(--ink, #2d2525); font-size: 1rem; }
  .section-kicker { margin: 0; color: #9a6d73; font-size: .68rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .section-count { color: var(--muted, #777); font-size: .75rem; white-space: nowrap; }
  .contact-count, .sender-muted { color: var(--muted, #777); font-size: .82rem; }
  .sender-notice { margin-bottom: 20px; padding: 14px 18px; border-radius: 12px; background: #f5f1e9; color: #665b4c; font-size: .88rem; line-height: 1.5; border: 1px solid #eaddcf; }
  .contact-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto; align-items: end; gap: 14px; }
  .contact-form label { display: flex; flex-direction: column; gap: 8px; min-width: 0; color: #554f4f; font-size: .8rem; font-weight: 600; }
  .contact-form input, .template-box textarea { width: 100%; min-width: 0; box-sizing: border-box; border: 1px solid #ddd; border-radius: 10px; padding: 12px 14px; background: #faf9f8; color: inherit; font: inherit; transition: border-color 0.2s; }
  .contact-form input:focus, .template-box textarea:focus { outline: none; border-color: #a35c5c; background: #fff; }
  .contact-form button { border: 0; border-radius: 10px; padding: 12px 20px; background: #c44565; color: white; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .contact-form button:hover { background: #a33853; }
  .bulk-button { border: 0; border-radius: 10px; padding: 12px 20px; background: #2d2525; color: white; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .bulk-button:hover { background: #1a1515; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .gender-toggle { display: flex; background: #faf9f8; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; height: 42px; box-sizing: border-box; }
  .gender-toggle button { flex: 1; border: none; background: transparent; padding: 0 16px; font-weight: 600; font-size: .8rem; color: #777; cursor: pointer; transition: all 0.2s; border-radius: 0; white-space: nowrap; }
  .gender-toggle button:hover { background: #f0ebe8; }
  .gender-toggle button.active { background: #2d2525; color: white; }
  .template-box { display: grid; gap: 7px; }
  .template-box small { color: var(--muted, #777); }
  .bulk-toolbar { justify-content: space-between; }
  .bulk-actions-top { display: flex; align-items: center; justify-content: flex-end; gap: 18px; margin-left: auto; }
  .contact-checkbox { width: 16px; height: 16px; margin: 0; accent-color: #8f5e68; }
  .contact-list { display: grid; gap: 10px; margin-top: 20px; }
  .contact-row { display: grid; grid-template-columns: 18px 34px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-width: 0; padding: 12px 14px; border: 1px solid #e8e4e1; border-radius: 12px; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; }
  .contact-row:hover { border-color: #d8d4d1; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
  .contact-avatar { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #f4e6e8; color: #8f5e68; font-size: .78rem; font-weight: 800; }
  .contact-detail { min-width: 0; display: grid; gap: 3px; padding-left: 10px; }
  .contact-detail strong { min-width: 0; overflow: hidden; color: #2d2525; font-size: 0.95rem; font-weight: 700; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
  .gender-icon { margin-left: 4px; font-size: 0.9em; vertical-align: baseline; }
  .contact-detail span { color: #665b4c; font-size: .85rem; }
  .contact-detail em { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #e8f5ed; color: #168447; font-size: .7rem; font-style: normal; font-weight: 600; margin-top: 2px; }
  .contact-actions { display: flex; align-items: center; gap: 6px; margin-left: 14px; }
  .delete-contact { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #a34f58; font-size: 1.25rem; line-height: 1; cursor: pointer; transition: background 0.2s, color 0.2s; }
  .delete-contact:hover { background: #fdf5f5; }
  .sender-error { color: #a33d3d; font-size: .84rem; margin-top: 14px; }
  .bulk-modal { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; background: rgba(23, 20, 17, .48); padding: 18px; }
  .bulk-card { max-width: 430px; width: 100%; border-radius: 16px; padding: 24px; background: #fff; color: #292321; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
  .bulk-progress { color: #168447; font-size: .78rem; font-weight: 800; }
  .bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
  .bulk-actions button { border: 1px solid #ddd; border-radius: 8px; padding: 9px 11px; cursor: pointer; }
  .bulk-actions .bulk-button { border-color: #20b957; background: #20b957; }
  @media (max-width: 680px) { .contact-form { grid-template-columns: 1fr; } .sender-header, .section-heading, .bulk-toolbar { align-items: flex-start; flex-direction: column; } .bulk-actions-top { width: 100%; justify-content: space-between; margin-left: 0; } .contact-row { grid-template-columns: 18px 30px minmax(0, 1fr) auto; padding: 11px 10px; } .contact-detail { padding-left: 8px; } .contact-detail strong { font-size: .88rem; } .contact-actions { margin-left: 8px; } .delete-contact { width: 34px; height: 34px; } }
  .batch-limit { font-size: .8rem; color: #8a7a76; font-weight: 600; }
  .contact-form .char-info, .char-info { display: inline-grid; min-height: 0; box-shadow: none; padding: 0; line-height: 1; place-items: center; width: 18px; height: 18px; margin-left: 4px; border-radius: 50%; border: 1px solid #d9c4be; background: #fff; color: #8f1d45; font-size: 11px; font-weight: 800; cursor: pointer; vertical-align: 1px; }
  .char-hint { display: none; align-items: center; gap: 16px; margin-top: 14px; padding: 12px 14px; border-radius: 14px; background: #fdf6f0; border: 1px dashed #e8c9bf; }
  .char-hint.open { display: flex; }
  .char-pics { display: flex; gap: 8px; flex-shrink: 0; }
  .char-pics figure { margin: 0; text-align: center; opacity: .5; transition: opacity .2s, transform .2s; }
  .char-pics figure.active { opacity: 1; transform: translateY(-2px); }
  .char-pics img { display: block; width: 56px; height: 80px; object-fit: cover; border-radius: 10px; background: #c55e5e; }
  .char-pics figcaption { margin-top: 4px; font-size: .72rem; font-weight: 700; color: #6b5a56; }
  .char-hint p { margin: 0; font-size: .82rem; line-height: 1.55; color: #6b5a56; }
  @media (max-width: 560px) { .char-hint.open { flex-direction: column; align-items: flex-start; } }
</style>
