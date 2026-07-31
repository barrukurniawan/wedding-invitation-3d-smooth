import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import {
  buildGoogleAuthUrl,
  consumeOAuthState,
  createOAuthState,
  exchangeGoogleCode,
  googleConfigured,
  normalizeReturnPath,
  upsertGoogleUser,
  verifyGoogleIdToken,
} from '../services/googleOAuth.js'
import {
  USER_COOKIE,
  createUserSession,
  issueCsrfToken,
  requireCsrf,
  requireUser,
  revokeUserSession,
  userCookieOptions,
} from '../userAuth.js'

const router = Router()
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false })

function rootOrigin() {
  const base = (process.env.BASE_DOMAIN || 'marryme.web.id').toLowerCase()
  const protocol = process.env.COOKIE_SECURE === 'true' ? 'https' : 'http'
  if (process.env.ROOT_ORIGIN) return process.env.ROOT_ORIGIN.replace(/\/$/, '')
  if (base === 'localhost' || base === '127.0.0.1') return `http://${base}:${process.env.WEB_PORT || 5173}`
  return `${protocol}://${base}`
}

function redirectError(res, code) {
  return res.redirect(`${rootOrigin()}/dashboard?authError=${encodeURIComponent(code)}`)
}

router.get('/google/start', authLimit, async (req, res, next) => {
  try {
    if (!googleConfigured()) {
      return res.status(503).json({
        error: { code: 'OAUTH_NOT_CONFIGURED', message: 'Login Google belum dikonfigurasi.' },
      })
    }
    const returnPath = normalizeReturnPath(req.query.returnTo)
    const { state, nonce, codeChallenge } = await createOAuthState(returnPath)
    const url = buildGoogleAuthUrl({ state, nonce, codeChallenge })
    res.redirect(url)
  } catch (error) {
    next(error)
  }
})

router.get('/google/callback', authLimit, async (req, res) => {
  try {
    if (!googleConfigured()) return redirectError(res, 'OAUTH_NOT_CONFIGURED')
    if (req.query.error) return redirectError(res, 'OAUTH_DENIED')

    const state = typeof req.query.state === 'string' ? req.query.state : ''
    const code = typeof req.query.code === 'string' ? req.query.code : ''
    if (!state || !code) return redirectError(res, 'OAUTH_INVALID')

    const stored = await consumeOAuthState(state)
    if (!stored) return redirectError(res, 'OAUTH_STATE_INVALID')

    const tokenResponse = await exchangeGoogleCode(code, stored.code_verifier)
    if (!tokenResponse.id_token) return redirectError(res, 'OAUTH_TOKEN_INVALID')

    const profile = await verifyGoogleIdToken(tokenResponse.id_token, stored.nonce)
    const userId = await upsertGoogleUser(profile)
    const session = await createUserSession(userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.cookie(USER_COOKIE, session.token, userCookieOptions())
    // CSRF is rotated by GET /api/auth/me; do not put tokens in the redirect URL.
    res.redirect(`${rootOrigin()}${normalizeReturnPath(stored.return_path)}`)
  } catch (error) {
    console.error('Google OAuth callback error:', error.message)
    if (error.code === 'USER_SUSPENDED') return redirectError(res, 'USER_SUSPENDED')
    return redirectError(res, 'OAUTH_FAILED')
  }
})

router.get('/me', requireUser, async (req, res, next) => {
  try {
    const csrfToken = await issueCsrfToken(req)
    res.json({
      authenticated: true,
      user: req.user,
      csrfToken,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', requireUser, requireCsrf, async (req, res, next) => {
  try {
    await revokeUserSession(req.cookies[USER_COOKIE])
    res.clearCookie(USER_COOKIE, userCookieOptions()).status(204).end()
  } catch (error) {
    next(error)
  }
})

export default router
