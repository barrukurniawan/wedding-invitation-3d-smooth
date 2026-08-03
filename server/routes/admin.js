import { Router } from 'express'
import bcrypt from 'bcrypt'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import pool from '../db.js'
import { COOKIE_NAME, cookieOptions, createSession, deleteSession, hashSessionToken, requireAdmin } from '../auth.js'

const router = Router()
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false })
const text = (max) => z.string().trim().max(max)
const weddingDate = z.string().trim().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/,
  'Tanggal pernikahan tidak valid.',
)
const configSchema = z.object({
  bride_name: text(255), groom_name: text(255), bride_parents: text(255), groom_parents: text(255),
  wedding_photo: text(2048), wedding_date: weddingDate,
  akad_date: text(255), akad_time: text(255), akad_location: text(255),
  resepsi_date: text(255), resepsi_time: text(255), resepsi_location: text(255),
  qris_image: text(2048), bank_name: text(100), bank_account: text(100), bank_holder: text(255),
  maps_url: text(2048), venue_address: text(2000), quote: text(2000),
  gallery_photos: z.array(text(2048)).max(30),
}).partial().strict()

function invalid(res, error) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues?.[0]?.message || 'Data tidak valid.' } })
}

function serializeConfig(config) {
  config.id = Number(config.id)
  config.gallery_photos = typeof config.gallery_photos === 'string' ? JSON.parse(config.gallery_photos) : config.gallery_photos
  config.wedding_date = config.wedding_date.replace(' ', 'T')
  return config
}

router.post('/session', loginLimit, async (req, res, next) => {
  const parsed = z.object({ username: text(64).min(1), password: z.string().min(1).max(256) }).safeParse(req.body)
  if (!parsed.success) return invalid(res, parsed.error)
  try {
    const [rows] = await pool.query('SELECT id, username, password_hash FROM admin_users WHERE username = ?', [parsed.data.username])
    const user = rows[0]
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Username atau password salah.' } })
    }
    const token = await createSession(user.id)
    res.cookie(COOKIE_NAME, token, cookieOptions()).status(204).end()
  } catch (error) {
    next(error)
  }
})

router.get('/session', requireAdmin, (req, res) => {
  res.json({ authenticated: true, user: req.admin })
})

router.delete('/session', requireAdmin, async (req, res, next) => {
  try {
    await deleteSession(req.cookies[COOKIE_NAME])
    res.clearCookie(COOKIE_NAME, cookieOptions()).status(204).end()
  } catch (error) {
    next(error)
  }
})

router.get('/config', requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT invitation_id AS id, wedding_configs.* FROM wedding_configs WHERE invitation_id = 1')
    if (!rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Konfigurasi belum tersedia.' } })
    res.json(serializeConfig(rows[0]))
  } catch (error) {
    next(error)
  }
})

router.put('/config', requireAdmin, async (req, res, next) => {
  const parsed = configSchema.safeParse(req.body)
  if (!parsed.success) return invalid(res, parsed.error)
  const data = parsed.data
  const fields = Object.keys(data)
  if (fields.length === 0) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Tidak ada perubahan.' } })
  try {
    const values = fields.map((field) => {
      if (field === 'gallery_photos') return JSON.stringify(data[field])
      if (field === 'wedding_date') return data[field].slice(0, 19).replace('T', ' ')
      return data[field]
    })
    await pool.query(`UPDATE wedding_configs SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE invitation_id = 1`, values)
    const [rows] = await pool.query('SELECT invitation_id AS id, wedding_configs.* FROM wedding_configs WHERE invitation_id = 1')
    res.json(serializeConfig(rows[0]))
  } catch (error) {
    next(error)
  }
})

router.get('/guestbook', requireAdmin, async (req, res, next) => {
  const parsed = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }).safeParse(req.query)
  if (!parsed.success) return invalid(res, parsed.error)
  const { page, limit } = parsed.data
  try {
    const [[count], [items]] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM guestbook_entries WHERE invitation_id = 1 AND status <> 'deleted'"),
      pool.query("SELECT id, name, attendance, message, created_at FROM guestbook_entries WHERE invitation_id = 1 AND status <> 'deleted' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [limit, (page - 1) * limit]),
    ])
    res.json({ items, page, limit, total: count.total })
  } catch (error) {
    next(error)
  }
})

router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(attendance = 'Hadir'), 0) AS hadir,
        COALESCE(SUM(attendance = 'Ragu-ragu'), 0) AS ragu,
        COALESCE(SUM(attendance = 'Tidak Hadir'), 0) AS tidakHadir
       FROM guestbook_entries
       WHERE invitation_id = 1 AND status <> 'deleted'`,
    )
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
})

router.delete('/guestbook/:id', requireAdmin, async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'ID buku tamu tidak valid.' } })
  try {
    const [result] = await pool.query('DELETE FROM guestbook_entries WHERE id = ? AND invitation_id = 1', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ucapan tidak ditemukan.' } })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

router.post('/password', requireAdmin, async (req, res, next) => {
  const parsed = z.object({ currentPassword: z.string().min(1).max(256), newPassword: z.string().min(12).max(256) }).safeParse(req.body)
  if (!parsed.success) return invalid(res, parsed.error)
  try {
    const [rows] = await pool.query('SELECT password_hash FROM admin_users WHERE id = ?', [req.admin.id])
    if (!(await bcrypt.compare(parsed.data.currentPassword, rows[0].password_hash))) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Password saat ini salah.' } })
    }
    const hash = await bcrypt.hash(parsed.data.newPassword, 12)
    await pool.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, req.admin.id])
    await pool.query('DELETE FROM admin_sessions WHERE user_id = ? AND token_hash <> ?', [req.admin.id, hashSessionToken(req.cookies[COOKIE_NAME])])
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

router.get('/invitations', requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.slug, i.status, i.payment_proof_url, i.payment_submitted_at,
              i.created_at, i.activated_at,
              c.bride_name, c.groom_name,
              u.email AS user_email, u.display_name AS user_display_name
       FROM invitations i
       LEFT JOIN wedding_configs c ON c.invitation_id = i.id
       LEFT JOIN users u ON u.id = i.owner_user_id
       WHERE i.deleted_at IS NULL
       ORDER BY (i.status = 'pending_verification') DESC, i.payment_submitted_at DESC, i.id DESC`,
    )
    const items = rows.map((r) => ({
      id: Number(r.id),
      slug: r.slug,
      status: r.status,
      payment_proof_url: r.payment_proof_url || null,
      payment_submitted_at: r.payment_submitted_at ? String(r.payment_submitted_at).replace(' ', 'T') : null,
      created_at: String(r.created_at).replace(' ', 'T'),
      activated_at: r.activated_at ? String(r.activated_at).replace(' ', 'T') : null,
      bride_name: r.bride_name || null,
      groom_name: r.groom_name || null,
      user_email: r.user_email || null,
      user_display_name: r.user_display_name || null,
    }))
    res.json(items)
  } catch (error) {
    next(error)
  }
})

router.get('/invitations/:id', requireAdmin, async (req, res, next) => {
  const invId = Number(req.params.id)
  if (!invId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'ID undangan tidak valid.' } })
  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.slug, i.status, i.payment_proof_url, i.payment_submitted_at,
              i.created_at, i.activated_at,
              c.bride_name, c.groom_name,
              u.email AS user_email, u.display_name AS user_display_name
       FROM invitations i
       LEFT JOIN wedding_configs c ON c.invitation_id = i.id
       LEFT JOIN users u ON u.id = i.owner_user_id
       WHERE i.id = ? AND i.deleted_at IS NULL`,
      [invId],
    )
    if (!rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' } })
    const r = rows[0]
    res.json({
      id: Number(r.id),
      slug: r.slug,
      status: r.status,
      payment_proof_url: r.payment_proof_url || null,
      payment_submitted_at: r.payment_submitted_at ? String(r.payment_submitted_at).replace(' ', 'T') : null,
      created_at: String(r.created_at).replace(' ', 'T'),
      activated_at: r.activated_at ? String(r.activated_at).replace(' ', 'T') : null,
      bride_name: r.bride_name || null,
      groom_name: r.groom_name || null,
      user_email: r.user_email || null,
      user_display_name: r.user_display_name || null,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/invitations/:id/activate', requireAdmin, async (req, res, next) => {
  const invId = Number(req.params.id)
  if (!invId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'ID undangan tidak valid.' } })
  try {
    const [result] = await pool.query(
      `UPDATE invitations
       SET status = 'active',
           activated_at = UTC_TIMESTAMP(),
           verified_by = ?,
           verified_at = UTC_TIMESTAMP()
       WHERE id = ? AND deleted_at IS NULL`,
      [req.admin.id, invId],
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' } })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

router.post('/invitations/:id/reject', requireAdmin, async (req, res, next) => {
  const invId = Number(req.params.id)
  if (!invId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'ID undangan tidak valid.' } })
  try {
    const [result] = await pool.query(
      `UPDATE invitations
       SET status = 'draft'
       WHERE id = ? AND deleted_at IS NULL`,
      [invId],
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' } })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

export default router

