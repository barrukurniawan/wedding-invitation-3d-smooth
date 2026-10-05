import express from 'express'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import helmet from 'helmet'
dotenv.config()

import path from 'node:path'
import guestbookRoutes from './routes/guestbook.js'
import configRoutes from './routes/config.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import invitationRoutes from './routes/invitations.js'
import tenantConfigRoutes from './routes/tenant-config.js'
import tenantPaymentRoutes from './routes/tenant-payment.js'
import midtransWebhookRoutes from './routes/midtrans-webhook.js'
import uploadRoutes, { servePublicMusic, servePublicPhoto } from './routes/upload.js'
import contactRoutes from './routes/contacts.js'
import trackRoutes from './routes/track.js'
import multiplayerRoutes from './routes/multiplayer.js'
import pool from './db.js'
import { attachHostContext, requirePublicInvitation, requireRootHost } from './middleware/tenant.js'

const app = express()
const PORT = process.env.PORT || 3001

app.disable('x-powered-by')
if (process.env.TRUST_PROXY) {
  const trustProxy = /^\d+$/.test(process.env.TRUST_PROXY)
    ? Number(process.env.TRUST_PROXY)
    : process.env.TRUST_PROXY
  app.set('trust proxy', trustProxy)
}
// nginx already sets HSTS, CSP frame-ancestors, and Referrer-Policy — disable those
// in helmet to prevent duplicate headers reaching the browser.
app.use(helmet({
  crossOriginResourcePolicy: false,
  strictTransportSecurity: false,
  contentSecurityPolicy: false,
  referrerPolicy: false,
}))
app.use(express.json({ limit: '64kb' }))
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})



app.use('/api', attachHostContext)
app.use('/api/track', trackRoutes)
app.get('/api/public/photos/:filename', servePublicPhoto)
app.get('/api/my/photos/:filename', servePublicPhoto)
app.get('/api/public/music/:filename', servePublicMusic)
app.use('/api/guestbook', requirePublicInvitation, guestbookRoutes)
app.use('/api/config', requirePublicInvitation, configRoutes)
app.use('/api/auth', requireRootHost, authRoutes)
app.use('/api/invitations', requireRootHost, invitationRoutes)
app.use('/api/my', requireRootHost, tenantConfigRoutes)
app.use('/api/my', requireRootHost, tenantPaymentRoutes)
app.use('/api/my', requireRootHost, uploadRoutes)
app.use('/api/my/contacts', requireRootHost, contactRoutes)
app.use('/api/payment', midtransWebhookRoutes)
app.use('/api/admin', requireRootHost, adminRoutes)
app.use('/api/multiplayer', multiplayerRoutes)
app.use('/api', multiplayerRoutes)

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err)
  if (err?.code === 'INVALID_STATUS_TRANSITION') {
    return res.status(409).json({ error: { code: err.code, message: err.message } })
  }
  if (err?.code === 'INVITATION_NOT_FOUND') {
    return res.status(404).json({ error: { code: err.code, message: err.message } })
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server.' } })
})

async function waitForDb(retries = process.env.NODE_ENV === 'production' ? 10 : 2, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1')
      console.log('Database connection established.')
      return
    } catch (err) {
      console.warn(`DB not ready (attempt ${attempt}/${retries}): ${err.message}`)
      if (attempt === retries) {
        if (process.env.NODE_ENV === 'production') {
          throw err
        }
        console.warn('⚠️ Development mode: Database offline, running in-memory fallback for multiplayer.')
        return
      }
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

async function start() {
  await waitForDb()
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wedding API running on http://0.0.0.0:${PORT}`)
  })

  const shutdown = async () => {
    server.close(async () => {
      await pool.end()
      process.exit(0)
    })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error('Unable to start Wedding API:', error.message)
  process.exit(1)
})
