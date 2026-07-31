import pool from '../db.js'
import { classifyHost, RESERVED_SLUGS, SLUG_PATTERN } from '../services/host.js'

function error(res, status, code, message) {
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
      `SELECT id, slug, status, reception_at, timezone, expires_at
       FROM invitations
       WHERE slug = ? AND deleted_at IS NULL
       LIMIT 1`,
      [slug],
    )
    const invitation = rows[0]

    if (!invitation) return error(res, 404, 'TENANT_NOT_FOUND', 'Undangan tidak ditemukan.')
    if (invitation.status === 'suspended') {
      return error(res, 403, 'INVITATION_SUSPENDED', 'Undangan sedang tidak tersedia.')
    }
    if (invitation.status === 'expired' || new Date(`${invitation.expires_at}Z`).getTime() <= Date.now()) {
      return error(res, 410, 'INVITATION_EXPIRED', 'Masa aktif undangan telah berakhir.')
    }
    if (invitation.status !== 'active') {
      return error(res, 404, 'INVITATION_INACTIVE', 'Undangan tidak ditemukan.')
    }

    req.invitation = invitation
    next()
  } catch (err) {
    next(err)
  }
}
