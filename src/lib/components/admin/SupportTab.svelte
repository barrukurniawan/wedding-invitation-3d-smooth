<script lang="ts">
  // Pesan bantuan: daftar akun (kiri) + isi percakapan & balasan (kanan). Tab "Semua akun" memuat
  // pemilik yang belum pernah chat, supaya admin bisa menyapa duluan.
  // Polling: daftar tiap 15 dtk, percakapan yang dibuka tiap 8 dtk.
  import { onMount, tick } from 'svelte'
  import {
    ApiError,
    getAdminSupportAccounts,
    getAdminSupportMessages,
    sendAdminSupportReply,
    type SupportAccount,
    type SupportMessage,
  } from '$lib/api-client'
  import Icon from './ui/Icon.svelte'
  import { fmtRelative, initials, statusMeta } from './format'

  let { onUnreadChange }: { onUnreadChange?: () => void } = $props()

  let accounts = $state<SupportAccount[]>([])
  let emailEnabled = $state(false)
  let loadingThreads = $state(true)
  let errorMsg = $state('')
  let query = $state('')
  let view = $state<'threads' | 'all'>('threads')
  let selectedId = $state<number | null>(null)
  let messages = $state<SupportMessage[]>([])
  let loadingMessages = $state(false)
  let draft = $state('')
  let sending = $state(false)
  let sendError = $state('')
  // Centang "Kirim juga ke email": default mati, kembali mati setelah setiap pesan.
  let sendEmail = $state(false)
  let emailNotice = $state<{ ok: boolean; text: string } | null>(null)
  let list = $state<HTMLElement | null>(null)

  const threadCount = $derived(accounts.filter((a) => a.total > 0).length)
  const selected = $derived(accounts.find((a) => a.user_id === selectedId) ?? null)
  const visible = $derived(
    accounts.filter((a) => {
      if (view === 'threads' && a.total === 0) return false
      const q = query.trim().toLowerCase()
      return !q || [a.name, a.email, a.slug, a.last_body].some((v) => v?.toLowerCase().includes(q))
    }),
  )
  const canEmail = $derived(emailEnabled && Boolean(selected?.email))
  const emailHint = $derived(
    !emailEnabled
      ? 'Email belum diatur di server (SMTP).'
      : !selected?.email
        ? 'Akun ini tidak punya alamat email.'
        : `Salinan pesan dikirim ke ${selected.email}`,
  )

  async function loadThreads() {
    try {
      const res = await getAdminSupportAccounts()
      accounts = res.accounts
      emailEnabled = res.emailEnabled
      errorMsg = ''
    } catch (error) {
      errorMsg = error instanceof ApiError && error.status === 503 ? error.message : 'Gagal memuat pesan.'
    } finally {
      loadingThreads = false
    }
  }

  async function scrollToBottom() {
    await tick()
    list?.scrollTo({ top: list.scrollHeight })
  }

  async function openThread(userId: number) {
    selectedId = userId
    messages = []
    sendError = ''
    emailNotice = null
    sendEmail = false
    draft = ''
    const account = accounts.find((a) => a.user_id === userId)
    if (!account?.total) return
    loadingMessages = true
    try {
      messages = (await getAdminSupportMessages(userId)).messages
      accounts = accounts.map((a) => (a.user_id === userId ? { ...a, unread: 0 } : a))
      onUnreadChange?.()
      void scrollToBottom()
    } finally {
      loadingMessages = false
    }
  }

  async function pollThread() {
    if (!selectedId || loadingMessages) return
    const userId = selectedId
    const after = messages.at(-1)?.id ?? 0
    const fresh = (await getAdminSupportMessages(userId, after)).messages
    if (selectedId === userId && fresh.length) {
      messages = [...messages, ...fresh.filter((m) => !messages.some((x) => x.id === m.id))]
      void scrollToBottom()
      onUnreadChange?.()
    }
  }

  function greet() {
    const name = selected?.name?.trim()
    draft = selected?.slug
      ? `Halo${name ? ` ${name}` : ''}, terima kasih sudah membuat undangan di MarryMe! 🙏 Ada yang bisa kami bantu atau ingin ditanyakan?`
      : `Halo${name ? ` ${name}` : ''}, terima kasih sudah bergabung di MarryMe! 🙏 Ada yang bisa kami bantu untuk mulai membuat undangan?`
  }

  async function reply() {
    const text = draft.trim()
    if (!text || !selectedId || sending) return
    sending = true
    sendError = ''
    emailNotice = null
    const withEmail = sendEmail && canEmail
    const to = selected?.email
    try {
      const { message, email } = await sendAdminSupportReply(selectedId, text, withEmail)
      messages = [...messages, message]
      draft = ''
      sendEmail = false
      if (email === 'sent') emailNotice = { ok: true, text: `Terkirim juga ke email ${to}` }
      else if (email === 'failed') emailNotice = { ok: false, text: 'Email gagal terkirim. Pesan chat tetap tersimpan.' }
      void scrollToBottom()
      void loadThreads()
    } catch (error) {
      sendError = error instanceof ApiError ? error.message : 'Balasan gagal terkirim.'
    } finally {
      sending = false
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void reply()
    }
  }

  onMount(() => {
    void loadThreads()
    const threadTimer = setInterval(() => !document.hidden && loadThreads(), 15000)
    const messageTimer = setInterval(() => !document.hidden && pollThread().catch(() => {}), 8000)
    return () => {
      clearInterval(threadTimer)
      clearInterval(messageTimer)
    }
  })

  const time = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

{#if errorMsg}<p class="adm-error" style="margin-bottom: 12px">{errorMsg}</p>{/if}

<div class="support" class:has-selection={selected !== null}>
  <aside class="adm-card threads">
    <div class="adm-card-head" style="margin-bottom: 10px">
      <div>
        <h2 class="adm-card-title">Pesan Bantuan</h2>
        <p class="adm-card-sub">{threadCount} percakapan · {accounts.length} akun pemilik</p>
      </div>
    </div>
    <div class="adm-seg views" role="group" aria-label="Tampilan daftar">
      <button type="button" class:active={view === 'threads'} onclick={() => (view = 'threads')}>Percakapan</button>
      <button type="button" class:active={view === 'all'} onclick={() => (view = 'all')}>Semua akun</button>
    </div>
    <label class="adm-search">
      <Icon name="search" size={16} />
      <input class="adm-input" type="search" placeholder="Cari nama, email, subdomain" bind:value={query} aria-label="Cari akun" />
    </label>
    <ul>
      {#if loadingThreads}
        <li class="adm-empty">Memuat...</li>
      {/if}
      {#each visible as a (a.user_id)}
        <li>
          <button type="button" class="thread" class:active={a.user_id === selectedId} class:unread={a.unread > 0} onclick={() => openThread(a.user_id)}>
            <span class="adm-avatar">{initials(a.name || a.email)}</span>
            <span class="thread-text">
              <span class="row">
                <strong>{a.name || a.email || 'Pengguna'}</strong>
                <span class="when">{a.last_at ? fmtRelative(a.last_at) : ''}</span>
              </span>
              <span class="sub">{a.slug ? `${a.slug}.marryme.web.id` : a.email || 'belum punya subdomain'}</span>
              <span class="row">
                {#if a.total > 0}
                  <span class="preview">{a.last_sender === 'admin' ? 'Anda: ' : ''}{a.last_body}</span>
                {:else}
                  <span class="preview muted">Belum pernah chat · login {fmtRelative(a.last_login_at).toLowerCase()}</span>
                {/if}
                {#if a.unread > 0}<span class="count">{a.unread}</span>{/if}
              </span>
            </span>
          </button>
        </li>
      {:else}
        {#if !loadingThreads}
          <li class="adm-empty">
            {#if query.trim()}Tidak ada yang cocok.{:else if view === 'threads'}Belum ada percakapan. Buka tab <strong>Semua akun</strong> untuk menyapa pemilik undangan.{:else}Belum ada akun.{/if}
          </li>
        {/if}
      {/each}
    </ul>
  </aside>

  <section class="adm-card conversation">
    {#if selected}
      {@const meta = selected.invitation_status ? statusMeta(selected.invitation_status) : null}
      <header>
        <button type="button" class="adm-iconbtn back" aria-label="Kembali ke daftar" onclick={() => (selectedId = null)}>
          <Icon name="chevron" size={16} />
        </button>
        <span class="adm-avatar">{initials(selected.name || selected.email)}</span>
        <div class="who">
          <strong>{selected.name || 'Pengguna'}</strong>
          <span>
            {selected.email || 'tanpa email'}{selected.slug ? ` · ${selected.slug}.marryme.web.id` : ''}
            {#if meta} · <span class="adm-status" style="--dot: {meta.color}">{meta.label}</span>{/if}
            {#if selected.preset} · {selected.preset === '2d_garden' ? '2D' : '3D'}{/if}
          </span>
        </div>
        {#if selected.public_url}
          <a class="adm-btn ghost sm" href={selected.public_url} target="_blank" rel="noreferrer"><Icon name="external" size={14} /> Undangan</a>
        {/if}
      </header>

      <div class="messages" bind:this={list}>
        {#if loadingMessages}
          <p class="adm-empty">Memuat percakapan...</p>
        {:else if messages.length === 0}
          <div class="empty-thread">
            <span class="adm-kpi-icon static"><Icon name="message" size={18} /></span>
            <p>Belum ada pesan. Mulai percakapan dengan <strong>{selected.name || selected.email || 'pengguna ini'}</strong>.</p>
            <p class="hint">Pesan muncul di dashboard mereka (login terakhir: {fmtRelative(selected.last_login_at).toLowerCase()}). Centang <em>Kirim juga ke email</em> supaya mereka tahu lewat email.</p>
            <button type="button" class="adm-btn ghost sm" onclick={greet}>Pakai sapaan</button>
          </div>
        {/if}
        {#each messages as m (m.id)}
          <div class="bubble {m.sender}">
            <p>{m.body}</p>
            <span class="meta">
              {time(m.created_at)}
              {#if m.sender === 'user' && m.context} · dari <em>{m.context}</em>{/if}
              {#if m.sender === 'admin'} · {m.read ? 'Dibaca' : 'Terkirim'}{/if}
              {#if m.emailed} · <span title="Juga dikirim ke email">✉ Email</span>{/if}
            </span>
          </div>
        {/each}
      </div>

      {#if sendError}<p class="adm-error send-error">{sendError}</p>{/if}
      <form
        class="composer"
        onsubmit={(e) => {
          e.preventDefault()
          void reply()
        }}
      >
        <textarea class="adm-input" bind:value={draft} onkeydown={onKeydown} rows="2" maxlength="2000" placeholder="Tulis pesan… (Enter untuk kirim, Shift+Enter baris baru)" aria-label="Pesan"></textarea>
        <div class="composer-actions">
          <label class="email-toggle" class:disabled={!canEmail} title={emailHint}>
            <input type="checkbox" bind:checked={sendEmail} disabled={!canEmail} />
            <Icon name="mail" size={15} />
            <span>Kirim juga ke email</span>
          </label>
          <button type="submit" class="adm-btn send" disabled={sending || !draft.trim()} aria-label={sendEmail ? 'Kirim pesan dan email' : 'Kirim pesan'}>
            {#if sending}Mengirim...{:else}<Icon name="send" size={16} /> Kirim{/if}
          </button>
        </div>
      </form>
      {#if emailNotice}<p class="email-notice" class:fail={!emailNotice.ok}>✉ {emailNotice.text}</p>{:else if !canEmail}<p class="email-notice muted">{emailHint}</p>{/if}
    {:else}
      <div class="placeholder">
        <span class="adm-kpi-icon static"><Icon name="message" size={18} /></span>
        <p>Pilih percakapan atau akun di kiri untuk membaca, membalas, atau menyapa duluan.</p>
      </div>
    {/if}
  </section>
</div>

<style>
  .support {
    display: grid;
    grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.6fr);
    gap: 16px;
    height: min(720px, calc(100vh - 220px));
    min-height: 480px;
  }
  .threads,
  .conversation {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .threads ul {
    list-style: none;
    margin: 12px -8px 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
  }
  .thread {
    display: flex;
    gap: 10px;
    width: 100%;
    padding: 10px;
    border-radius: 14px;
    text-align: left;
  }
  .thread:hover {
    background: var(--adm-soft);
  }
  .thread.active {
    background: var(--adm-rose-soft);
  }
  .thread-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .row strong {
    font-size: 13.5px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .when,
  .sub {
    font-size: 11.5px;
    color: var(--adm-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .preview {
    font-size: 12.5px;
    color: var(--adm-ink-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .thread.unread .preview,
  .thread.unread strong {
    font-weight: 700;
    color: var(--adm-ink);
  }
  .count {
    flex-shrink: 0;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--adm-accent);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 20px;
    text-align: center;
  }
  .conversation {
    padding: 0;
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--adm-line);
  }
  .who {
    flex: 1;
    min-width: 0;
  }
  .who strong,
  .who > span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who > span {
    font-size: 12px;
    color: var(--adm-muted);
  }
  .back {
    display: none;
    transform: rotate(90deg);
  }
  .messages {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 18px;
    background: var(--adm-soft);
  }
  .bubble {
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 13.5px;
    line-height: 1.5;
  }
  .bubble p {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .bubble.user {
    align-self: flex-start;
    background: var(--adm-surface);
    border: 1px solid var(--adm-line);
    border-bottom-left-radius: 5px;
  }
  .bubble.admin {
    align-self: flex-end;
    background: var(--adm-accent);
    color: #fff;
    border-bottom-right-radius: 5px;
  }
  .meta {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    opacity: 0.7;
  }
  .composer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid var(--adm-line);
  }
  .composer textarea {
    min-height: 0;
    resize: none;
  }
  .composer-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: wrap;
  }
  .email-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--adm-ink-2);
    cursor: pointer;
    user-select: none;
  }
  .email-toggle input {
    width: 16px;
    height: 16px;
    accent-color: var(--adm-accent);
    cursor: inherit;
  }
  .email-toggle.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .send {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .email-notice {
    margin: 0;
    padding: 0 14px 10px;
    font-size: 12px;
    color: #15803d;
    text-align: right;
  }
  .email-notice.fail {
    color: #c0262d;
  }
  .email-notice.muted,
  .preview.muted {
    color: var(--adm-muted);
    font-weight: 400;
  }
  .views {
    margin-bottom: 10px;
    width: 100%;
  }
  .views button {
    flex: 1;
  }
  .empty-thread {
    margin: auto;
    max-width: 380px;
    display: grid;
    justify-items: center;
    gap: 8px;
    text-align: center;
    color: var(--adm-ink-2);
    font-size: 13.5px;
  }
  .empty-thread p {
    margin: 0;
  }
  .empty-thread .hint {
    font-size: 12px;
    color: var(--adm-muted);
  }
  .send-error {
    padding: 8px 18px 0;
  }
  .placeholder {
    flex: 1;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 10px;
    color: var(--adm-muted);
    padding: 24px;
    text-align: center;
  }
  .adm-kpi-icon.static {
    position: static;
  }
  @media (max-width: 860px) {
    .support {
      grid-template-columns: minmax(0, 1fr);
      height: auto;
    }
    .support.has-selection .threads,
    .support:not(.has-selection) .conversation {
      display: none;
    }
    .conversation {
      height: calc(100dvh - 200px);
      min-height: 420px;
    }
    .back {
      display: grid;
    }
    .bubble {
      max-width: 88%;
    }
  }
</style>
