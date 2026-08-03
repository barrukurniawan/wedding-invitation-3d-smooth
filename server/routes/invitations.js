import { Router } from 'express'
import { z } from 'zod'
import pool from '../db.js'
import { RESERVED_SLUGS, SLUG_PATTERN, buildPublicUrl } from '../services/host.js'
import { requireCsrf, requireUser } from '../userAuth.js'

const router = Router()

const createSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, 'Slug undangan tidak valid.'),
  bride_name: z.string().trim().min(1).max(255).optional(),
  groom_name: z.string().trim().min(1).max(255).optional(),
  reception_at: z.string().trim().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/,
    'Tanggal resepsi tidak valid.',
  ).optional(),
}).strict()

function serializeInvitation(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    status: row.status,
    payment_proof_url: row.payment_proof_url || null,
    payment_submitted_at: row.payment_submitted_at ? String(row.payment_submitted_at).replace(' ', 'T') : null,
    reception_at: String(row.reception_at).replace(' ', 'T'),
    timezone: row.timezone,
    expires_at: String(row.expires_at).replace(' ', 'T'),
    retention_until: String(row.retention_until).replace(' ', 'T'),
    activated_at: row.activated_at ? String(row.activated_at).replace(' ', 'T') : null,
    public_url: buildPublicUrl(row.slug),
    config: row.bride_name == null ? null : {
      bride_name: row.bride_name,
      groom_name: row.groom_name,
      wedding_date: String(row.wedding_date).replace(' ', 'T'),
      resepsi_date: row.resepsi_date,
      resepsi_location: row.resepsi_location,
    },
  }
}

function toMysqlDateTime(iso) {
  return iso.slice(0, 19).replace('T', ' ')
}

function defaultReceptionAt() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 90)
  date.setUTCHours(4, 0, 0, 0)
  return date.toISOString().slice(0, 19)
}

router.get('/me', requireUser, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.slug, i.status, i.payment_proof_url, i.payment_submitted_at, i.reception_at, i.timezone, i.expires_at, i.retention_until, i.activated_at,
              c.bride_name, c.groom_name, c.wedding_date, c.resepsi_date, c.resepsi_location
       FROM invitations i
       LEFT JOIN wedding_configs c ON c.invitation_id = i.id
       WHERE i.owner_user_id = ? AND i.deleted_at IS NULL
       LIMIT 1`,
      [req.user.id],
    )
    if (!rows[0]) {
      return res.json({ invitation: null })
    }
    res.json({ invitation: serializeInvitation(rows[0]) })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireUser, requireCsrf, async (req, res, next) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Data undangan tidak valid.' },
    })
  }

  const slug = parsed.data.slug
  if (RESERVED_SLUGS.has(slug)) {
    return res.status(400).json({ error: { code: 'SLUG_RESERVED', message: 'Slug undangan tidak tersedia.' } })
  }

  const receptionIso = parsed.data.reception_at || defaultReceptionAt()
  const receptionMysql = toMysqlDateTime(receptionIso)
  const brideName = parsed.data.bride_name || 'Mempelai Wanita'
  const groomName = parsed.data.groom_name || 'Mempelai Pria'
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [owned] = await connection.query(
      'SELECT id FROM invitations WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE',
      [req.user.id],
    )
    if (owned[0]) {
      await connection.rollback()
      return res.status(409).json({
        error: { code: 'INVITATION_EXISTS', message: 'Setiap akun hanya dapat memiliki satu undangan.' },
      })
    }

    const [slugRows] = await connection.query(
      'SELECT id FROM invitations WHERE slug = ? LIMIT 1 FOR UPDATE',
      [slug],
    )
    if (slugRows[0]) {
      await connection.rollback()
      return res.status(409).json({ error: { code: 'SLUG_TAKEN', message: 'Slug undangan sudah dipakai.' } })
    }

    const [insert] = await connection.query(
      `INSERT INTO invitations (
         owner_user_id, slug, status, reception_at, timezone,
         expires_at, retention_until
       ) VALUES (
         ?, ?, 'draft', ?, 'Asia/Jakarta',
         DATE_ADD(?, INTERVAL 7 DAY), DATE_ADD(?, INTERVAL 37 DAY)
       )`,
      [req.user.id, slug, receptionMysql, receptionMysql, receptionMysql],
    )
    const invitationId = Number(insert.insertId)

    await connection.query(
      `INSERT INTO invitation_memberships (invitation_id, user_id, role, status)
       VALUES (?, ?, 'owner', 'active')`,
      [invitationId, req.user.id],
    )

    await connection.query(
      `INSERT INTO wedding_configs (
         invitation_id, bride_name, groom_name, bride_parents, groom_parents,
         wedding_photo, wedding_date, akad_date, akad_time, akad_location,
         resepsi_date, resepsi_time, resepsi_location, qris_image, bank_name,
         bank_account, bank_holder, maps_url, venue_address, gallery_photos, quote
       ) VALUES (
         ?, ?, ?, 'Bpk. ... & Ibu. ...', 'Bpk. ... & Ibu. ...',
         '', ?, 'Tanggal akad segera diumumkan', '08:00 - 10:00 WIB', 'Kediaman Mempelai Wanita',
         'Tanggal resepsi segera diumumkan', '11:00 - 14:00 WIB', 'Gedung Serbaguna', '', 'BCA',
         '', ?, '', '', CAST('[]' AS JSON), ''
       )`,
      [invitationId, brideName, groomName, receptionMysql, groomName],
    )

    const [rows] = await connection.query(
      `SELECT i.id, i.slug, i.status, i.reception_at, i.timezone, i.expires_at, i.retention_until, i.activated_at,
              c.bride_name, c.groom_name, c.wedding_date, c.resepsi_date, c.resepsi_location
       FROM invitations i
       JOIN wedding_configs c ON c.invitation_id = i.id
       WHERE i.id = ?`,
      [invitationId],
    )
    await connection.commit()
    res.status(201).json({ invitation: serializeInvitation(rows[0]) })
  } catch (error) {
    await connection.rollback()
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: { code: 'INVITATION_CONFLICT', message: 'Undangan atau slug sudah terpakai.' },
      })
    }
    next(error)
  } finally {
    connection.release()
  }
})

export default router
