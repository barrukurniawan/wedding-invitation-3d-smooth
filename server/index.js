import express from 'express'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import helmet from 'helmet'
dotenv.config()

import guestbookRoutes from './routes/guestbook.js'
import configRoutes from './routes/config.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import invitationRoutes from './routes/invitations.js'
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
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(express.json({ limit: '64kb' }))
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', attachHostContext)
app.use('/api/guestbook', requirePublicInvitation, guestbookRoutes)
app.use('/api/config', requirePublicInvitation, configRoutes)
app.use('/api/auth', requireRootHost, authRoutes)
app.use('/api/invitations', requireRootHost, invitationRoutes)
app.use('/api/admin', requireRootHost, adminRoutes)

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server.' } })
})

async function start() {
  await pool.query('SELECT 1')
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
