import { Router } from 'express'
import { z } from 'zod'
import pool from '../db.js'
import { RESERVED_SLUGS, SLUG_PATTERN, buildPublicUrl } from '../services/host.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { isFreeManualPackage } from '../services/paymentConfig.js'
import { transitionInvitation, withTransaction } from '../services/invitationState.js'

const router = Router()

const createSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, 'Slug undangan tidak valid.'),
  bride_name: z.string().trim().min(1).max(255).optional(),
  groom_name: z.string().trim().min(1).max(255).optional(),
  reception_at: z.string().trim().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/,
    'Tanggal resepsi tidak valid.',
  ).optional(),
  preset: z.enum(['3d_summer', '2d_garden']).optional(),
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
    rejection_reason: row.rejection_reason || null,
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

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatIndonesianDateFromIso(isoDateString) {
  const [yearStr, monthStr, dayStr] = isoDateString.slice(0, 10).split('-')
  const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
  const dayName = INDO_DAYS[dateObj.getDay()]
  const day = dateObj.getDate()
  const monthName = INDO_MONTHS[dateObj.getMonth()]
  const year = dateObj.getFullYear()
  return `${dayName}, ${day} ${monthName} ${year}`
}

function defaultReceptionAt(daysAhead = 14) {
  // Always default to 14 days in the future at 08:00 WIB
  const date = new Date(Date.now() + 7 * 3600 * 1000)
  date.setDate(date.getDate() + daysAhead)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T08:00:00`
}

router.get('/me', requireUser, async (req, res, next) => {
  try {
    if (isFreeManualPackage()) {
      const [ownedRows] = await pool.query(
        `SELECT id, status FROM invitations
         WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1`,
        [req.user.id],
      )
      if (ownedRows[0]?.status === 'draft') {
        await withTransaction(async (connection) => {
          await transitionInvitation({
            invitationId: ownedRows[0].id,
            toStatus: 'active',
            actorType: 'system',
            reason: 'Paket gratis: aktivasi otomatis saat membuka dashboard',
            connection,
          })
        })
      }
    }
    const [rows] = await pool.query(
      `SELECT i.id, i.slug, i.status, i.payment_proof_url, i.payment_submitted_at, i.reception_at, i.timezone, i.expires_at, i.retention_until, i.activated_at, i.rejection_reason,
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
  const preset = parsed.data.preset || '3d_summer'
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
          ?, ?, ?, ?, 'Asia/Jakarta',
          DATE_ADD(?, INTERVAL 7 DAY), DATE_ADD(?, INTERVAL 37 DAY)
        )`,
       [req.user.id, slug, isFreeManualPackage() ? 'active' : 'draft', receptionMysql, receptionMysql, receptionMysql],
    )
    const invitationId = Number(insert.insertId)

    await connection.query(
      `INSERT INTO invitation_memberships (invitation_id, user_id, role, status)
       VALUES (?, ?, 'owner', 'active')`,
      [invitationId, req.user.id],
    )

    const defaultEventDateIndo = formatIndonesianDateFromIso(receptionIso)

    await connection.query(
      `INSERT INTO wedding_configs (
         invitation_id, bride_name, groom_name, bride_parents, groom_parents,
         wedding_photo, wedding_date, akad_date, akad_time, akad_location,
         resepsi_date, resepsi_time, resepsi_location, qris_image, bank_name,
         bank_account, bank_holder, maps_url, venue_address, gallery_photos, quote, preset
       ) VALUES (
         ?, ?, ?, 'Bpk. ... & Ibu. ...', 'Bpk. ... & Ibu. ...',
         '', ?, ?, '08:00 - 10:00 WIB', 'Kediaman Mempelai Wanita',
         ?, '11:00 - 14:00 WIB', 'Gedung Serbaguna', '', 'BCA',
         '', ?, '', '', CAST('[]' AS JSON), '', ?
       )`,
      [invitationId, brideName, groomName, receptionMysql, defaultEventDateIndo, defaultEventDateIndo, groomName, preset],
    )

    if (isFreeManualPackage()) {
      await connection.query(
        'UPDATE invitations SET activated_at = UTC_TIMESTAMP() WHERE id = ?',
        [invitationId],
      )
      await connection.query(
        `INSERT INTO invitation_status_events
           (invitation_id, from_status, to_status, actor_type, reason)
         VALUES (?, 'draft', 'active', 'system', 'Paket gratis: aktivasi otomatis')`,
        [invitationId],
      )
    }

    const [rows] = await connection.query(
      `SELECT i.id, i.slug, i.status, i.reception_at, i.timezone, i.expires_at, i.retention_until, i.activated_at, i.rejection_reason,
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

const slugUpdateSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, 'Slug hanya boleh berisi huruf kecil (a-z), angka (0-9), dan tanda hubung (-).'),
}).strict()

router.patch('/slug', requireUser, requireCsrf, async (req, res, next) => {
  const parsed = slugUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Slug tidak valid.' },
    })
  }

  const newSlug = parsed.data.slug
  if (RESERVED_SLUGS.has(newSlug)) {
    return res.status(400).json({ error: { code: 'SLUG_RESERVED', message: 'Slug undangan tidak tersedia.' } })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [ownedRows] = await connection.query(
      `SELECT i.id, i.slug, i.status, i.reception_at, i.timezone, i.expires_at, i.retention_until, i.activated_at, i.rejection_reason,
              c.bride_name, c.groom_name, c.wedding_date, c.resepsi_date, c.resepsi_location
       FROM invitations i
       LEFT JOIN wedding_configs c ON c.invitation_id = i.id
       WHERE i.owner_user_id = ? AND i.deleted_at IS NULL
       LIMIT 1 FOR UPDATE`,
      [req.user.id],
    )
    const current = ownedRows[0]
    if (!current) {
      await connection.rollback()
      return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Undangan belum dibuat.' } })
    }

    if (current.slug === newSlug) {
      await connection.rollback()
      return res.json({ invitation: serializeInvitation(current) })
    }

    const [existing] = await connection.query(
      'SELECT id FROM invitations WHERE slug = ? AND id <> ? LIMIT 1 FOR UPDATE',
      [newSlug, current.id],
    )
    if (existing[0]) {
      await connection.rollback()
      return res.status(409).json({ error: { code: 'SLUG_TAKEN', message: 'Subdomain tersebut sudah dipakai oleh pengguna lain.' } })
    }

    await connection.query(
      'UPDATE invitations SET slug = ? WHERE id = ?',
      [newSlug, current.id],
    )

    // Also update associated wishes if any
    await connection.query(
      'UPDATE wedding_wishes SET site = ? WHERE site = ?',
      [newSlug, current.slug],
    )

    current.slug = newSlug
    await connection.commit()
    res.json({ invitation: serializeInvitation(current) })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
})

export default router
