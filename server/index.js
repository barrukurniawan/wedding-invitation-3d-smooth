import express from 'express'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import helmet from 'helmet'
dotenv.config()

import guestbookRoutes from './routes/guestbook.js'
import configRoutes from './routes/config.js'
import adminRoutes from './routes/admin.js'
import pool from './db.js'

const app = express()
const PORT = process.env.PORT || 3001

app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(express.json({ limit: '64kb' }))
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/guestbook', guestbookRoutes)
app.use('/api/config', configRoutes)
app.use('/api/admin', adminRoutes)

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server.' } })
})

async function start() {
  await pool.query('SELECT 1')
  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Wedding API running on http://127.0.0.1:${PORT}`)
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
