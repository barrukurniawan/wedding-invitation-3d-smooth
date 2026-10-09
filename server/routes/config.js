import { Router } from 'express'
import pool from '../db.js'
import { normalizeMusicConfig } from '../services/configDefaults.js'
import { normalizeVenue } from '../services/venues.js'

const router = Router()

router.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  try {
    const [rows] = await pool.query(
      `SELECT invitation_id AS id, bride_name, groom_name, bride_parents, groom_parents, wedding_photo,
        wedding_date, akad_date, akad_time, akad_location, resepsi_date, resepsi_time,
        resepsi_location, qris_image, bank_name, bank_account, bank_holder, maps_url,
         venue_address, gallery_photos, quote, bgm_url, bgm_title, preset, venue, updated_at
       FROM wedding_configs WHERE invitation_id = ?`,
      [req.invitation.id],
    )
    if (rows.length === 0) return res.status(404).json({ error: { code: 'CONFIG_NOT_FOUND', message: 'Konfigurasi tidak ditemukan.' } })
    const row = normalizeMusicConfig(rows[0])
    row.id = Number(row.id)
    row.slug = req.invitation?.slug || ''
    row.preset = row.preset || '3d_summer'
    row.venue = normalizeVenue(row.venue)
    row.gallery_photos = typeof row.gallery_photos === 'string' ? JSON.parse(row.gallery_photos) : row.gallery_photos
    row.wedding_date = row.wedding_date ? String(row.wedding_date).replace(' ', 'T') : ''
    row.bgm_url ||= '/audio/Marry%20You.mp3'
    row.bgm_title ||= 'Marry You'
    res.json(row)
  } catch (err) {
    console.error('GET /api/config error:', err.message)
    res.status(500).json({ error: { code: 'DATABASE_ERROR', message: 'Konfigurasi tidak dapat dimuat.' } })
  }
})

export default router
