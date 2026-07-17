import { createHash, randomBytes, randomUUID } from 'node:crypto'
import pool from './db.js'

const COOKIE_NAME = 'wedding_admin_session'
const sessionHours = Math.max(1, Number(process.env.SESSION_TTL_HOURS || 12))

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/api',
    maxAge: sessionHours * 60 * 60 * 1000,
  }
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('base64url')
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000)
  await pool.query(
    'INSERT INTO admin_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, userId, hashSessionToken(token), expiresAt],
  )
  return token
}

export async function deleteSession(token) {
  if (!token) return
  await pool.query('DELETE FROM admin_sessions WHERE token_hash = ?', [hashSessionToken(token)])
}

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME]
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesi admin diperlukan.' } })

    const [rows] = await pool.query(
      `SELECT u.id, u.username
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()`,
      [hashSessionToken(token)],
    )
    if (rows.length === 0) {
      res.clearCookie(COOKIE_NAME, cookieOptions())
      return res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Sesi admin telah berakhir.' } })
    }

    req.admin = rows[0]
    await pool.query('UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?', [hashSessionToken(token)])
    next()
  } catch (error) {
    next(error)
  }
}

export { COOKIE_NAME }
