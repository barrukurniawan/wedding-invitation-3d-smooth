import { Router } from 'express'
import bcrypt from 'bcrypt'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import pool from '../db.js'
import { COOKIE_NAME, cookieOptions, createSession, deleteSession, hashSessionToken, requireAdmin } from '../auth.js'
import { sendActivationEmail } from '../services/email.js'
import { buildPublicUrl } from '../services/host.js'
import { transitionInvitation, withTransaction } from '../services/invitationState.js'
import { stripAdminConfigMetadata } from '../services/adminConfig.js'

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
  const parsed = configSchema.safeParse(stripAdminConfigMetadata(req.body))
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

router.get('/analytics/summary', requireAdmin, async (req, res, next) => {
  try {
    const [usersResult, tenantsResult, paymentsResult, rsvpsResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total,
           COALESCE(SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY), 0) AS new30d
         FROM users WHERE status <> 'deleted'`,
      ),
      pool.query(
        `SELECT COUNT(*) AS total,
           COALESCE(SUM(status = 'active'), 0) AS active,
           COALESCE(SUM(status = 'pending_verification'), 0) AS pending,
           COALESCE(SUM(status IN ('draft', 'awaiting_payment')), 0) AS draft,
           COALESCE(SUM(status = 'suspended'), 0) AS suspended
         FROM invitations WHERE deleted_at IS NULL`,
      ),
      pool.query(
        `SELECT COALESCE(SUM(status = 'received'), 0) AS receivedCount,
           COALESCE(SUM(status IN ('created', 'pending')), 0) AS pendingCount,
           COALESCE(SUM(CASE WHEN status = 'received' THEN amount ELSE 0 END), 0) AS amountReceived
         FROM payments`,
      ),
      pool.query(
        `SELECT COUNT(*) AS total,
           COALESCE(SUM(attendance = 'Hadir'), 0) AS hadir,
           COALESCE(SUM(attendance = 'Ragu-ragu'), 0) AS ragu,
           COALESCE(SUM(attendance = 'Tidak Hadir'), 0) AS tidakHadir
         FROM guestbook_entries WHERE status <> 'deleted'`,
      ),
    ])
    const users = usersResult[0][0] || { total: 0, new30d: 0 }
    res.json({
      users: { total: Number(users.total) || 0, new30d: Number(users.new30d) || 0 },
      tenants: {
        total: Number(tenantsResult[0]?.[0]?.total) || 0,
        active: Number(tenantsResult[0]?.[0]?.active) || 0,
        pending: Number(tenantsResult[0]?.[0]?.pending) || 0,
        draft: Number(tenantsResult[0]?.[0]?.draft) || 0,
        suspended: Number(tenantsResult[0]?.[0]?.suspended) || 0,
      },
      payments: {
        receivedCount: Number(paymentsResult[0]?.[0]?.receivedCount) || 0,
        pendingCount: Number(paymentsResult[0]?.[0]?.pendingCount) || 0,
        amountReceived: Number(paymentsResult[0]?.[0]?.amountReceived) || 0,
      },
      rsvps: {
        total: Number(rsvpsResult[0]?.[0]?.total) || 0,
        hadir: Number(rsvpsResult[0]?.[0]?.hadir) || 0,
        ragu: Number(rsvpsResult[0]?.[0]?.ragu) || 0,
        tidakHadir: Number(rsvpsResult[0]?.[0]?.tidakHadir) || 0,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/analytics/visitors', requireAdmin, async (req, res, next) => {
  const parsed = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) }).safeParse(req.query)
  if (!parsed.success) return invalid(res, parsed.error)
  const days = parsed.data.days
  try {
    const [seriesResult, slugResult, pathResult, recentResult] = await Promise.all([
      pool.query(
        `SELECT DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')) AS d,
           COUNT(*) AS views, COUNT(DISTINCT visit_id) AS uniques
         FROM visitor_events
         WHERE created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY
         GROUP BY d ORDER BY d`,
        [days],
      ),
      pool.query(
        `SELECT slug, COUNT(*) AS views, COUNT(DISTINCT visit_id) AS uniques
         FROM visitor_events
         WHERE created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY AND slug IS NOT NULL
         GROUP BY slug ORDER BY views DESC LIMIT 10`,
        [days],
      ),
      pool.query(
        `SELECT path, COUNT(*) AS views
         FROM visitor_events
         WHERE created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY
         GROUP BY path ORDER BY views DESC LIMIT 10`,
        [days],
      ),
      pool.query(
        `SELECT display_name, email, created_at
         FROM users WHERE status <> 'deleted'
         ORDER BY created_at DESC, id DESC LIMIT 8`,
      ),
    ])
    const toDay = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10))
    const toIso = (value) => {
      const normalized = value instanceof Date ? value.toISOString() : String(value).replace(' ', 'T')
      return normalized.slice(0, 19)
    }
    res.json({
      series: seriesResult[0].map((r) => ({ date: toDay(r.d), views: Number(r.views), uniques: Number(r.uniques) })),
      topSlugs: slugResult[0].map((r) => ({ slug: r.slug, views: Number(r.views), uniques: Number(r.uniques) })),
      topPaths: pathResult[0].map((r) => ({ path: r.path, views: Number(r.views) })),
      recentUsers: recentResult[0].map((r) => ({
        displayName: r.display_name,
        email: r.email,
        createdAt: toIso(r.created_at),
      })),
    })
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
      `SELECT i.id, i.slug, i.status, i.payment_proof_url, i.payment_submitted_at, i.rejection_reason,
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
       rejection_reason: r.rejection_reason || null,
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
      `SELECT i.id, i.slug, i.status, i.payment_proof_url, i.payment_submitted_at, i.rejection_reason,
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
       rejection_reason: r.rejection_reason || null,
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
    const [invRows] = await pool.query(
      `SELECT i.id, i.slug, i.status, i.payment_proof_url, u.email, c.bride_name, c.groom_name
       FROM invitations i
       LEFT JOIN users u ON u.id = i.owner_user_id
       LEFT JOIN wedding_configs c ON c.invitation_id = i.id
       WHERE i.id = ? AND i.deleted_at IS NULL`,
      [invId]
    )
    if (!invRows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' } })

    const invitation = invRows[0]
    if (invitation.status !== 'pending_verification') {
      return res.status(409).json({ error: { code: 'INVALID_VERIFICATION_STATE', message: 'Undangan belum berada dalam antrean verifikasi.' } })
    }
    const [paymentRows] = await pool.query(
      `SELECT id FROM payments
       WHERE invitation_id = ? AND status = 'received'
       ORDER BY id DESC LIMIT 1`,
      [invId],
    )
    if (!paymentRows[0]) {
      return res.status(409).json({ error: { code: 'PAYMENT_REQUIRED', message: 'Pembayaran tervalidasi belum tersedia.' } })
    }

    await withTransaction(async (connection) => {
      await transitionInvitation({
        invitationId: invId,
        toStatus: 'active',
        actorType: 'admin',
        actorId: req.admin.id,
        reason: 'Pembayaran diverifikasi admin',
        paymentId: paymentRows[0].id,
        connection,
      })
    })

    const r = invitation
    if (r.email) {
      const public_url = buildPublicUrl(r.slug)
        
      sendActivationEmail(r.email, {
        bride_name: r.bride_name,
        groom_name: r.groom_name,
        public_url,
        slug: r.slug
      }).catch(e => console.error('[EmailService] Error in background send:', e))
    }

    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

router.post('/invitations/:id/reject', requireAdmin, async (req, res, next) => {
  const invId = Number(req.params.id)
  if (!invId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'ID undangan tidak valid.' } })
  const parsed = z.object({ reason: z.string().trim().min(1).max(1000) }).safeParse(req.body || {})
  if (!parsed.success) return invalid(res, parsed.error)
  try {
    await withTransaction(async (connection) => {
      await transitionInvitation({
        invitationId: invId,
        toStatus: 'draft',
        actorType: 'admin',
        actorId: req.admin.id,
        reason: parsed.data.reason,
        connection,
      })
      await connection.query(
        `UPDATE invitations SET payment_proof_url = NULL, payment_submitted_at = NULL
         WHERE id = ? AND deleted_at IS NULL`,
        [invId],
      )
    })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

import { uploadPhoto, uploadMusic, multerErrorHandler } from './upload.js'

router.post('/upload/photo', requireAdmin, uploadPhoto.single('file'), multerErrorHandler, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Tidak ada file yang diunggah.' } })
  }
  const photo_url = `/api/public/photos/${req.file.filename}`
  res.json({ photo_url })
})

router.post('/upload/music', requireAdmin, uploadMusic.single('file'), multerErrorHandler, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Tidak ada file yang diunggah.' } })
  }
  const bgm_url = `/api/public/music/${req.file.filename}`
  const bgm_title = req.file.originalname.replace(/\.[^/.]+$/, '')
  res.json({ bgm_url, bgm_title })
})

export default router
