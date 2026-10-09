import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import pool from '../db.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { afterSchema, insertMessage, listMessages, markRead, messageSchema, notMigrated } from '../services/support.js'

// Chat bantuan dari sisi pemilik akun. user_id selalu dari sesi, jadi hanya percakapan sendiri.
const router = Router()
const sendLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `support:${req.user.id}`,
  message: { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak pesan. Coba lagi sebentar lagi.' } },
})

function invalid(res, error) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Data tidak valid.' } })
}

async function unreadCount(userId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM support_messages WHERE user_id = ? AND sender = 'admin' AND read_at IS NULL",
    [userId],
  )
  return Number(rows[0]?.n || 0)
}

router.get('/unread', requireUser, async (req, res, next) => {
  try {
    res.json({ unread: await unreadCount(req.user.id) })
  } catch (error) {
    if (!notMigrated(res, error)) next(error)
  }
})

// markRead=1 dikirim saat panel chat terbuka: balasan admin dianggap sudah dibaca.
router.get('/messages', requireUser, async (req, res, next) => {
  const parsed = afterSchema.safeParse(req.query)
  if (!parsed.success) return invalid(res, parsed.error)
  try {
    if (req.query.markRead === '1') await markRead(req.user.id, 'admin')
    const messages = await listMessages(req.user.id, parsed.data.after)
    res.json({ messages, unread: await unreadCount(req.user.id) })
  } catch (error) {
    if (!notMigrated(res, error)) next(error)
  }
})

router.post('/messages', requireUser, requireCsrf, sendLimit, async (req, res, next) => {
  const parsed = messageSchema.safeParse(req.body)
  if (!parsed.success) return invalid(res, parsed.error)
  try {
    const message = await insertMessage(req.user.id, 'user', parsed.data.body, parsed.data.context || null)
    res.status(201).json({ message })
  } catch (error) {
    if (!notMigrated(res, error)) next(error)
  }
})

export default router
