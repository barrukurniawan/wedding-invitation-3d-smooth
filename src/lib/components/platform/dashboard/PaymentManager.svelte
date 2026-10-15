<script lang="ts">
  import Icon from '$lib/components/icons/Icon.svelte'
  import type { OwnerInvitation, WeddingConfig } from '$lib/api-client'
  import {
    ApiError,
    checkoutPayment,
    createTakoPayment,
    getPublicPricing,
    getTakoPaymentStatus,
    uploadPaymentProof,
    type PublicPricing,
    type TakoMethod,
  } from '$lib/api-client'
  import { onMount } from 'svelte'

  // Harga & mode pembayaran dari API (bisa diubah di server tanpa rebuild web).
  let pricing = $state<PublicPricing | null>(null)
  const PAYMENT_MODE = $derived((pricing?.mode || 'manual').toLowerCase())
  const PACKAGE_AMOUNT = $derived(pricing?.currentPrice ?? 0)
  const MIDTRANS_CLIENT_KEY = $derived(
    PAYMENT_MODE === 'midtrans' ? (import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string | undefined) : undefined,
  )
  const MIDTRANS_SANDBOX = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION !== 'true'

  let snapScriptLoaded = $state(false)

  onMount(() => {
    getPublicPricing()
      .then((p) => (pricing = p))
      .catch(() => (pricing = { mode: 'manual', currency: 'IDR', currentPrice: 0, isFree: true, normalPrice: null, afterPromoPrice: null, promoActive: false, promoLabel: null, promoEndsAt: null, whatsapp: null }))
  })

  $effect(() => {
    const key = MIDTRANS_CLIENT_KEY
    if (!key || key.includes('YOUR_CLIENT_KEY')) return
    const script = document.createElement('script')
    script.src = MIDTRANS_SANDBOX
      ? 'https://app.sandbox.midtrans.com/snap/snap.js'
      : 'https://app.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', key)
    script.onload = () => {
      snapScriptLoaded = true
      paymentMode = 'snap'
    }
    document.head.appendChild(script)
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  })

  type Props = {
    invitation: OwnerInvitation
    myConfig: WeddingConfig | null
    fmtDate: (ts: string) => string
    onStatusChange: (newStatus: string) => void
  }
  let { invitation, myConfig, fmtDate, onStatusChange }: Props = $props()

  // Payment mode: 'snap' = Midtrans Snap, 'transfer' = manual upload bukti
  // Default transfer manual; beralih ke Snap begitu kunci Midtrans tersedia dari API.
  let paymentMode = $state<'snap' | 'transfer'>('transfer')

  let submittingPayment = $state(false)
  let paymentMsg = $state('')
  let proofFile = $state<File | null>(null)
  let proofFileInput = $state<HTMLInputElement | null>(null)
  let uploadProgress = $state(0)

  // ── Snap (Midtrans) ──────────────────────────────────────────────────────
  async function handleSnapPayment(e: SubmitEvent) {
    e.preventDefault()
    if (!snapScriptLoaded || !(window as any).snap) {
      paymentMsg = 'Sistem pembayaran sedang memuat, coba lagi dalam beberapa detik.'
      return
    }
    submittingPayment = true
    paymentMsg = ''
    try {
      const data = await checkoutPayment()
      ;(window as any).snap.pay(data.token, {
        onSuccess: () => {
           paymentMsg = '✓ Pembayaran diterima. Menunggu verifikasi admin...'
           setTimeout(() => void onStatusChange('pending_verification'), 800)
        },
        onPending: () => {
          paymentMsg = 'Menunggu konfirmasi pembayaran dari bank...'
        },
        onError: () => {
          paymentMsg = 'Pembayaran gagal atau dibatalkan. Silakan coba lagi.'
        },
        onClose: () => {
          submittingPayment = false
        },
      })
    } catch (err) {
      paymentMsg = err instanceof ApiError ? err.message : 'Terjadi kesalahan sistem pembayaran.'
      submittingPayment = false
    }
  }

  // ── Upload Bukti Transfer ────────────────────────────────────────────────
  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    proofFile = input.files?.[0] ?? null
    paymentMsg = ''
    if (proofFile && proofFile.size > 5 * 1024 * 1024) {
      paymentMsg = 'Ukuran file maksimal 5 MB.'
      proofFile = null
      input.value = ''
    }
  }

  async function handleProofUpload(e: SubmitEvent) {
    e.preventDefault()
    if (!proofFile) { paymentMsg = 'Pilih file bukti transfer terlebih dahulu.'; return }
    submittingPayment = true
    paymentMsg = ''
    uploadProgress = 0
    try {
      await uploadPaymentProof(proofFile, (pct) => { uploadProgress = pct })
      paymentMsg = '✓ Bukti transfer berhasil dikirim. Menunggu verifikasi admin...'
      proofFile = null
      if (proofFileInput) proofFileInput.value = ''
      // Notify parent that status likely changed to pending_verification
      onStatusChange('pending_verification')
    } catch (err) {
      paymentMsg = err instanceof ApiError ? err.message : 'Gagal mengunggah bukti transfer.'
    } finally {
      submittingPayment = false
      uploadProgress = 0
    }
  }

  // ── Tako (tako.id): bayar online, undangan aktif otomatis ───────────────────
  const TAKO_METHODS: { id: TakoMethod; label: string; hint: string }[] = [
    { id: 'qris', label: 'QRIS', hint: 'Semua e-wallet & m-banking' },
    { id: 'gopay', label: 'GoPay', hint: 'Aplikasi Gojek' },
    { id: 'dana', label: 'DANA', hint: 'Aplikasi DANA' },
    { id: 'paypal', label: 'PayPal', hint: 'Kartu / luar negeri' },
  ]
  const TAKO_POLL_MS = 5000
  const TAKO_POLL_LIMIT_MS = 20 * 60 * 1000
  const isTako = $derived(PAYMENT_MODE === 'tako' && PACKAGE_AMOUNT > 0 && !invitation.free_plan)
  let takoMethod = $state<TakoMethod>('qris')
  let takoWaiting = $state(false)
  let takoPaymentUrl = $state<string | null>(null)
  let takoTimer: ReturnType<typeof setInterval> | undefined
  let takoPollUntil = 0
  let takoChecked = false

  async function checkTako() {
    try {
      const s = await getTakoPaymentStatus()
      if (s.invitationStatus === 'active') {
        stopTakoPolling()
        takoWaiting = false
        paymentMsg = '✓ Pembayaran berhasil! Undangan kalian sudah aktif.'
        onStatusChange('active')
        return
      }
      const p = s.payment
      if (p && (p.status === 'created' || p.status === 'pending')) {
        takoWaiting = true
        takoPaymentUrl = p.paymentUrl
        if (p.method) takoMethod = p.method
      } else {
        if (takoWaiting && p?.status === 'failed') paymentMsg = 'Gagal: pembayaran gagal atau dibatalkan. Silakan coba lagi.'
        takoWaiting = false
        stopTakoPolling()
      }
    } catch {
      // Gangguan sesaat: coba lagi di putaran berikutnya.
    }
  }

  function startTakoPolling() {
    stopTakoPolling()
    takoPollUntil = Date.now() + TAKO_POLL_LIMIT_MS
    takoTimer = setInterval(() => {
      if (Date.now() > takoPollUntil) return stopTakoPolling()
      if (!document.hidden) void checkTako()
    }, TAKO_POLL_MS)
  }

  function stopTakoPolling() {
    clearInterval(takoTimer)
    takoTimer = undefined
  }

  async function payWithTako() {
    if (submittingPayment) return
    submittingPayment = true
    paymentMsg = ''
    // Tab dibuka saat klik (sebelum await) supaya tidak diblokir popup blocker.
    const win = window.open('', '_blank')
    try {
      const { paymentUrl } = await createTakoPayment(takoMethod)
      takoPaymentUrl = paymentUrl
      takoWaiting = true
      if (win) {
        win.opener = null
        win.location.href = paymentUrl
        startTakoPolling()
      } else {
        location.href = paymentUrl
      }
    } catch (err) {
      win?.close()
      paymentMsg = `Gagal: ${err instanceof ApiError ? err.message : 'tidak dapat membuat pembayaran.'}`
    } finally {
      submittingPayment = false
    }
  }

  // Saat tab Pembayaran dibuka / kembali dari Tako: cek tagihan yang masih terbuka.
  $effect(() => {
    if (!isTako || takoChecked || invitation.status === 'active') return
    takoChecked = true
    void checkTako().then(() => {
      if (takoWaiting || new URLSearchParams(location.search).get('bayar') === 'tako') startTakoPolling()
    })
  })

  onMount(() => {
    const onVisible = () => {
      if (!document.hidden && takoWaiting) void checkTako()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      stopTakoPolling()
    }
  })

  // Gratis: harga Rp0 (mode manual) atau akun yang mendaftar di masa gratis (free_plan).
  const isFreePackage = $derived((PAYMENT_MODE === 'manual' && PACKAGE_AMOUNT === 0) || invitation.free_plan === true)
  const isConfigure = $derived(PAYMENT_MODE !== 'midtrans' || !MIDTRANS_CLIENT_KEY || MIDTRANS_CLIENT_KEY.includes('YOUR_CLIENT_KEY'))
  const formattedPrice = $derived(PACKAGE_AMOUNT === 0 || invitation.free_plan ? 'Gratis' : `Rp ${PACKAGE_AMOUNT.toLocaleString('id-ID')}`)
</script>

<div class="workspace-panel">
  <h3>Pembayaran &amp; Aktivasi Undangan</h3>
  <p class="section-desc">
    Selesaikan pembayaran untuk mengaktifkan domain <strong>{invitation.slug}.marryme.web.id</strong> dan layanan 3D undangan.
  </p>

  <!-- Paket Info -->
  <div class="package-card">
    <div class="package-name">Paket Undangan 3D</div>
    <div class="package-price">{formattedPrice}</div>
    <ul class="package-features">
      <li><Icon name="check" size={16} /> Subdomain eksklusif (slug.marryme.web.id)</li>
      <li><Icon name="check" size={16} /> Dunia 3D interaktif seumur hidup event</li>
      <li><Icon name="check" size={16} /> Galeri foto tak terbatas</li>
      <li><Icon name="check" size={16} /> Buku tamu digital & RSVP</li>
      <li><Icon name="check" size={16} /> QR Code undangan</li>
    </ul>
  </div>

  {#if invitation.status === 'active'}
    <div class="success-box">
      <span class="success-icon"><Icon name="party" size={40} /></span>
      <div>
        <strong>{isFreePackage ? 'Paket Gratis Aktif!' : 'Pembayaran Terverifikasi!'}</strong>
        <p>Undangan pernikahan kalian sudah aktif dan bisa dibagikan ke tamu.</p>
        <p class="muted-text">Aktif sejak: {fmtDate(invitation.activated_at || '')}</p>
      </div>
    </div>

  {:else if invitation.status === 'pending_verification'}
    <div class="pending-box">
      <span><Icon name="clock" size={22} /></span>
      <div>
        <strong>Menunggu Verifikasi Admin</strong>
        <p>Bukti transfer diterima pada {fmtDate(invitation.payment_submitted_at || '')}. Tim admin sedang memproses — biasanya 1×24 jam.</p>
        {#if invitation.payment_proof_url}
          <a href={invitation.payment_proof_url} target="_blank" rel="noreferrer" class="proof-link">
            Lihat bukti transfer yang dikirim →
          </a>
        {/if}
      </div>
    </div>

   {:else if isFreePackage}
     <div class="success-box">
       <span class="success-icon"><Icon name="party" size={40} /></span>
       <div>
         <strong>Paket Undangan 3D Gratis</strong>
         <p>Undangan kalian sudah aktif tanpa pembayaran. Link dapat langsung dibagikan kepada tamu.</p>
       </div>
     </div>

   {:else if isTako}
    <div class="tako-card">
      <h4>Bayar Online</h4>
      <p class="section-desc">Pembayaran diproses oleh Tako (tako.id). Undangan <strong>aktif otomatis</strong> begitu pembayaran berhasil, tanpa unggah bukti transfer.</p>
      <div class="tako-methods" role="radiogroup" aria-label="Metode pembayaran">
        {#each TAKO_METHODS as m (m.id)}
          <button
            type="button"
            role="radio"
            aria-checked={takoMethod === m.id}
            class="tako-method"
            class:active={takoMethod === m.id}
            disabled={takoWaiting || submittingPayment}
            onclick={() => (takoMethod = m.id)}
          >
            <strong>{m.label}</strong>
            <span>{m.hint}</span>
          </button>
        {/each}
      </div>

      {#if takoWaiting}
        <div class="tako-waiting">
          <span class="btn-spinner dark"></span>
          <div>
            <strong>Menunggu pembayaran…</strong>
            <p>Selesaikan pembayaran di halaman Tako. Status di sini diperbarui otomatis.</p>
          </div>
        </div>
        <div class="tako-actions">
          {#if takoPaymentUrl}
            <a class="pay-btn" href={takoPaymentUrl} target="_blank" rel="noopener noreferrer">Buka halaman pembayaran</a>
          {/if}
          <button type="button" class="tako-link" onclick={() => void checkTako()}>Sudah bayar? Cek status</button>
          <button type="button" class="tako-link" onclick={() => { takoWaiting = false; stopTakoPolling(); paymentMsg = '' }}>Ganti metode</button>
        </div>
      {:else}
        <button type="button" class="pay-btn" disabled={submittingPayment} onclick={payWithTako}>
          {#if submittingPayment}
            <span class="btn-spinner"></span> Membuat tagihan...
          {:else}
            Bayar {formattedPrice} dengan {TAKO_METHODS.find((m) => m.id === takoMethod)?.label}
          {/if}
        </button>
      {/if}
      <p class="tako-note">Ada kendala pembayaran? Hubungi admin lewat tombol chat di kanan bawah.</p>
    </div>

    {#if paymentMsg}
      <p class="payment-msg" class:success-msg={paymentMsg.startsWith('✓')} class:error-msg={paymentMsg.startsWith('Gagal')}>{paymentMsg}</p>
    {/if}

   {:else}
    <!-- Payment Mode Selector -->
    {#if !isConfigure}
      <div class="payment-mode-tabs">
        <button
          type="button"
          class="mode-tab"
          class:active={paymentMode === 'snap'}
          onclick={() => { paymentMode = 'snap'; paymentMsg = '' }}
        >
          <Icon name="payment" size={17} /> Bayar Online (Kartu/VA/GoPay)
        </button>
        <button
          type="button"
          class="mode-tab"
          class:active={paymentMode === 'transfer'}
          onclick={() => { paymentMode = 'transfer'; paymentMsg = '' }}
        >
          <Icon name="bank" size={17} /> Transfer Manual
        </button>
      </div>
    {/if}

    <!-- Snap Payment -->
    {#if paymentMode === 'snap' && !isConfigure}
      <form onsubmit={handleSnapPayment} class="payment-form">
        <p class="section-desc">Bayar langsung via Midtrans — kartu kredit, transfer bank virtual, GoPay, QRIS, dll.</p>
        <button
          type="submit"
          class="pay-btn"
          disabled={submittingPayment || !snapScriptLoaded}
        >
          {#if submittingPayment}
            <span class="btn-spinner"></span> Membuka halaman pembayaran...
          {:else if !snapScriptLoaded}
            Memuat sistem pembayaran...
          {:else}
            Bayar Sekarang — {formattedPrice}
          {/if}
        </button>
      </form>

    <!-- Manual Transfer Upload -->
    {:else}
       {#if PACKAGE_AMOUNT > 0}
       <div class="bank-info-card">
        <div class="bank-row">
          <span class="bank-label">Bank</span>
          <strong>BCA</strong>
        </div>
        <div class="bank-row">
          <span class="bank-label">No. Rekening</span>
          <code class="bank-account">1234 5678 90</code>
        </div>
        <div class="bank-row">
          <span class="bank-label">Atas Nama</span>
          <strong>MarryMe Official</strong>
        </div>
        <div class="bank-row">
          <span class="bank-label">Jumlah</span>
           <strong class="amount">{formattedPrice}</strong>
        </div>
       </div>
       {/if}

       <form class="proof-upload-form" onsubmit={handleProofUpload}>
         <h4>{PACKAGE_AMOUNT > 0 ? 'Upload Bukti Transfer' : 'Kirim Konfirmasi Manual'}</h4>
        <p class="section-desc">{PACKAGE_AMOUNT === 0 ? 'Upload konfirmasi untuk mengaktifkan undangan secara manual.' : 'Setelah transfer, upload foto/screenshot bukti pembayaran.'} Format: JPG, PNG, WebP (maks 5 MB). Link publik baru aktif setelah admin memverifikasi.</p>

        <label class="file-drop-area" class:has-file={proofFile !== null}>
          {#if proofFile}
            <span class="file-selected"><Icon name="paperclip" size={15} /> {proofFile.name}</span>
            <span class="file-size">{(proofFile.size / 1024).toFixed(0)} KB</span>
          {:else}
            <span class="upload-icon"><Icon name="camera" size={30} /></span>
            <span>Klik atau seret foto bukti transfer ke sini</span>
          {/if}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            bind:this={proofFileInput}
            onchange={onFileChange}
          />
        </label>

        {#if uploadProgress > 0 && uploadProgress < 100}
          <div class="upload-progress-bar">
            <div class="upload-progress-fill" style="width: {uploadProgress}%"></div>
          </div>
        {/if}

        <div class="form-save-footer mt-16">
          <button type="submit" class="pay-btn" disabled={submittingPayment || !proofFile}>
            {submittingPayment ? 'Mengunggah...' : 'Kirim Bukti Transfer'}
          </button>
        </div>
      </form>
    {/if}

    {#if paymentMsg}
      <p
        class="payment-msg"
        class:success-msg={paymentMsg.startsWith('✓')}
        class:error-msg={paymentMsg.startsWith('Gagal') || paymentMsg.startsWith('Terjadi') || paymentMsg.startsWith('Pilih') || paymentMsg.startsWith('Ukuran')}
      >
        {paymentMsg}
      </p>
    {/if}
  {/if}
</div>

<style>
  .package-card {
    margin: 20px 0;
    padding: 20px 24px;
    border: 1px solid rgba(169, 118, 37, 0.3);
    border-radius: 12px;
    background: linear-gradient(135deg, #fffdf8, #fdf4e3);
  }
  .package-name {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #a97625;
    margin-bottom: 4px;
  }
  .package-price {
    font-size: 1.75rem;
    font-weight: 700;
    color: #292321;
    letter-spacing: -0.02em;
    margin-bottom: 12px;
  }
  .package-features {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
  }
  .package-features li {
    font-size: 0.85rem;
    color: #554b47;
  }

  .success-box {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 20px;
    border-radius: 12px;
    background: #f0faf4;
    border: 1px solid #b7dfca;
    color: #1a5c3a;
    margin-top: 16px;
  }
  .success-icon { font-size: 1.6rem; }
  .success-box strong { display: block; font-size: 1rem; margin-bottom: 4px; }
  .muted-text { font-size: 0.8rem; color: #4a7a60; margin-top: 4px; }

  .pending-box {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 20px;
    border-radius: 12px;
    background: #fffbf0;
    border: 1px solid #e8d08a;
    color: #6b4e0a;
    margin-top: 16px;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .pending-box span { font-size: 1.5rem; }
  .pending-box strong { display: block; margin-bottom: 6px; }
  .proof-link {
    display: inline-block;
    margin-top: 8px;
    font-size: 0.8rem;
    color: #8f6b15;
    text-decoration: underline;
  }

  .payment-mode-tabs {
    display: flex;
    gap: 8px;
    margin: 20px 0 16px;
  }
  .mode-tab {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #eadbd6;
    border-radius: 8px;
    background: #fff;
    color: #706662;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;
  }
  .mode-tab.active {
    border-color: #8f1d45;
    background: #fdf0f3;
    color: #8f1d45;
  }

  .bank-info-card {
    margin: 16px 0;
    padding: 16px 20px;
    border: 1px solid #eadbd6;
    border-radius: 10px;
    background: #fffdfb;
    display: grid;
    gap: 10px;
  }
  .bank-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.88rem;
  }
  .bank-label { color: #706662; }
  .bank-account {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 1rem;
    letter-spacing: 0.06em;
  }
  .amount { color: #8f1d45; font-size: 1.05rem; }

  .file-drop-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 12px 0;
    padding: 28px 20px;
    border: 2px dashed #eadbd6;
    border-radius: 10px;
    background: #fffdfb;
    cursor: pointer;
    text-align: center;
    font-size: 0.875rem;
    color: #706662;
    transition: border-color 0.15s, background 0.15s;
  }
  .file-drop-area.has-file {
    border-color: #8f1d45;
    border-style: solid;
    background: #fdf0f3;
    color: #8f1d45;
  }
  .file-drop-area input { display: none; }
  .upload-icon { font-size: 1.8rem; }
  .file-selected { font-weight: 600; }
  .file-size { font-size: 0.75rem; color: #a97625; }

  .upload-progress-bar {
    height: 4px;
    border-radius: 2px;
    background: #eadbd6;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .upload-progress-fill {
    height: 100%;
    background: #8f1d45;
    border-radius: 2px;
    transition: width 0.2s ease;
  }

  .pay-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 50px;
    padding: 14px 20px;
    border: none;
    border-radius: 10px;
    background: #8f1d45;
    color: white;
    font: 700 0.95rem/1 'Outfit', sans-serif;
    cursor: pointer;
    box-shadow: 0 12px 28px -16px rgba(143, 29, 69, 0.8);
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .pay-btn:hover:not(:disabled) {
    background: #761638;
    transform: translateY(-1px);
    box-shadow: 0 16px 32px -14px rgba(143, 29, 69, 0.85);
  }
  .pay-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 700ms linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .payment-msg {
    margin-top: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    line-height: 1.45;
    background: #f8f4f0;
    color: #554b47;
  }
  .payment-msg.success-msg { background: #f0faf4; color: #1a5c3a; }
  .payment-msg.error-msg { background: #fff4f6; color: #8f1d45; }

  .payment-form { margin-top: 12px; }
  .proof-upload-form h4 {
    margin: 20px 0 4px;
    font-size: 0.9rem;
    color: #292321;
  }
  .form-save-footer.mt-16 { margin-top: 16px; }
  .tako-card {
    margin-top: 8px;
    padding: 20px;
    border: 1px solid #eadbd6;
    border-radius: 14px;
    background: #fffdfb;
  }
  .tako-card h4 {
    margin: 0 0 4px;
    font-size: 1rem;
    color: #292321;
  }
  .tako-methods {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 10px;
    margin: 14px 0 16px;
  }
  .tako-method {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 12px 14px;
    border: 2px solid #eadbd6;
    border-radius: 12px;
    background: white;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tako-method strong { font-size: 0.95rem; color: #292321; }
  .tako-method span { font-size: 0.75rem; color: #8a7d78; }
  .tako-method.active { border-color: #8f1d45; box-shadow: 0 6px 18px -10px rgba(143, 29, 69, 0.55); }
  .tako-method:disabled { cursor: default; opacity: 0.7; }
  .tako-method.active:disabled { opacity: 1; }
  .tako-waiting {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    margin-bottom: 12px;
    border-radius: 12px;
    background: #fff8ec;
    color: #6b4e16;
  }
  .tako-waiting strong { display: block; font-size: 0.9rem; }
  .tako-waiting p { margin: 2px 0 0; font-size: 0.8rem; }
  .btn-spinner.dark { border-color: rgba(107, 78, 22, 0.25); border-top-color: #6b4e16; flex-shrink: 0; margin-top: 2px; }
  .tako-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }
  .tako-actions .pay-btn { text-decoration: none; }
  .tako-link {
    padding: 4px 0;
    background: none;
    border: none;
    color: #8f1d45;
    font-weight: 600;
    font-size: 0.85rem;
    text-decoration: underline;
    cursor: pointer;
  }
  .tako-note {
    margin: 14px 0 0;
    font-size: 0.78rem;
    color: #8a7d78;
  }
</style>
