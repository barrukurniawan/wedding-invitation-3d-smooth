<script lang="ts">
  // Pesan bantuan dari pemilik akun: daftar percakapan (kiri) + isi & balasan (kanan).
  // Polling: daftar tiap 15 dtk, percakapan yang dibuka tiap 8 dtk.
  import { onMount, tick } from 'svelte'
  import {
    ApiError,
    getAdminSupportMessages,
    getAdminSupportThreads,
    sendAdminSupportReply,
    type SupportMessage,
    type SupportThread,
  } from '$lib/api-client'
  import Icon from './ui/Icon.svelte'
  import { fmtRelative, initials } from './format'

  let { onUnreadChange }: { onUnreadChange?: () => void } = $props()

  let threads = $state<SupportThread[]>([])
  let loadingThreads = $state(true)
  let errorMsg = $state('')
  let query = $state('')
  let selectedId = $state<number | null>(null)
  let messages = $state<SupportMessage[]>([])
  let loadingMessages = $state(false)
  let draft = $state('')
  let sending = $state(false)
  let sendError = $state('')
  let list = $state<HTMLElement | null>(null)

  const selected = $derived(threads.find((t) => t.user_id === selectedId) ?? null)
  const visible = $derived(
    threads.filter((t) => {
      const q = query.trim().toLowerCase()
      return !q || [t.name, t.email, t.slug, t.last_body].some((v) => v?.toLowerCase().includes(q))
    }),
  )

  async function loadThreads() {
    try {
      threads = (await getAdminSupportThreads()).threads
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
    loadingMessages = true
    try {
      messages = (await getAdminSupportMessages(userId)).messages
      threads = threads.map((t) => (t.user_id === userId ? { ...t, unread: 0 } : t))
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

  async function reply() {
    const text = draft.trim()
    if (!text || !selectedId || sending) return
    sending = true
    sendError = ''
    try {
      const { message } = await sendAdminSupportReply(selectedId, text)
      messages = [...messages, message]
      draft = ''
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
        <p class="adm-card-sub">{threads.length} percakapan dari pemilik akun</p>
      </div>
    </div>
    <label class="adm-search">
      <Icon name="search" size={16} />
      <input class="adm-input" type="search" placeholder="Cari nama, email, subdomain" bind:value={query} aria-label="Cari percakapan" />
    </label>
    <ul>
      {#if loadingThreads}
        <li class="adm-empty">Memuat...</li>
      {/if}
      {#each visible as t (t.user_id)}
        <li>
          <button type="button" class="thread" class:active={t.user_id === selectedId} class:unread={t.unread > 0} onclick={() => openThread(t.user_id)}>
            <span class="adm-avatar">{initials(t.name || t.email)}</span>
            <span class="thread-text">
              <span class="row">
                <strong>{t.name || t.email || 'Pengguna'}</strong>
                <span class="when">{fmtRelative(t.last_at)}</span>
              </span>
              <span class="sub">{t.slug ? `${t.slug}.marryme.web.id` : t.email || 'belum punya subdomain'}</span>
              <span class="row">
                <span class="preview">{t.last_sender === 'admin' ? 'Anda: ' : ''}{t.last_body}</span>
                {#if t.unread > 0}<span class="count">{t.unread}</span>{/if}
              </span>
            </span>
          </button>
        </li>
      {:else}
        {#if !loadingThreads}
          <li class="adm-empty">{threads.length ? 'Tidak ada yang cocok.' : 'Belum ada pesan dari pengguna.'}</li>
        {/if}
      {/each}
    </ul>
  </aside>

  <section class="adm-card conversation">
    {#if selected}
      <header>
        <button type="button" class="adm-iconbtn back" aria-label="Kembali ke daftar" onclick={() => (selectedId = null)}>
          <Icon name="chevron" size={16} />
        </button>
        <span class="adm-avatar">{initials(selected.name || selected.email)}</span>
        <div class="who">
          <strong>{selected.name || 'Pengguna'}</strong>
          <span>{selected.email || 'tanpa email'}{selected.slug ? ` · ${selected.slug}.marryme.web.id` : ''}</span>
        </div>
        {#if selected.public_url}
          <a class="adm-btn ghost sm" href={selected.public_url} target="_blank" rel="noreferrer"><Icon name="external" size={14} /> Undangan</a>
        {/if}
      </header>

      <div class="messages" bind:this={list}>
        {#if loadingMessages}
          <p class="adm-empty">Memuat percakapan...</p>
        {/if}
        {#each messages as m (m.id)}
          <div class="bubble {m.sender}">
            <p>{m.body}</p>
            <span class="meta">
              {time(m.created_at)}
              {#if m.sender === 'user' && m.context} · dari <em>{m.context}</em>{/if}
              {#if m.sender === 'admin'} · {m.read ? 'Dibaca' : 'Terkirim'}{/if}
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
        <textarea class="adm-input" bind:value={draft} onkeydown={onKeydown} rows="2" maxlength="2000" placeholder="Tulis balasan… (Enter untuk kirim, Shift+Enter baris baru)" aria-label="Balasan"></textarea>
        <button type="submit" class="adm-btn" disabled={sending || !draft.trim()}>{sending ? 'Mengirim...' : 'Kirim'}</button>
      </form>
    {:else}
      <div class="placeholder">
        <span class="adm-kpi-icon static"><Icon name="message" size={18} /></span>
        <p>Pilih percakapan di kiri untuk membaca dan membalas.</p>
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
  .who span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who span {
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
    align-items: flex-end;
    gap: 10px;
    padding: 12px;
    border-top: 1px solid var(--adm-line);
  }
  .composer textarea {
    min-height: 0;
    resize: none;
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
