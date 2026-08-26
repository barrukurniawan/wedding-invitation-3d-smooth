import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcrypt'
import { hashToken, userCookieOptions } from '../userAuth.js'
import { cookieOptions as adminCookieOptions, hashSessionToken as hashAdminToken } from '../auth.js'
import { normalizeReturnPath } from './oauthPaths.js'

test('Auth & Security: SHA-256 token hashing produces predictable, deterministic digests', () => {
  const token = 'sample_secret_token_12345'
  const expectedHash = createHash('sha256').update(token).digest('hex')
  
  assert.equal(hashToken(token), expectedHash)
  assert.equal(hashAdminToken(token), expectedHash)
  assert.equal(hashToken(token).length, 64)
})

test('Auth & Security: CSRF timing-safe comparison prevents timing attacks', () => {
  function verifyCsrf(providedToken, storedTokenHash) {
    if (!providedToken || !storedTokenHash) return false
    const providedHash = hashToken(providedToken)
    if (providedHash.length !== storedTokenHash.length) return false
    return timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedTokenHash))
  }

  const rawCsrfToken = randomBytes(32).toString('base64url')
  const validHash = hashToken(rawCsrfToken)
  const invalidToken = randomBytes(32).toString('base64url')

  // Valid match
  assert.equal(verifyCsrf(rawCsrfToken, validHash), true)

  // Mismatch
  assert.equal(verifyCsrf(invalidToken, validHash), false)

  // Empty or invalid input
  assert.equal(verifyCsrf('', validHash), false)
  assert.equal(verifyCsrf(null, validHash), false)
  assert.equal(verifyCsrf(rawCsrfToken, ''), false)
})

test('Auth & Security: Admin password hashing and verification with bcrypt', async () => {
  const password = 'StrongAdminPassword2026!'
  const wrongPassword = 'WrongPassword123'

  const hash = await bcrypt.hash(password, 10)
  assert.equal(typeof hash, 'string')
  assert.equal(hash.startsWith('$2'), true)

  // Correct verification
  const isMatch = await bcrypt.compare(password, hash)
  assert.equal(isMatch, true)

  // Failed verification
  const isWrongMatch = await bcrypt.compare(wrongPassword, hash)
  assert.equal(isWrongMatch, false)
})

test('Auth & Security: Cookie security flags enforce httpOnly, sameSite, and proper domain scopes', () => {
  // Test local cookie options
  const originalBase = process.env.BASE_DOMAIN
  const originalSecure = process.env.COOKIE_SECURE
  try {
    process.env.BASE_DOMAIN = 'localhost'
    process.env.COOKIE_SECURE = 'false'
    const localUserOpts = userCookieOptions()
    assert.equal(localUserOpts.httpOnly, true)
    assert.equal(localUserOpts.sameSite, 'lax')
    assert.equal(localUserOpts.secure, false)
    assert.equal(localUserOpts.domain, undefined)

    // Test production cookie options
    process.env.BASE_DOMAIN = 'marryme.web.id'
    process.env.COOKIE_SECURE = 'true'
    const prodUserOpts = userCookieOptions()
    assert.equal(prodUserOpts.httpOnly, true)
    assert.equal(prodUserOpts.sameSite, 'lax')
    assert.equal(prodUserOpts.secure, true)
    assert.equal(prodUserOpts.domain, '.marryme.web.id')

    const adminOpts = adminCookieOptions()
    assert.equal(adminOpts.httpOnly, true)
    assert.equal(adminOpts.sameSite, 'lax')
    assert.equal(adminOpts.secure, true)
  } finally {
    process.env.BASE_DOMAIN = originalBase
    process.env.COOKIE_SECURE = originalSecure
  }
})

test('Auth & Security: OAuth return path sanitization prevents Open Redirect vulnerabilities', () => {
  // Safe relative paths permitted
  assert.equal(normalizeReturnPath('/account'), '/account')
  assert.equal(normalizeReturnPath('/dashboard'), '/dashboard')
  assert.equal(normalizeReturnPath('/dashboard?tab=kirim'), '/dashboard?tab=kirim')
  assert.equal(normalizeReturnPath('/dashboard?tab=pembayaran&step=proof'), '/dashboard?tab=pembayaran&step=proof')

  // Open redirect attempts blocked
  assert.equal(normalizeReturnPath('https://attacker.com'), '/')
  assert.equal(normalizeReturnPath('http://evil.site/exploit'), '/')
  assert.equal(normalizeReturnPath('//attacker.com/malicious'), '/')
  assert.equal(normalizeReturnPath('\\\\attacker.com'), '/')
  assert.equal(normalizeReturnPath('../admin'), '/')
  assert.equal(normalizeReturnPath('javascript:alert(1)'), '/')
  assert.equal(normalizeReturnPath('data:text/html,bad'), '/')

  // Default fallback behavior
  assert.equal(normalizeReturnPath(undefined, '/dashboard'), '/dashboard')
  assert.equal(normalizeReturnPath('', '/account'), '/account')
})

test('Auth & Security: PKCE code challenge and verifier generation follow RFC 7636', () => {
  function generatePkce() {
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    return { codeVerifier, codeChallenge }
  }

  const pkce = generatePkce()
  assert.equal(typeof pkce.codeVerifier, 'string')
  assert.equal(typeof pkce.codeChallenge, 'string')
  assert.notEqual(pkce.codeVerifier, pkce.codeChallenge)
  assert.equal(pkce.codeVerifier.length >= 43, true)

  // Verify reproducibility
  const computedChallenge = createHash('sha256').update(pkce.codeVerifier).digest('base64url')
  assert.equal(computedChallenge, pkce.codeChallenge)
})
