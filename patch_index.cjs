const fs = require('fs')

let code = fs.readFileSync('server/index.js', 'utf8')

code = code.replace(
  `import tenantPaymentRoutes from './routes/tenant-payment.js'`,
  `import tenantPaymentRoutes from './routes/tenant-payment.js'\nimport midtransWebhookRoutes from './routes/midtrans-webhook.js'`
)

code = code.replace(
  `app.use('/api/my', requireRootHost, tenantPaymentRoutes)`,
  `app.use('/api/my', requireRootHost, tenantPaymentRoutes)\napp.use('/api/payment', midtransWebhookRoutes)`
)

fs.writeFileSync('server/index.js', code)
console.log('Patched index.js successfully!')
