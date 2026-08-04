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

    <form class="contact-form" onsubmit={addContact}>
      <input bind:value={nameInput} placeholder="Nama penerima" maxlength="255" aria-label="Nama penerima" />
      <input bind:value={phoneInput} placeholder="Nomor WhatsApp, contoh 0812..." maxlength="32" inputmode="tel" aria-label="Nomor WhatsApp" />
      <button type="submit" disabled={saving || contacts.length >= limit}>{saving ? 'Menambahkan...' : '+ Tambah Nomor'}</button>
    </form>

    <div class="template-box">
      <label for="whatsapp-template">Template pesan</label>
      <textarea id="whatsapp-template" bind:value={template} rows="5"></textarea>
      <small>Variabel: <code>{'{nama}'}</code>, <code>{'{mempelai}'}</code>, <code>{'{link}'}</code></small>
    </div>

    <div class="bulk-toolbar">
      <label><input type="checkbox" checked={allSelected} onchange={toggleAll} /> Pilih semua</label>
      <button type="button" class="bulk-button" disabled={!selected.length} onclick={startBulk}>Mulai Kirim ({selected.length})</button>
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
            <button type="button" class="whatsapp-button" aria-label={`Buka chat WhatsApp ${contact.name}`} title="Buka Chat WhatsApp" onclick={() => openChat(contact)}>WA</button>
            <button type="button" class="delete-contact" aria-label={`Hapus ${contact.name}`} onclick={() => void removeContact(contact.id)}>×</button>
          </div>
        {/each}
      </div>
    {/if}
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
  .invitation-sender { position: relative; }
  .sender-header, .bulk-toolbar, .contact-row { display: flex; align-items: center; gap: 12px; }
  .sender-header { justify-content: space-between; margin-bottom: 18px; }
  .sender-header h3 { margin-bottom: 6px; }
  .contact-count, .sender-muted { color: var(--muted, #777); font-size: .82rem; }
  .sender-notice { padding: 12px 14px; border-radius: 10px; background: #f5f1e9; color: #665b4c; font-size: .84rem; line-height: 1.5; }
  .contact-form { display: grid; grid-template-columns: 1fr 1.3fr auto; gap: 10px; margin: 18px 0; }
  .contact-form input, .template-box textarea { width: 100%; border: 1px solid var(--line, #ddd); border-radius: 9px; padding: 11px 12px; background: #fff; color: inherit; }
  .contact-form button, .bulk-button { border: 0; border-radius: 9px; padding: 10px 14px; background: #222; color: white; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .template-box { margin: 18px 0; display: grid; gap: 7px; }
  .template-box label { font-size: .82rem; font-weight: 700; }
  .template-box small { color: var(--muted, #777); }
  .bulk-toolbar { justify-content: space-between; border-top: 1px solid var(--line, #ddd); border-bottom: 1px solid var(--line, #ddd); padding: 12px 0; }
  .contact-list { display: grid; gap: 8px; margin-top: 14px; }
  .contact-row { padding: 10px 0; border-bottom: 1px solid var(--line, #eee); }
  .contact-detail { flex: 1; display: grid; gap: 2px; }
  .contact-detail span { color: var(--muted, #777); font-size: .82rem; }
  .contact-detail em { color: #168447; font-size: .72rem; font-style: normal; }
  .whatsapp-button { width: 38px; height: 38px; border: 0; border-radius: 50%; background: #20b957; color: white; font-size: .65rem; font-weight: 800; cursor: pointer; }
  .delete-contact { border: 0; background: transparent; color: #a35c5c; font-size: 1.2rem; cursor: pointer; }
  .sender-error { color: #a33d3d; font-size: .84rem; margin-top: 14px; }
  .bulk-modal { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; background: rgba(23, 20, 17, .48); padding: 18px; }
  .bulk-card { max-width: 430px; width: 100%; border-radius: 16px; padding: 24px; background: #fff; color: #292321; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
  .bulk-progress { color: #168447; font-size: .78rem; font-weight: 800; }
  .bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
  .bulk-actions button { border: 1px solid #ddd; border-radius: 8px; padding: 9px 11px; cursor: pointer; }
  .bulk-actions .bulk-button { border-color: #20b957; background: #20b957; }
  @media (max-width: 680px) { .contact-form { grid-template-columns: 1fr; } .sender-header { align-items: flex-start; flex-direction: column; } }
</style>
