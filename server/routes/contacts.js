import { Router } from 'express'
import { toIsoString } from '../services/dates.js'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import pool from '../db.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { normalizeIndonesianPhone } from '../services/phone.js'
import { generateAccessCode } from '../services/guestAccess.js'

const router = Router()
export const MAX_CONTACTS = 200
const contactSchema = z.object({
  name: z.string().trim().min(1, 'Nama penerima wajib diisi.').max(255),
  phone: z.string().trim().min(1, 'Nomor WhatsApp wajib diisi.').max(32),
  gender: z.enum(['m', 'f']).default('m'),
}).strict()
const updateSchema = z.object({ revoked: z.boolean() }).strict()

// Kolom statistik undangan privat (migration 022). Bila belum dimigrasi, jatuh ke kolom lama.
const FULL_COLUMNS = `c.id, c.name, c.phone, c.gender, c.created_at, c.updated_at,
  c.access_code, c.revoked_at, c.first_opened_at, c.last_opened_at, c.open_count, c.denied_count,
  (SELECT COUNT(*) FROM invitation_contact_devices d WHERE d.contact_id = c.id) AS device_count`
const BASE_COLUMNS = 'c.id, c.name, c.phone, c.gender, c.created_at, c.updated_at'

async function ownerInvitation(userId) {
  const [rows] = await pool.query('SELECT id FROM invitations WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1', [userId])
  return rows[0] || null
}

function serialize(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    gender: row.gender,
    access_code: row.access_code || null,
    revoked: Boolean(row.revoked_at),
    first_opened_at: toIsoString(row.first_opened_at) || null,
    last_opened_at: toIsoString(row.last_opened_at) || null,
    open_count: Number(row.open_count || 0),
    denied_count: Number(row.denied_count || 0),
    device_count: Number(row.device_count || 0),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  }
}

async function selectContacts(where, params) {
  try {
    const [rows] = await pool.query(`SELECT ${FULL_COLUMNS} FROM invitation_contacts c WHERE ${where} ORDER BY c.created_at ASC, c.id ASC`, params)
    return rows
  } catch (error) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR' && error?.code !== 'ER_NO_SUCH_TABLE') throw error
    const [rows] = await pool.query(`SELECT ${BASE_COLUMNS} FROM invitation_contacts c WHERE ${where} ORDER BY c.created_at ASC, c.id ASC`, params)
    return rows
  }
}

/** Isi kode akses yang masih kosong (kontak lama sebelum migration 022). Retry bila bentrok unique. */
async function assignCode(contactId, invitationId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const code = generateAccessCode()
      await pool.query('UPDATE invitation_contacts SET access_code = ? WHERE id = ? AND invitation_id = ?', [code, contactId, invitationId])
      return code
    } catch (error) {
      if (error?.code !== 'ER_DUP_ENTRY') throw error
    }
  }
  throw new Error('Gagal membuat kode akses unik.')
}

function notMigrated(res) {
  return res.status(503).json({ error: { code: 'CONTACTS_NOT_MIGRATED', message: 'Fitur kontak belum diaktifkan di database. Jalankan migration terbaru.' } })
}

function invitationMissing(res) {
  return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Undangan belum dibuat.' } })
}

function contactMissing(res) {
  return res.status(404).json({ error: { code: 'CONTACT_NOT_FOUND', message: 'Kontak tidak ditemukan.' } })
}

router.get('/', requireUser, async (req, res, next) => {
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return invitationMissing(res)
    let rows = await selectContacts('c.invitation_id = ?', [invitation.id])
    const missing = rows.filter((row) => 'access_code' in row && !row.access_code)
    if (missing.length) {
      for (const row of missing) row.access_code = await assignCode(row.id, invitation.id)
    }
    res.json({ contacts: rows.map(serialize), limit: MAX_CONTACTS })
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') return notMigrated(res)
    next(error)
  }
})

router.post('/', requireUser, requireCsrf, async (req, res, next) => {
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Data kontak tidak valid.' } })
  const phone = normalizeIndonesianPhone(parsed.data.phone)
  if (!phone) return res.status(400).json({ error: { code: 'INVALID_PHONE', message: 'Nomor WhatsApp Indonesia tidak valid.' } })
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return invitationMissing(res)
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM invitation_contacts WHERE invitation_id = ?', [invitation.id])
    if (Number(countRows[0].total) >= MAX_CONTACTS) return res.status(409).json({ error: { code: 'CONTACT_LIMIT_REACHED', message: `Maksimal ${MAX_CONTACTS} nomor undangan.` } })
    const id = randomUUID()
    await pool.query('INSERT INTO invitation_contacts (id, invitation_id, name, phone, gender) VALUES (?, ?, ?, ?, ?)', [id, invitation.id, parsed.data.name, phone, parsed.data.gender])
    try {
      await assignCode(id, invitation.id)
    } catch (error) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error
    }
    const rows = await selectContacts('c.id = ?', [id])
    res.status(201).json({ contact: serialize(rows[0]) })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: { code: 'PHONE_EXISTS', message: 'Nomor WhatsApp sudah ada di daftar.' } })
    if (error?.code === 'ER_NO_SUCH_TABLE') return notMigrated(res)
    next(error)
  }
})

// Nonaktifkan / aktifkan lagi link tamu (link yang ketahuan diteruskan).
router.patch('/:id', requireUser, requireCsrf, async (req, res, next) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid.' } })
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return invitationMissing(res)
    const [result] = await pool.query(
      `UPDATE invitation_contacts SET revoked_at = ${parsed.data.revoked ? 'COALESCE(revoked_at, CURRENT_TIMESTAMP)' : 'NULL'} WHERE id = ? AND invitation_id = ?`,
      [req.params.id, invitation.id],
    )
    if (!result.affectedRows) return contactMissing(res)
    const rows = await selectContacts('c.id = ?', [req.params.id])
    res.json({ contact: serialize(rows[0]) })
  } catch (error) {
    if (error?.code === 'ER_BAD_FIELD_ERROR' || error?.code === 'ER_NO_SUCH_TABLE') return notMigrated(res)
    next(error)
  }
})

// Kode baru: link lama langsung mati, perangkat & statistik direset, link tamu aktif lagi.
router.post('/:id/regenerate', requireUser, requireCsrf, async (req, res, next) => {
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return invitationMissing(res)
    const [found] = await pool.query('SELECT id FROM invitation_contacts WHERE id = ? AND invitation_id = ?', [req.params.id, invitation.id])
    if (!found[0]) return contactMissing(res)
    await assignCode(req.params.id, invitation.id)
    await pool.query(
      'UPDATE invitation_contacts SET revoked_at = NULL, denied_count = 0, open_count = 0, first_opened_at = NULL, last_opened_at = NULL WHERE id = ?',
      [req.params.id],
    )
    await pool.query('DELETE FROM invitation_contact_devices WHERE contact_id = ?', [req.params.id])
    const rows = await selectContacts('c.id = ?', [req.params.id])
    res.json({ contact: serialize(rows[0]) })
  } catch (error) {
    if (error?.code === 'ER_BAD_FIELD_ERROR' || error?.code === 'ER_NO_SUCH_TABLE') return notMigrated(res)
    next(error)
  }
})

// Reset perangkat: tamu yang ganti HP/browser bisa membuka lagi dengan link yang sama.
router.delete('/:id/devices', requireUser, requireCsrf, async (req, res, next) => {
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return invitationMissing(res)
    const [found] = await pool.query('SELECT id FROM invitation_contacts WHERE id = ? AND invitation_id = ?', [req.params.id, invitation.id])
    if (!found[0]) return contactMissing(res)
    await pool.query('DELETE FROM invitation_contact_devices WHERE contact_id = ?', [req.params.id])
    await pool.query('UPDATE invitation_contacts SET denied_count = 0 WHERE id = ?', [req.params.id])
    const rows = await selectContacts('c.id = ?', [req.params.id])
    res.json({ contact: serialize(rows[0]) })
  } catch (error) {
    if (error?.code === 'ER_BAD_FIELD_ERROR' || error?.code === 'ER_NO_SUCH_TABLE') return notMigrated(res)
    next(error)
  }
})

router.delete('/:id', requireUser, requireCsrf, async (req, res, next) => {
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return invitationMissing(res)
    const [result] = await pool.query('DELETE FROM invitation_contacts WHERE id = ? AND invitation_id = ?', [req.params.id, invitation.id])
    if (!result.affectedRows) return contactMissing(res)
    res.status(204).end()
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') return notMigrated(res)
    next(error)
  }
})

export default router
