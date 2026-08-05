import { createHash, randomBytes } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import pool from '../db.js'
import { normalizeReturnPath } from './oauthPaths.js'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)
}

function base64url(buffer) {
  return buffer.toString('base64url')
}

export function createPkcePair() {
  const codeVerifier = base64url(randomBytes(32))
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest())
  return { codeVerifier, codeChallenge }
}

export { normalizeReturnPath } from './oauthPaths.js'

export async function createOAuthState(returnPath = '/account') {
  const state = base64url(randomBytes(24))
  const nonce = base64url(randomBytes(24))
  const { codeVerifier, codeChallenge } = createPkcePair()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await pool.query(
    `INSERT INTO oauth_states (state, code_verifier, nonce, return_path, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [state, codeVerifier, nonce, normalizeReturnPath(returnPath), expiresAt],
  )
  return { state, nonce, codeChallenge }
}

export async function consumeOAuthState(state) {
  const [rows] = await pool.query(
    `SELECT state, code_verifier, nonce, return_path
     FROM oauth_states
     WHERE state = ? AND expires_at > UTC_TIMESTAMP()`,
    [state],
  )
  if (!rows[0]) return null
  await pool.query('DELETE FROM oauth_states WHERE state = ?', [state])
  await pool.query('DELETE FROM oauth_states WHERE expires_at <= UTC_TIMESTAMP()')
  return rows[0]
}

export function buildGoogleAuthUrl({ state, nonce, codeChallenge }) {
  const params = new URLSearchParams({
    client_id: requiredEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: requiredEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  return `${GOOGLE_AUTH}?${params}`
}

export async function exchangeGoogleCode(code, codeVerifier) {
  const body = new URLSearchParams({
    code,
    client_id: requiredEnv('GOOGLE_CLIENT_ID'),
    client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: requiredEnv('GOOGLE_REDIRECT_URI'),
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  })
  const response = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google token exchange failed: ${response.status} ${text.slice(0, 200)}`)
  }
  return response.json()
}

export async function verifyGoogleIdToken(idToken, expectedNonce) {
  const { payload } = await jwtVerify(idToken, jwks, {
    audience: requiredEnv('GOOGLE_CLIENT_ID'),
  })
  if (!GOOGLE_ISSUERS.has(String(payload.iss))) {
    throw new Error('Invalid Google token issuer')
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Missing Google subject')
  }
  if (payload.nonce !== expectedNonce) {
    throw new Error('Invalid Google nonce')
  }
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('Google email is not verified')
  }
  return {
    subject: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
    displayName: typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim().slice(0, 255)
      : (payload.email || 'Pengguna MarryMe').slice(0, 255),
    avatarUrl: typeof payload.picture === 'string' ? payload.picture.slice(0, 2048) : null,
  }
}

export async function upsertGoogleUser(profile) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [existing] = await connection.query(
      'SELECT id, status FROM users WHERE google_subject = ? LIMIT 1 FOR UPDATE',
      [profile.subject],
    )
    if (existing[0]) {
      if (existing[0].status !== 'active') {
        throw Object.assign(new Error('User suspended'), { code: 'USER_SUSPENDED' })
      }
      await connection.query(
        `UPDATE users
         SET email = ?, display_name = ?, avatar_url = ?, last_login_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [profile.email, profile.displayName, profile.avatarUrl, existing[0].id],
      )
      await connection.commit()
      return Number(existing[0].id)
    }

    const [result] = await connection.query(
      `INSERT INTO users (google_subject, email, display_name, avatar_url, status, last_login_at)
       VALUES (?, ?, ?, ?, 'active', UTC_TIMESTAMP())`,
      [profile.subject, profile.email, profile.displayName, profile.avatarUrl],
    )
    await connection.commit()
    return Number(result.insertId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
