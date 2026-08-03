<script lang="ts">
  import type { OwnerInvitation, WeddingConfig } from '$lib/api-client'
  import { ApiError, checkoutPayment } from '$lib/api-client'
  import { onMount } from 'svelte'

  let snapScriptLoaded = $state(false)

  onMount(() => {
    const clientKey = 'SB-Mid-client-YOUR_CLIENT_KEY'
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)
    script.onload = () => { snapScriptLoaded = true }
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  })

  type Props = {
    invitation: OwnerInvitation
    myConfig: WeddingConfig | null
    fmtDate: (ts: string) => string
    onPaymentSuccess: (newInvitation: OwnerInvitation) => void
  }
  let { invitation, myConfig, fmtDate, onPaymentSuccess }: Props = $props()

  let submittingPayment = $state(false)
  let paymentMsg = $state('')
  let proofFileInput = $state<HTMLInputElement | null>(null)

  async function handlePaymentSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!snapScriptLoaded || !(window as any).snap) {
      paymentMsg = 'Sistem pembayaran sedang memuat, silakan tunggu sebentar.'
      return
    }
    submittingPayment = true
    paymentMsg = ''
    try {
      const data = await checkoutPayment()

      // 2. Buka pop-up Snap Midtrans
      ;(window as any).snap.pay(data.token, {
        onSuccess: function(result: any){
          setTimeout(() => window.location.reload(), 1500)
        },
        onPending: function(result: any){
          paymentMsg = 'Menunggu pembayaran diselesaikan.'
        },
        onError: function(result: any){
          paymentMsg = 'Pembayaran gagal atau dibatalkan.'
        },
        onClose: function(){
          // User closed the popup
        }
      })
    } catch (err) {
      paymentMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem pembayaran.'
    } finally {
      submittingPayment = false
    }
  }
</script>

<div class="workspace-panel">
  <h3>Informasi Paket &amp; Pembayaran Subdomain</h3>
  <p class="section-desc">Selesaikan pembayaran untuk mengaktifkan penuh domain &amp; layanan 3D undangan pernikahan kalian.</p>

  <div class="bank-info-card">
    <div class="bank-details">
      <p class="bank-name">Bank Transfer: <strong>{myConfig?.bank_name || 'BCA'}</strong></p>
      <p class="bank-account">No. Rekening: <code>{myConfig?.bank_account || '1234567890'}</code></p>
      <p class="bank-holder">Atas Nama: <strong>{myConfig?.bank_holder || 'MarryMe Official'}</strong></p>
    </div>
    {#if myConfig?.qris_image}
      <div class="qris-box">
        <img src={myConfig.qris_image} alt="QRIS Pembayaran" />
      </div>
    {/if}
  </div>

  {#if invitation.status === 'active'}
    <div class="success-box">
      <p>✓ Pembayaran telah diverifikasi dan undangan kalian sudah <strong>Aktif</strong>!</p>
    </div>
  {:else}
    <form class="proof-upload-form" onsubmit={handlePaymentSubmit}>
      <h4>Unggah Bukti Transfer</h4>
      <p class="section-desc">Format gambar yang didukung: JPG, PNG, WebP (Maksimal 5MB)</p>

      <label class="file-drop-area">
        <span>📷 Pilih File Gambar Bukti Transfer</span>
        <input
          type="file"
          accept="image/*"
          bind:this={proofFileInput}
          required
        />
      </label>

      {#if invitation.payment_proof_url}
        <div class="submitted-proof-preview">
          <p class="section-desc">Bukti transfer terkirim ({fmtDate(invitation.payment_submitted_at || '')}):</p>
          <a href={invitation.payment_proof_url} target="_blank" rel="noreferrer">
            <img src={invitation.payment_proof_url} alt="Bukti Transfer" class="proof-img" />
          </a>
        </div>
      {/if}

      <div class="form-save-footer mt-16">
        <button type="submit" class="primary-btn-lg" disabled={submittingPayment}>
          {submittingPayment ? 'Mengunggah...' : 'Kirim Bukti Transfer'}
        </button>
        {#if paymentMsg}
          <span class="save-msg" class:error-msg={paymentMsg.startsWith('Gagal') || paymentMsg.startsWith('Silakan')}>
            {paymentMsg}
          </span>
        {/if}
      </div>
    </form>
  {/if}
</div>
