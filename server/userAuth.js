import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import pool from './db.js'

export const USER_COOKIE = 'wedding_user_session'
const sessionHours = Math.max(1, Number(process.env.USER_SESSION_TTL_HOURS || process.env.SESSION_TTL_HOURS || 168))

export function userCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: sessionHours * 60 * 60 * 1000,
  }
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function createUserSession(userId, meta = {}) {
  const token = randomBytes(32).toString('base64url')
  const csrfToken = randomBytes(32).toString('base64url')
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000)
  await pool.query(
    `INSERT INTO user_sessions
      (id, user_id, token_hash, csrf_token_hash, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      hashToken(token),
      hashToken(csrfToken),
      expiresAt,
      meta.ip?.slice(0, 64) || null,
      meta.userAgent?.slice(0, 512) || null,
    ],
  )
  return { token, csrfToken, expiresAt }
}

export async function revokeUserSession(token) {
  if (!token) return
  await pool.query(
    'UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = ? AND revoked_at IS NULL',
    [hashToken(token)],
  )
}

export async function requireUser(req, res, next) {
  try {
    const token = req.cookies[USER_COOKIE]
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesi pengguna diperlukan.' } })
    }

    const [rows] = await pool.query(
      `SELECT s.id AS session_id, s.csrf_token_hash, u.id, u.email, u.display_name, u.avatar_url, u.status
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > UTC_TIMESTAMP()`,
      [hashToken(token)],
    )
    const row = rows[0]
    if (!row || row.status !== 'active') {
      res.clearCookie(USER_COOKIE, userCookieOptions())
      return res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Sesi pengguna telah berakhir.' } })
    }

    req.user = {
      id: Number(row.id),
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    }
    req.userSession = { id: row.session_id, csrfTokenHash: row.csrf_token_hash }
    await pool.query('UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [row.session_id])
    next()
  } catch (error) {
    next(error)
  }
}

export function requireCsrf(req, res, next) {
  const provided = req.get('x-csrf-token') || ''
  const expected = req.userSession?.csrfTokenHash
  if (!expected || !safeEqualHex(hashToken(provided), expected)) {
    return res.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Token keamanan tidak valid.' } })
  }
  next()
}

export async function issueCsrfToken(req) {
  const token = req.cookies[USER_COOKIE]
  if (!token || !req.userSession?.id) return null
  const csrfToken = randomBytes(32).toString('base64url')
  await pool.query('UPDATE user_sessions SET csrf_token_hash = ? WHERE id = ?', [
    hashToken(csrfToken),
    req.userSession.id,
  ])
  req.userSession.csrfTokenHash = hashToken(csrfToken)
  return csrfToken
}
