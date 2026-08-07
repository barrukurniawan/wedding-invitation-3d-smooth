import { Router } from 'express'
import { z } from 'zod'
import pool from '../db.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { normalizeMusicConfig } from '../services/configDefaults.js'

const router = Router()

const text = (max) => z.string().trim().max(max)
const weddingDate = z.string().trim().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/,
  'Tanggal pernikahan tidak valid.',
)

const configSchema = z.object({
  bride_name: text(255),
  groom_name: text(255),
  bride_parents: text(255),
  groom_parents: text(255),
  wedding_photo: text(2048),
  wedding_date: weddingDate,
  akad_date: text(255),
  akad_time: text(255),
  akad_location: text(255),
  resepsi_date: text(255),
  resepsi_time: text(255),
  resepsi_location: text(255),
  qris_image: text(2048),
  bank_name: text(100),
  bank_account: text(100),
  bank_holder: text(255),
  maps_url: text(2048),
  venue_address: text(2000),
  quote: text(2000),
  gallery_photos: z.array(text(2048)).max(30),
  bgm_url: text(2048),
  bgm_title: text(255),
}).partial().strict()

function invalid(res, error) {
  return res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: error.issues?.[0]?.message || 'Data tidak valid.' },
  })
}

function serializeConfig(config) {
  const result = normalizeMusicConfig(config)
  result.id = Number(result.invitation_id || result.id)
  result.gallery_photos = typeof result.gallery_photos === 'string'
    ? JSON.parse(result.gallery_photos)
    : result.gallery_photos || []
  if (result.wedding_date) {
    result.wedding_date = String(result.wedding_date).replace(' ', 'T')
  }
  return result
}

router.get('/config', requireUser, async (req, res, next) => {
  try {
    const [invitationRows] = await pool.query(
      'SELECT id FROM invitations WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1',
      [req.user.id],
    )
    const invitation = invitationRows[0]
    if (!invitation) {
      return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Undangan belum dibuat.' } })
    }

    const [configRows] = await pool.query(
      'SELECT * FROM wedding_configs WHERE invitation_id = ?',
      [invitation.id],
    )
    if (!configRows[0]) {
      return res.status(404).json({ error: { code: 'CONFIG_NOT_FOUND', message: 'Konfigurasi tidak ditemukan.' } })
    }

    res.json(serializeConfig(configRows[0]))
  } catch (error) {
    next(error)
  }
})

router.patch('/config', requireUser, requireCsrf, async (req, res, next) => {
  const parsed = configSchema.safeParse(req.body)
  if (!parsed.success) return invalid(res, parsed.error)

  const data = parsed.data
  const fields = Object.keys(data)
  if (fields.length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Tidak ada perubahan.' } })
  }

  try {
    const [invitationRows] = await pool.query(
      'SELECT id FROM invitations WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1',
      [req.user.id],
    )
    const invitation = invitationRows[0]
    if (!invitation) {
      return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Undangan belum dibuat.' } })
    }

    const values = fields.map((field) => {
      if (field === 'gallery_photos') return JSON.stringify(data[field])
      if (field === 'wedding_date') return data[field].slice(0, 19).replace('T', ' ')
      return data[field]
    })

    const setSql = fields.map((field) => `${field} = ?`).join(', ')
    await pool.query(
      `UPDATE wedding_configs SET ${setSql} WHERE invitation_id = ?`,
      [...values, invitation.id],
    )

    const [configRows] = await pool.query(
      'SELECT * FROM wedding_configs WHERE invitation_id = ?',
      [invitation.id],
    )
    res.json(serializeConfig(configRows[0]))
  } catch (error) {
    next(error)
  }
})

router.get('/guestbook', requireUser, async (req, res, next) => {
  try {
    const [invitationRows] = await pool.query(
      'SELECT id FROM invitations WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1',
      [req.user.id],
    )
    const invitation = invitationRows[0]
    if (!invitation) {
      return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Undangan belum dibuat.' } })
    }

    const [rows] = await pool.query(
      `SELECT id, name, attendance, message, created_at
       FROM guestbook_entries
       WHERE invitation_id = ? AND status <> 'deleted'
       ORDER BY created_at DESC, id DESC`,
      [invitation.id],
    )

    const stats = {
      total: rows.length,
      hadir: rows.filter((r) => r.attendance === 'Hadir').length,
      ragu: rows.filter((r) => r.attendance === 'Ragu-ragu').length,
      tidakHadir: rows.filter((r) => r.attendance === 'Tidak Hadir').length,
    }

    const items = rows.map((r) => ({
      ...r,
      created_at: r.created_at ? String(r.created_at).replace(' ', 'T') : '',
    }))

    res.json({ items, stats })
  } catch (error) {
    next(error)
  }
})

export default router
