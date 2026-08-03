const fs = require('fs')

let code = fs.readFileSync('src/lib/components/platform/dashboard/PaymentManager.svelte', 'utf8')

code = code.replace(
  `import { ApiError } from '$lib/api-client'`,
  `import { ApiError, checkoutPayment } from '$lib/api-client'`
)

code = code.replace(
  `const res = await fetch('/api/my/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': (window as any).csrfToken || '' // Should be retrieved correctly
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Gagal membuat transaksi')`,
  `const data = await checkoutPayment()`
)

fs.writeFileSync('src/lib/components/platform/dashboard/PaymentManager.svelte', code)
console.log('Patched PaymentManager.svelte part 2 successfully!')
