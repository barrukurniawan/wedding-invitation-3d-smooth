import pool from '../db.js'
import { classifyHost, RESERVED_SLUGS, SLUG_PATTERN } from '../services/host.js'
import { getUserSession } from '../userAuth.js'
import { guestAccess } from '../services/trial.js'

function error(res, status, code, message) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  return res.status(status).json({ error: { code, message } })
}

export function attachHostContext(req, res, next) {
  const context = classifyHost(req.hostname)
  if (context.type === 'invalid') {
    return error(res, 400, 'INVALID_HOST', 'Host tidak valid.')
  }
  req.hostContext = context
  next()
}

export function requireRootHost(req, res, next) {
  if (req.hostContext?.type !== 'root') {
    return error(res, 404, 'ROOT_HOST_REQUIRED', 'Halaman tidak ditemukan.')
  }
  next()
}

export async function requirePublicInvitation(req, res, next) {
  const slug = req.hostContext?.type === 'invitation' ? req.hostContext.slug : null

  if (!slug || !SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug)) {
    return error(res, 404, 'TENANT_HOST_REQUIRED', 'Undangan tidak ditemukan.')
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, owner_user_id, slug, status, reception_at, timezone, expires_at, trial_ends_at, paid_at
       FROM invitations
       WHERE slug = ? AND deleted_at IS NULL
       LIMIT 1`,
      [slug],
    )
    const invitation = rows[0]

    if (!invitation) return error(res, 404, 'TENANT_NOT_FOUND', 'Undangan tidak ditemukan.')

    // Aturan akses tamu (uji coba 3 hari, bayar = selamanya, akun gratis lama = 7 hari setelah resepsi).
    const access = guestAccess(invitation)
    if (!access.ok) {
      // Draft / uji coba habis: pemilik yang login tetap bisa pratinjau.
      const user = access.ownerPreview ? await getUserSession(req) : null
      const isDev = process.env.NODE_ENV === 'development' && access.code === 'INVITATION_INACTIVE'
      if (!isDev && (!user || user.id !== invitation.owner_user_id)) {
        return error(res, access.status, access.code, access.message)
      }
    }

    req.invitation = invitation
    req.invitationTrial = Boolean(access.trial)
    next()
  } catch (err) {
    next(err)
  }
}
