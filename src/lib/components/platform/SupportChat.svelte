<script lang="ts">
  // Chat bantuan pemilik akun → admin. Tombol bulat di kanan bawah; panel berisi satu
  // percakapan. Polling: 8 dtk saat panel terbuka, 60 dtk saat tertutup (badge balasan).
  import { onMount, tick } from 'svelte'
  import { fly } from 'svelte/transition'
  import { ApiError, getSupportMessages, getSupportUnread, sendSupportMessage, type SupportMessage } from '$lib/api-client'

  let { context = '' }: { context?: string } = $props()

  const OPEN_POLL_MS = 8000
  const CLOSED_POLL_MS = 60000

  let open = $state(false)
  let messages = $state<SupportMessage[]>([])
  let unread = $state(0)
  let draft = $state('')
  let sending = $state(false)
  let failed = $state<string | null>(null)
  let errorMsg = $state('')
  let loaded = $state(false)
  let disabled = $state(false)

  // Penarik perhatian: label "Butuh bantuan?", sapaan, dan animasi, sampai pengguna
  // pernah membuka chat atau menutup sapaan (diingat per browser).
  const SEEN_KEY = 'marryme_support_seen'
  function readSeen() {
    try {
      return localStorage.getItem(SEEN_KEY) === '1'
    } catch {
      return false
    }
  }
  let seen = $state(readSeen())
  let teaser = $state(false)
  function markSeen() {
    seen = true
    teaser = false
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Penyimpanan diblokir (mode privat): cukup berlaku untuk sesi ini.
    }
  }
  const attention = $derived(!open && (!seen || unread > 0))
  let list = $state<HTMLElement | null>(null)
  let input = $state<HTMLTextAreaElement | null>(null)

  const lastId = () => messages.at(-1)?.id ?? 0

  async function scrollToBottom() {
    await tick()
    list?.scrollTo({ top: list.scrollHeight })
  }

  async function poll() {
    if (disabled || document.hidden) return
    try {
      if (open) {
        const res = await getSupportMessages(loaded ? lastId() : 0, true)
        const fresh = res.messages.filter((m) => !messages.some((x) => x.id === m.id))
        if (!loaded) {
          messages = res.messages
          void scrollToBottom()
        } else if (fresh.length) {
          messages = [...messages, ...fresh]
          void scrollToBottom()
        }
        loaded = true
        unread = 0
      } else {
        unread = (await getSupportUnread()).unread
      }
    } catch (error) {
      // Migrasi belum jalan atau sesi habis: sembunyikan widget, jangan ganggu dashboard.
      if (error instanceof ApiError && (error.status === 503 || error.status === 401)) disabled = true
    }
  }

  // Jadwal polling diatur ulang setiap panel dibuka/ditutup supaya jedanya langsung ikut berubah.
  let timer: ReturnType<typeof setTimeout> | undefined
  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      await poll()
      schedule()
    }, open ? OPEN_POLL_MS : CLOSED_POLL_MS)
  }

  onMount(() => {
    void poll()
    schedule()
    const teaserTimer = setTimeout(() => {
      if (!seen && !open) teaser = true
    }, 2500)
    return () => {
      clearTimeout(timer)
      clearTimeout(teaserTimer)
    }
  })

  async function toggle() {
    open = !open
    if (open) markSeen()
    schedule()
    if (open) {
      // Muat ulang penuh setiap dibuka supaya status Terkirim/Dibaca ikut terbaru.
      loaded = false
      await poll()
      void scrollToBottom()
      await tick()
      input?.focus()
    }
  }

  async function send(text = draft.trim()) {
    if (!text || sending) return
    sending = true
    errorMsg = ''
    try {
      const res = await sendSupportMessage(text, context || undefined)
      messages = [...messages, res.message]
      if (text === draft.trim()) draft = ''
      failed = null
      void scrollToBottom()
    } catch (error) {
      failed = text
      errorMsg = error instanceof ApiError ? error.message : 'Pesan gagal terkirim.'
    } finally {
      sending = false
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void send()
    }
  }

  const time = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

{#if !disabled}
  {#if open}
    <section class="chat-panel" aria-label="Chat bantuan MarryMe" transition:fly={{ y: 16, duration: 180 }}>
      <header>
        <div>
          <strong>Bantuan MarryMe</strong>
          <span>Ada error atau kendala? Tulis di sini, admin akan membalas.</span>
        </div>
        <button type="button" class="close" aria-label="Tutup chat" onclick={toggle}>✕</button>
      </header>

      <div class="messages" bind:this={list}>
        <div class="bubble admin intro">
          👋 Halo! Ceritakan kendalamu, misalnya halaman mana yang error dan apa yang terjadi. Balasan admin muncul di sini.
        </div>
        {#each messages as m (m.id)}
          <div class="bubble {m.sender}">
            <p>{m.body}</p>
            <span class="meta">{m.sender === 'admin' ? 'Admin · ' : ''}{time(m.created_at)}{m.sender === 'user' ? (m.read ? ' · Dibaca' : ' · Terkirim') : ''}</span>
          </div>
        {/each}
      </div>

      {#if errorMsg}
        <div class="error">
          {errorMsg}
          {#if failed}<button type="button" onclick={() => send(failed ?? '')}>Kirim ulang</button>{/if}
        </div>
      {/if}

      <form
        onsubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <textarea
          bind:this={input}
          bind:value={draft}
          onkeydown={onKeydown}
          rows="2"
          maxlength="2000"
          placeholder="Tulis pesan… (Enter untuk kirim)"
          aria-label="Pesan untuk admin"
        ></textarea>
        <button type="submit" disabled={sending || !draft.trim()}>{sending ? '…' : 'Kirim'}</button>
      </form>
    </section>
  {/if}

  {#if teaser && !open}
    <div class="chat-teaser" role="status" transition:fly={{ y: 10, duration: 220 }}>
      <button type="button" class="teaser-body" onclick={toggle}>
        <strong>Ada kendala atau error? 👋</strong>
        <span>Chat langsung dengan admin MarryMe di sini.</span>
      </button>
      <button type="button" class="teaser-close" aria-label="Tutup sapaan" onclick={markSeen}>✕</button>
    </div>
  {/if}

  <button
    type="button"
    class="chat-fab"
    class:attention
    class:extended={!seen && !open}
    aria-label={open ? 'Tutup chat bantuan' : 'Buka chat bantuan'}
    aria-expanded={open}
    onclick={toggle}
  >
    {#if open}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
    {:else}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      {#if !seen}<span class="fab-label">Butuh bantuan?</span>{/if}
      {#if unread > 0}<span class="badge">{unread > 9 ? '9+' : unread}</span>{/if}
    {/if}
  </button>
{/if}

<style>
  .chat-fab {
    position: fixed;
    right: 20px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #8f1d45;
    color: #fff;
    box-shadow: 0 12px 30px -10px rgba(143, 29, 69, 0.6);
    transition: transform 0.15s, background 0.15s;
  }
  .chat-fab:hover {
    background: #5e1230;
    transform: translateY(-2px);
  }
  /* Bentuk memanjang dengan label sampai pengguna pernah membuka chat. */
  .chat-fab.extended {
    display: flex;
    align-items: center;
    gap: 8px;
    width: auto;
    padding: 0 20px 0 16px;
    border-radius: 999px;
  }
  .fab-label {
    font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }
  /* Cincin emas berdenyut + goyangan singkat tiap ~7 dtk. */
  .chat-fab.attention {
    box-shadow: 0 0 0 3px #fbbf24, 0 12px 30px -10px rgba(143, 29, 69, 0.6);
    animation: chat-wiggle 7s ease-in-out 2s infinite;
  }
  .chat-fab.attention::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: inherit;
    border: 3px solid #fbbf24;
    animation: chat-ripple 2.2s ease-out infinite;
    pointer-events: none;
  }
  @keyframes chat-ripple {
    0% {
      transform: scale(1);
      opacity: 0.85;
    }
    100% {
      transform: scale(1.45);
      opacity: 0;
    }
  }
  @keyframes chat-wiggle {
    0%,
    86%,
    100% {
      transform: rotate(0);
    }
    88% {
      transform: rotate(-9deg) scale(1.06);
    }
    90% {
      transform: rotate(8deg) scale(1.06);
    }
    92% {
      transform: rotate(-6deg) scale(1.04);
    }
    94% {
      transform: rotate(4deg);
    }
    96% {
      transform: rotate(-2deg);
    }
  }
  .chat-teaser {
    position: fixed;
    right: 20px;
    bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    width: min(290px, calc(100vw - 40px));
    padding: 12px 10px 12px 16px;
    border-radius: 18px 18px 6px 18px;
    background: #fff;
    border: 1px solid #f3d27a;
    box-shadow: 0 18px 40px -18px rgba(40, 20, 25, 0.45);
    font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
  }
  .teaser-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  .teaser-body strong {
    display: block;
    font-size: 14px;
    color: #181314;
  }
  .teaser-body span {
    display: block;
    margin-top: 2px;
    font-size: 12.5px;
    color: #6b6264;
    line-height: 1.4;
  }
  .teaser-close {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: #8a8183;
    font-size: 11px;
  }
  .teaser-close:hover {
    background: #f4f1f0;
  }
  @media (prefers-reduced-motion: reduce) {
    .chat-fab.attention,
    .chat-fab.attention::before {
      animation: none;
    }
  }
  .badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    background: #f59e0b;
    color: #1c1917;
    font-size: 11px;
    font-weight: 800;
    line-height: 20px;
    text-align: center;
    border: 2px solid #fff;
  }
  .chat-panel {
    position: fixed;
    right: 20px;
    bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
    display: flex;
    flex-direction: column;
    width: min(370px, calc(100vw - 32px));
    height: min(540px, calc(100vh - 120px));
    border-radius: 22px;
    background: #fbfaf9;
    border: 1px solid #ebe8e6;
    box-shadow: 0 30px 70px -25px rgba(40, 20, 25, 0.45);
    overflow: hidden;
    font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 16px 14px 18px;
    background: linear-gradient(160deg, #b02a5a, #8f1d45 50%, #5e1230);
    color: #fff;
  }
  header strong {
    display: block;
    font-size: 15px;
  }
  header span {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    opacity: 0.85;
    line-height: 1.35;
  }
  .close {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    font-size: 13px;
  }
  .messages {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
  }
  .bubble {
    max-width: 85%;
    padding: 9px 12px;
    border-radius: 16px;
    font-size: 13.5px;
    line-height: 1.45;
  }
  .bubble p {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .bubble.user {
    align-self: flex-end;
    background: #8f1d45;
    color: #fff;
    border-bottom-right-radius: 5px;
  }
  .bubble.admin {
    align-self: flex-start;
    background: #fff;
    color: #181314;
    border: 1px solid #ebe8e6;
    border-bottom-left-radius: 5px;
  }
  .bubble.intro {
    color: #3a3335;
  }
  .meta {
    display: block;
    margin-top: 4px;
    font-size: 10.5px;
    opacity: 0.7;
  }
  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 14px;
    background: #fde4e4;
    color: #c0262d;
    font-size: 12px;
  }
  .error button {
    font-weight: 700;
    text-decoration: underline;
    color: inherit;
  }
  form {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 10px;
    border-top: 1px solid #ebe8e6;
    background: #fff;
  }
  textarea {
    flex: 1;
    resize: none;
    max-height: 120px;
    padding: 9px 12px;
    border-radius: 14px;
    border: 1px solid #ebe8e6;
    font: inherit;
    font-size: 13.5px;
    outline: none;
  }
  textarea:focus {
    border-color: #8f1d45;
  }
  form button {
    padding: 10px 16px;
    border-radius: 999px;
    background: #8f1d45;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
  }
  form button:disabled {
    opacity: 0.5;
  }
  @media (max-width: 520px) {
    .chat-panel {
      right: 0;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 100dvh;
      border-radius: 0;
      border: 0;
      z-index: 90;
      padding-top: env(safe-area-inset-top, 0px);
    }
    .chat-fab {
      right: 16px;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }
    .chat-panel ~ .chat-fab {
      display: none;
    }
  }
</style>
