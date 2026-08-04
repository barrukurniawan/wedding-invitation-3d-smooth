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
  let template = $state('Hai {nama}! Kami mengundang kamu ke pernikahan {mempelai}.\n\nBuka undangan 3D kami di sini:\n{link}\n\nKami tunggu kehadiranmu!')
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
      const result = await createMyContact(nameInput, phoneInput)
      contacts = [...contacts, result.contact]
      nameInput = ''
      phoneInput = ''
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
    return template.replaceAll('{nama}', contact.name).replaceAll('{mempelai}', couple).replaceAll('{link}', invitation.public_url)
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
        <div class="bulk-actions-top"><label><input type="checkbox" checked={allSelected} onchange={toggleAll} /> Pilih semua</label><button type="button" class="bulk-button" disabled={!selected.length} onclick={startBulk}>Mulai Kirim ({selected.length})</button></div>
      </div>

    {#if loading}
      <p class="sender-muted">Memuat daftar kontak...</p>
    {:else if !contacts.length}
      <p class="sender-muted">Belum ada penerima. Tambahkan nomor WhatsApp pertama.</p>
    {:else}
      <div class="contact-list">
        {#each contacts as contact}
          <div class="contact-row">
            <input type="checkbox" checked={selected.includes(contact.id)} onchange={() => toggleSelected(contact.id)} aria-label={`Pilih ${contact.name}`} />
            <div class="contact-detail"><strong>{contact.name}</strong><span>+{contact.phone}</span>{#if opened.includes(contact.id)}<em>Chat dibuka</em>{/if}</div>
            <button type="button" class="whatsapp-button" aria-label={`Buka chat WhatsApp ${contact.name}`} title="Buka Chat WhatsApp" onclick={() => openChat(contact)}>WhatsApp</button>
            <button type="button" class="delete-contact" aria-label={`Hapus ${contact.name}`} onclick={() => void removeContact(contact.id)}>×</button>
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
  .sender-header, .bulk-toolbar, .contact-row { display: flex; align-items: center; gap: 12px; }
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
  .contact-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: end; gap: 14px; }
  .contact-form label { display: flex; flex-direction: column; gap: 8px; min-width: 0; color: #554f4f; font-size: .8rem; font-weight: 600; }
  .contact-form input, .template-box textarea { width: 100%; min-width: 0; box-sizing: border-box; border: 1px solid #ddd; border-radius: 10px; padding: 12px 14px; background: #faf9f8; color: inherit; font: inherit; transition: border-color 0.2s; }
  .contact-form input:focus, .template-box textarea:focus { outline: none; border-color: #a35c5c; background: #fff; }
  .contact-form button, .bulk-button { border: 0; border-radius: 10px; padding: 12px 20px; background: #2d2525; color: white; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .contact-form button:hover, .bulk-button:hover { background: #1a1515; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .template-box { display: grid; gap: 7px; }
  .template-box small { color: var(--muted, #777); }
  .bulk-toolbar { justify-content: space-between; }
  .bulk-actions-top { display: flex; align-items: center; gap: 14px; }
  .contact-list { display: grid; gap: 10px; margin-top: 20px; }
  .contact-row { min-width: 0; padding: 14px 18px; border: 1px solid #e8e4e1; border-radius: 12px; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; }
  .contact-row:hover { border-color: #d8d4d1; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
  .contact-detail { flex: 1; display: flex; flex-direction: column; align-items: flex-start; text-align: left; gap: 4px; }
  .contact-detail strong { color: #2d2525; font-size: 0.95rem; font-weight: 600; }
  .contact-detail span { color: #665b4c; font-size: .85rem; }
  .contact-detail em { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #e8f5ed; color: #168447; font-size: .7rem; font-style: normal; font-weight: 600; margin-top: 2px; }
  .whatsapp-button { display: flex; align-items: center; justify-content: center; gap: 6px; width: auto; height: 36px; padding: 0 16px; border: 0; border-radius: 18px; background: #20b957; color: white; font-size: .75rem; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.1s; }
  .whatsapp-button:hover { background: #1b9e4a; transform: scale(1.02); }
  .delete-contact { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #a35c5c; font-size: 1.2rem; cursor: pointer; transition: background 0.2s; }
  .delete-contact:hover { background: #fdf5f5; }
  .sender-error { color: #a33d3d; font-size: .84rem; margin-top: 14px; }
  .bulk-modal { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; background: rgba(23, 20, 17, .48); padding: 18px; }
  .bulk-card { max-width: 430px; width: 100%; border-radius: 16px; padding: 24px; background: #fff; color: #292321; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
  .bulk-progress { color: #168447; font-size: .78rem; font-weight: 800; }
  .bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
  .bulk-actions button { border: 1px solid #ddd; border-radius: 8px; padding: 9px 11px; cursor: pointer; }
  .bulk-actions .bulk-button { border-color: #20b957; background: #20b957; }
  @media (max-width: 680px) { .contact-form { grid-template-columns: 1fr; } .sender-header, .section-heading, .bulk-toolbar { align-items: flex-start; flex-direction: column; } .bulk-actions-top { width: 100%; justify-content: space-between; } }
</style>
