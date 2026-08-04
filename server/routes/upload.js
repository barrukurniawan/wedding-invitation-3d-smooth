import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { randomBytes } from 'node:crypto'
import pool from '../db.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { transitionInvitation, withTransaction } from '../services/invitationState.js'

const router = Router()

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// ── Helper: multer error → JSON ───────────────────────────────────────────────
function multerErrorHandler(err, req, res, next) {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: { code: 'FILE_TOO_LARGE', message: 'Ukuran file maksimal 5 MB.' } })
  }
  if (err?.message) {
    return res.status(400).json({ error: { code: 'INVALID_FILE', message: err.message } })
  }
  next(err)
}

function makeUploader(dir, prefix) {
  fs.mkdirSync(dir, { recursive: true })
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, _file, cb) => {
      const ext = _file.mimetype === 'image/png' ? '.png' : _file.mimetype === 'image/webp' ? '.webp' : '.jpg'
      cb(null, `${prefix}_${Date.now()}_${randomBytes(6).toString('hex')}${ext}`)
    },
  })
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true)
      cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.'))
    },
  })
}

// Directories
const PROOFS_DIR  = path.join(process.cwd(), 'uploads', 'proofs')
const PHOTOS_DIR  = path.join(process.cwd(), 'uploads', 'photos')
const MUSIC_DIR   = path.join(process.cwd(), 'uploads', 'music')

const uploadProof = makeUploader(PROOFS_DIR, 'proof')
const uploadPhoto = makeUploader(PHOTOS_DIR, 'photo')

function makeMusicUploader(dir, prefix) {
  fs.mkdirSync(dir, { recursive: true })
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, _file, cb) => {
      cb(null, `${prefix}_${Date.now()}_${randomBytes(6).toString('hex')}.mp3`)
    },
  })
  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for MP3
    fileFilter(_req, file, cb) {
      if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') return cb(null, true)
      cb(new Error('Format file tidak didukung. Gunakan file MP3.'))
    },
  })
}

const uploadMusic = makeMusicUploader(MUSIC_DIR, 'music')

// ── Middleware: verify user has an invitation ─────────────────────────────────
async function requireInvitation(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, status FROM invitations WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [req.user.id],
    )
    if (!rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' } })
    req.invitation = rows[0]
    next()
  } catch (err) { next(err) }
}

// ── POST /api/my/upload/proof ─────────────────────────────────────────────────
// Upload bukti transfer, update status → pending_verification
router.post(
  '/upload/proof',
  requireUser, requireCsrf,
  (req, res, next) => { uploadProof.single('file')(req, res, (err) => { if (err) return multerErrorHandler(err, req, res, next); next() }) },
  requireInvitation,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'File tidak ditemukan.' } })
      if (req.invitation.status === 'active') {
        fs.unlink(req.file.path, () => {})
        return res.status(409).json({ error: { code: 'ALREADY_ACTIVE', message: 'Undangan sudah aktif.' } })
      }

      // Delete old proof
      const [old] = await pool.query(`SELECT payment_proof_url FROM invitations WHERE id = ?`, [req.invitation.id])
      const oldUrl = old[0]?.payment_proof_url
      if (oldUrl?.startsWith('/api/my/proof/')) {
        fs.unlink(path.join(PROOFS_DIR, path.basename(oldUrl)), () => {})
      }

      const proofUrl = `/api/my/proof/${req.file.filename}`
      await withTransaction(async (connection) => {
        await connection.query(
          `UPDATE invitations
           SET payment_proof_url = ?, payment_submitted_at = UTC_TIMESTAMP()
           WHERE id = ? AND deleted_at IS NULL`,
          [proofUrl, req.invitation.id],
        )
        const [payments] = await connection.query(
          `SELECT id FROM payments
           WHERE invitation_id = ? AND provider = 'manual' AND status IN ('created', 'pending')
           ORDER BY id DESC LIMIT 1 FOR UPDATE`,
          [req.invitation.id],
        )
        let paymentId = payments[0]?.id
        if (paymentId) {
          await connection.query('UPDATE payments SET status = \'received\', proof_url = ? WHERE id = ?', [proofUrl, paymentId])
        } else {
          const [insert] = await connection.query(
            `INSERT INTO payments (invitation_id, provider, amount, status, proof_url, provider_status)
             VALUES (?, 'manual', ?, 'received', ?, 'proof_submitted')`,
            [req.invitation.id, Number(process.env.INVITATION_PRICE_IDR ?? 0), proofUrl],
          )
          paymentId = insert.insertId
        }
        await transitionInvitation({
          invitationId: req.invitation.id,
          toStatus: 'pending_verification',
          actorType: 'user',
          actorId: req.user.id,
          reason: 'Bukti transfer dikirim',
          paymentId,
          connection,
        })
      })
      res.json({ proof_url: proofUrl, status: 'pending_verification' })
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {})
      next(err)
    }
  },
)

// Serve proof files
import { COOKIE_NAME as ADMIN_COOKIE, requireAdmin } from '../auth.js'

router.get('/proof/:filename', async (req, res, next) => {
  try {
    if (req.cookies[ADMIN_COOKIE]) {
      return requireAdmin(req, res, () => {
        if (req.admin) res.sendFile(path.join(PROOFS_DIR, req.params.filename))
      })
    }

    requireUser(req, res, async () => {
      try {
        const [rows] = await pool.query(
          `SELECT payment_proof_url FROM invitations WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1`,
          [req.user.id],
        )
        const allowed = rows[0]?.payment_proof_url?.endsWith(req.params.filename)
        if (!allowed) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Akses ditolak.' } })
        res.sendFile(path.join(PROOFS_DIR, req.params.filename))
      } catch (err) { next(err) }
    })
  } catch (err) { next(err) }
})

// ── POST /api/my/upload/photo ─────────────────────────────────────────────────
// Upload satu foto galeri atau foto utama, simpan URL ke wedding_configs
router.post(
  '/upload/photo',
  requireUser, requireCsrf,
  (req, res, next) => { uploadPhoto.single('file')(req, res, (err) => { if (err) return multerErrorHandler(err, req, res, next); next() }) },
  requireInvitation,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'File tidak ditemukan.' } })

      const photoUrl = `/api/my/photos/${req.file.filename}`

      // type: 'cover' (wedding_photo) | 'gallery' (append to gallery_photos)
      const type = req.query.type === 'cover' ? 'cover' : 'gallery'

      if (type === 'cover') {
        // Replace wedding_photo
        const [old] = await pool.query(
          `SELECT wedding_photo FROM wedding_configs WHERE invitation_id = ?`,
          [req.invitation.id],
        )
        const oldPhoto = old[0]?.wedding_photo
        if (oldPhoto?.startsWith('/api/my/photos/')) {
          fs.unlink(path.join(PHOTOS_DIR, path.basename(oldPhoto)), () => {})
        }
        await pool.query(
          `UPDATE wedding_configs SET wedding_photo = ? WHERE invitation_id = ?`,
          [photoUrl, req.invitation.id],
        )
      } else {
        // Append to gallery_photos (JSON array), max 30
        const [configRows] = await pool.query(
          `SELECT gallery_photos FROM wedding_configs WHERE invitation_id = ?`,
          [req.invitation.id],
        )
        const current = typeof configRows[0]?.gallery_photos === 'string'
          ? JSON.parse(configRows[0].gallery_photos)
          : (configRows[0]?.gallery_photos || [])

        if (current.length >= 30) {
          fs.unlink(req.file.path, () => {})
          return res.status(400).json({ error: { code: 'LIMIT_REACHED', message: 'Maksimal 30 foto galeri.' } })
        }
        current.push(photoUrl)
        await pool.query(
          `UPDATE wedding_configs SET gallery_photos = ? WHERE invitation_id = ?`,
          [JSON.stringify(current), req.invitation.id],
        )
      }

      res.json({ photo_url: photoUrl, type })
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {})
      next(err)
    }
  },
)

// ── DELETE /api/my/upload/photo ───────────────────────────────────────────────
// Hapus foto galeri berdasarkan URL
router.delete(
  '/upload/photo',
  requireUser, requireCsrf,
  requireInvitation,
  async (req, res, next) => {
    try {
      const { photo_url } = req.body
      if (!photo_url || typeof photo_url !== 'string') {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'URL foto tidak valid.' } })
      }

      const [configRows] = await pool.query(
        `SELECT gallery_photos, wedding_photo FROM wedding_configs WHERE invitation_id = ?`,
        [req.invitation.id],
      )
      const config = configRows[0]

      if (photo_url === config?.wedding_photo) {
        // Remove cover photo
        if (photo_url.startsWith('/api/my/photos/')) {
          fs.unlink(path.join(PHOTOS_DIR, path.basename(photo_url)), () => {})
        }
        await pool.query(
          `UPDATE wedding_configs SET wedding_photo = '' WHERE invitation_id = ?`,
          [req.invitation.id],
        )
      } else {
        // Remove from gallery
        const current = typeof config?.gallery_photos === 'string'
          ? JSON.parse(config.gallery_photos)
          : (config?.gallery_photos || [])
        const updated = current.filter((p) => p !== photo_url)
        if (updated.length === current.length) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Foto tidak ditemukan.' } })
        }
        if (photo_url.startsWith('/api/my/photos/')) {
          fs.unlink(path.join(PHOTOS_DIR, path.basename(photo_url)), () => {})
        }
        await pool.query(
          `UPDATE wedding_configs SET gallery_photos = ? WHERE invitation_id = ?`,
          [JSON.stringify(updated), req.invitation.id],
        )
      }

      res.status(204).end()
    } catch (err) { next(err) }
  },
)

// Serve photo files (auth protected)
router.get('/photos/:filename', requireUser, requireInvitation, async (req, res, next) => {
  try {
    // Verify photo belongs to this user's invitation
    const [configRows] = await pool.query(
      `SELECT gallery_photos, wedding_photo FROM wedding_configs WHERE invitation_id = ?`,
      [req.invitation.id],
    )
    const config = configRows[0]
    const photoUrl = `/api/my/photos/${req.params.filename}`
    const gallery = typeof config?.gallery_photos === 'string'
      ? JSON.parse(config.gallery_photos) : (config?.gallery_photos || [])
    const allowed = config?.wedding_photo === photoUrl || gallery.includes(photoUrl)
    if (!allowed) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Akses ditolak.' } })
    res.sendFile(path.join(PHOTOS_DIR, req.params.filename))
  } catch (err) { next(err) }
})

// ── POST /api/my/upload/music ───────────────────────────────────────────────
router.post(
  '/upload/music',
  requireUser, requireCsrf,
  (req, res, next) => { uploadMusic.single('file')(req, res, (err) => { if (err) return multerErrorHandler(err, req, res, next); next() }) },
  requireInvitation,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'File tidak ditemukan.' } })

      const musicUrl = `/api/my/music/${req.file.filename}`

      const [old] = await pool.query(
        `SELECT bgm_url FROM wedding_configs WHERE invitation_id = ?`,
        [req.invitation.id],
      )
      const oldBgm = old[0]?.bgm_url
      if (oldBgm?.startsWith('/api/my/music/')) {
        fs.unlink(path.join(MUSIC_DIR, path.basename(oldBgm)), () => {})
      }

      await pool.query(
        `UPDATE wedding_configs SET bgm_url = ? WHERE invitation_id = ?`,
        [musicUrl, req.invitation.id],
      )

      res.json({ bgm_url: musicUrl })
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {})
      next(err)
    }
  },
)

// Serve music files (auth protected for owner dashboard)
router.get('/music/:filename', requireUser, requireInvitation, async (req, res, next) => {
  try {
    const [configRows] = await pool.query(
      `SELECT bgm_url FROM wedding_configs WHERE invitation_id = ?`,
      [req.invitation.id],
    )
    const config = configRows[0]
    const musicUrl = `/api/my/music/${req.params.filename}`
    const allowed = config?.bgm_url === musicUrl
    if (!allowed) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Akses ditolak.' } })
    res.sendFile(path.join(MUSIC_DIR, req.params.filename))
  } catch (err) { next(err) }
})

export default router
