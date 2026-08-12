<script lang="ts">
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

  function toggleSelected(id: string) {
    selected = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]
  }

  function toggleAll() {
    selected = selected.length === contacts.length ? [] : contacts.map((contact) => contact.id)
  }

  function startBulk() {
    if (!selected.length) { error = 'Pilih minimal satu kontak terlebih dahulu.'; return }
    bulkCancelled = false
    bulkIndex = 0
    error = ''
  }

  function continueBulk() {
    if (bulkIndex === null) return
    if (bulkCancelled || bulkIndex >= selected.length - 1) { bulkIndex = null; return }
    bulkIndex += 1
  }

  const activeBulkContact = $derived(bulkIndex === null ? null : contacts.find((contact) => contact.id === selected[bulkIndex ?? 0]))
  const allSelected = $derived(contacts.length > 0 && selected.length === contacts.length)
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
    <div class="sender-notice">WhatsApp akan membuka chat dengan pesan terisi. Anda tetap perlu menekan tombol <strong>Kirim</strong> di WhatsApp.</div>

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
          <span>Karakter</span>
          <div class="gender-toggle">
            <button type="button" class:active={genderInput === 'm'} onclick={() => genderInput = 'm'}>Pria</button>
            <button type="button" class:active={genderInput === 'f'} onclick={() => genderInput = 'f'}>Wanita</button>
          </div>
        </label>
        <button type="submit" disabled={saving || contacts.length >= limit}>{saving ? 'Menambahkan...' : '+ Tambah Nomor'}</button>
      </form>
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
        <div class="bulk-actions-top"><label class="select-all"><input type="checkbox" checked={allSelected} onchange={toggleAll} /> <span>Pilih semua</span></label><button type="button" class="bulk-button" disabled={!selected.length} onclick={startBulk}>Mulai Kirim ({selected.length})</button></div>
      </div>

    {#if loading}
      <p class="sender-muted">Memuat daftar kontak...</p>
    {:else if !contacts.length}
      <p class="sender-muted">Belum ada penerima. Tambahkan nomor WhatsApp pertama.</p>
    {:else}
      <div class="contact-list">
        {#each contacts as contact}
          <div class="contact-row">
            <input class="contact-checkbox" type="checkbox" checked={selected.includes(contact.id)} onchange={() => toggleSelected(contact.id)} aria-label={`Pilih ${contact.name}`} />
            <span class="contact-avatar" aria-hidden="true">{contact.name.trim().charAt(0).toUpperCase()}</span>
            <div class="contact-detail">
              <strong>{contact.name} <span class="gender-icon" title={contact.gender === 'f' ? 'Wanita' : 'Pria'}>{contact.gender === 'f' ? '🚺' : '🚹'}</span></strong>
              <span>+{contact.phone}</span>
              {#if opened.includes(contact.id)}<em>Chat dibuka</em>{/if}
            </div>
            <div class="contact-actions"><button type="button" class="whatsapp-button" aria-label={`Buka chat WhatsApp ${contact.name}`} title="Buka Chat WhatsApp" onclick={() => openChat(contact)}>WA</button><button type="button" class="delete-contact" aria-label={`Hapus penerima ${contact.name}`} title="Hapus penerima" onclick={() => void removeContact(contact.id)}>×</button></div>
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
  .select-all { display: inline-flex; align-items: center; gap: 8px; color: var(--muted, #777); font-size: .8rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
  .select-all input, .contact-checkbox { width: 16px; height: 16px; margin: 0; accent-color: #8f5e68; }
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
  .whatsapp-button { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 50%; background: #20b957; color: white; font-size: .62rem; font-weight: 800; cursor: pointer; transition: background 0.2s, transform 0.1s; }
  .whatsapp-button:hover { background: #1b9e4a; transform: scale(1.02); }
  .delete-contact { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #a34f58; font-size: 1.25rem; line-height: 1; cursor: pointer; transition: background 0.2s, color 0.2s; }
  .delete-contact:hover { background: #fdf5f5; }
  .sender-error { color: #a33d3d; font-size: .84rem; margin-top: 14px; }
  .bulk-modal { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; background: rgba(23, 20, 17, .48); padding: 18px; }
  .bulk-card { max-width: 430px; width: 100%; border-radius: 16px; padding: 24px; background: #fff; color: #292321; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
  .bulk-progress { color: #168447; font-size: .78rem; font-weight: 800; }
  .bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
  .bulk-actions button { border: 1px solid #ddd; border-radius: 8px; padding: 9px 11px; cursor: pointer; }
  .bulk-actions .bulk-button { border-color: #20b957; background: #20b957; }
  @media (max-width: 680px) { .contact-form { grid-template-columns: 1fr; } .sender-header, .section-heading, .bulk-toolbar { align-items: flex-start; flex-direction: column; } .bulk-actions-top { width: 100%; justify-content: space-between; margin-left: 0; } .contact-row { grid-template-columns: 18px 30px minmax(0, 1fr) auto; padding: 11px 10px; } .contact-detail { padding-left: 8px; } .contact-detail strong { font-size: .88rem; } .contact-actions { margin-left: 8px; } .whatsapp-button, .delete-contact { width: 34px; height: 34px; } }
</style>
