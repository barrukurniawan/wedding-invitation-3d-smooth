import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import pool from '../db.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { normalizeIndonesianPhone } from '../services/phone.js'

const router = Router()
const MAX_CONTACTS = 100
const contactSchema = z.object({
  name: z.string().trim().min(1, 'Nama penerima wajib diisi.').max(255),
  phone: z.string().trim().min(1, 'Nomor WhatsApp wajib diisi.').max(32),
  gender: z.enum(['m', 'f']).default('m'),
}).strict()

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
    created_at: String(row.created_at).replace(' ', 'T'),
    updated_at: String(row.updated_at).replace(' ', 'T'),
  }
}

router.get('/', requireUser, async (req, res, next) => {
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Undangan belum dibuat.' } })
    const [rows] = await pool.query('SELECT id, name, phone, gender, created_at, updated_at FROM invitation_contacts WHERE invitation_id = ? ORDER BY created_at ASC, id ASC', [invitation.id])
    res.json({ contacts: rows.map(serialize), limit: MAX_CONTACTS })
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: { code: 'CONTACTS_NOT_MIGRATED', message: 'Fitur kontak belum diaktifkan di database. Jalankan migration terbaru.' } })
    }
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
    if (!invitation) return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Undangan belum dibuat.' } })
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM invitation_contacts WHERE invitation_id = ?', [invitation.id])
    if (Number(countRows[0].total) >= MAX_CONTACTS) return res.status(409).json({ error: { code: 'CONTACT_LIMIT_REACHED', message: 'Maksimal 100 nomor undangan.' } })
    const id = randomUUID()
    await pool.query('INSERT INTO invitation_contacts (id, invitation_id, name, phone, gender) VALUES (?, ?, ?, ?, ?)', [id, invitation.id, parsed.data.name, phone, parsed.data.gender])
    const [rows] = await pool.query('SELECT id, name, phone, gender, created_at, updated_at FROM invitation_contacts WHERE id = ?', [id])
    res.status(201).json({ contact: serialize(rows[0]) })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: { code: 'PHONE_EXISTS', message: 'Nomor WhatsApp sudah ada di daftar.' } })
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: { code: 'CONTACTS_NOT_MIGRATED', message: 'Fitur kontak belum diaktifkan di database. Jalankan migration terbaru.' } })
    }
    next(error)
  }
})

router.delete('/:id', requireUser, requireCsrf, async (req, res, next) => {
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Undangan belum dibuat.' } })
    const [result] = await pool.query('DELETE FROM invitation_contacts WHERE id = ? AND invitation_id = ?', [req.params.id, invitation.id])
    if (!result.affectedRows) return res.status(404).json({ error: { code: 'CONTACT_NOT_FOUND', message: 'Kontak tidak ditemukan.' } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: { code: 'CONTACTS_NOT_MIGRATED', message: 'Fitur kontak belum diaktifkan di database. Jalankan migration terbaru.' } })
    }
    next(error)
  }
})

export default router
