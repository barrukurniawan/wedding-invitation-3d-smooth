const fs = require('fs')

let code = fs.readFileSync('src/lib/components/platform/dashboard/PaymentManager.svelte', 'utf8')

// Add script inject logic for Midtrans and change API logic
code = code.replace(
  `import { ApiError, submitPayment } from '$lib/api-client'`,
  `import { ApiError } from '$lib/api-client'\n  import { onMount } from 'svelte'\n\n  let snapScriptLoaded = $state(false)\n\n  onMount(() => {\n    const clientKey = 'SB-Mid-client-YOUR_CLIENT_KEY'\n    const script = document.createElement('script')\n    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'\n    script.setAttribute('data-client-key', clientKey)\n    script.onload = () => { snapScriptLoaded = true }\n    document.head.appendChild(script)\n    return () => {\n      document.head.removeChild(script)\n    }\n  })`
)

code = code.replace(
  `async function handlePaymentSubmit(e: SubmitEvent) {[\s\S]*?finally \{\n      submittingPayment = false\n    \}\n  \}`,
  `async function handlePaymentSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!snapScriptLoaded || !(window as any).snap) {
      paymentMsg = 'Sistem pembayaran sedang memuat, silakan tunggu sebentar.'
      return
    }
    submittingPayment = true
    paymentMsg = ''
    try {
      // 1. Panggil backend untuk buat transaksi
      const res = await fetch('/api/my/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': (window as any).csrfToken || '' // Should be retrieved correctly
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Gagal membuat transaksi')

      // 2. Buka pop-up Snap Midtrans
      ;(window as any).snap.pay(data.token, {
        onSuccess: function(result: any){
          // Payment is successful, backend webhook will set status to active.
          // Wait briefly, then reload or call API to get latest state
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
  }`
)

code = code.replace(
  `<h4>Unggah Bukti Transfer</h4>[\s\S]*?</div>\n      {/if}`,
  `<h4>Pilih Metode Pembayaran</h4>
      <p class="section-desc">Pilih "Bayar Sekarang" untuk membayar langsung via QRIS, GoPay, BCA Virtual Account, atau metode otomatis lainnya. Undangan akan otomatis aktif setelah pembayaran sukses.</p>`
)

code = code.replace(
  `{submittingPayment ? 'Mengirim...' : '📤 Kirim Bukti Transfer'}`,
  `{submittingPayment ? 'Memproses...' : '💳 Bayar Sekarang'}`
)

fs.writeFileSync('src/lib/components/platform/dashboard/PaymentManager.svelte', code)
console.log('Patched PaymentManager.svelte successfully!')
