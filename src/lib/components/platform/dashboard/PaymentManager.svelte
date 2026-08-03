<script lang="ts">
  import type { OwnerInvitation, WeddingConfig } from '$lib/api-client'
  import { ApiError, checkoutPayment, uploadPaymentProof } from '$lib/api-client'
  import { onMount } from 'svelte'

  const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string | undefined
  const MIDTRANS_SANDBOX = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION !== 'true'

  let snapScriptLoaded = $state(false)

  onMount(() => {
    if (!MIDTRANS_CLIENT_KEY || MIDTRANS_CLIENT_KEY.includes('YOUR_CLIENT_KEY')) return
    const script = document.createElement('script')
    script.src = MIDTRANS_SANDBOX
      ? 'https://app.sandbox.midtrans.com/snap/snap.js'
      : 'https://app.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY)
    script.onload = () => { snapScriptLoaded = true }
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
  let paymentMode = $state<'snap' | 'transfer'>(
    MIDTRANS_CLIENT_KEY && !MIDTRANS_CLIENT_KEY.includes('YOUR_CLIENT_KEY') ? 'snap' : 'transfer'
  )

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
          paymentMsg = '✓ Pembayaran berhasil! Halaman akan diperbarui...'
          setTimeout(() => window.location.reload(), 1800)
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

  const isConfigure = !MIDTRANS_CLIENT_KEY || MIDTRANS_CLIENT_KEY.includes('YOUR_CLIENT_KEY')
</script>

<div class="workspace-panel">
  <h3>Pembayaran &amp; Aktivasi Undangan</h3>
  <p class="section-desc">
    Selesaikan pembayaran untuk mengaktifkan domain <strong>{invitation.slug}.marryme.web.id</strong> dan layanan 3D undangan.
  </p>

  <!-- Paket Info -->
  <div class="package-card">
    <div class="package-name">Paket Undangan 3D</div>
    <div class="package-price">Rp 150.000</div>
    <ul class="package-features">
      <li>✓ Subdomain eksklusif (slug.marryme.web.id)</li>
      <li>✓ Dunia 3D interaktif seumur hidup event</li>
      <li>✓ Galeri foto tak terbatas</li>
      <li>✓ Buku tamu digital & RSVP</li>
      <li>✓ QR Code undangan</li>
    </ul>
  </div>

  {#if invitation.status === 'active'}
    <div class="success-box">
      <span class="success-icon">🎉</span>
      <div>
        <strong>Pembayaran Terverifikasi!</strong>
        <p>Undangan pernikahan kalian sudah aktif dan bisa diakses publik.</p>
        <p class="muted-text">Aktif sejak: {fmtDate(invitation.activated_at || '')}</p>
      </div>
    </div>

  {:else if invitation.status === 'pending_verification'}
    <div class="pending-box">
      <span>⏳</span>
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
          💳 Bayar Online (Kartu/VA/GoPay)
        </button>
        <button
          type="button"
          class="mode-tab"
          class:active={paymentMode === 'transfer'}
          onclick={() => { paymentMode = 'transfer'; paymentMsg = '' }}
        >
          🏦 Transfer Manual
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
            Bayar Sekarang — Rp 150.000
          {/if}
        </button>
      </form>

    <!-- Manual Transfer Upload -->
    {:else}
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
          <strong class="amount">Rp 150.000</strong>
        </div>
      </div>

      <form class="proof-upload-form" onsubmit={handleProofUpload}>
        <h4>Upload Bukti Transfer</h4>
        <p class="section-desc">Setelah transfer, upload foto/screenshot bukti pembayaran. Format: JPG, PNG, WebP (maks 5 MB)</p>

        <label class="file-drop-area" class:has-file={proofFile !== null}>
          {#if proofFile}
            <span class="file-selected">📎 {proofFile.name}</span>
            <span class="file-size">{(proofFile.size / 1024).toFixed(0)} KB</span>
          {:else}
            <span class="upload-icon">📷</span>
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
</style>
