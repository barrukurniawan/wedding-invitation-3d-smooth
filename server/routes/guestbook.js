import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import pool from '../db.js'

const router = Router()

const submitLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false })
const entrySchema = z.object({
  name: z.string().trim().min(1).max(255),
  attendance: z.enum(['Hadir', 'Ragu-ragu', 'Tidak Hadir']),
  message: z.string().trim().min(1).max(2000),
}).strict()

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, attendance, message, created_at
       FROM guestbook_entries
       WHERE invitation_id = ? AND status = 'visible'
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [req.invitation.id],
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /api/guestbook error:', err.message)
    res.status(500).json({ error: 'Database error' })
  }
})

router.post('/', submitLimit, async (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Data buku tamu tidak valid.' } })
  try {
    const { name, attendance, message } = parsed.data
    const id = randomUUID()
    await pool.query(
      `INSERT INTO guestbook_entries (id, invitation_id, name, attendance, message, status)
       VALUES (?, ?, ?, ?, ?, 'visible')`,
      [id, req.invitation.id, name, attendance, message]
    )
    const [rows] = await pool.query(
      `SELECT id, name, attendance, message, created_at
       FROM guestbook_entries WHERE id = ? AND invitation_id = ?`,
      [id, req.invitation.id],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('POST /api/guestbook error:', err.message)
    res.status(500).json({ error: { code: 'DATABASE_ERROR', message: 'Ucapan tidak dapat disimpan.' } })
  }
})

export default router
