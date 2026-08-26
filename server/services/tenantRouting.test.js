import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyHost, buildPublicUrl, RESERVED_SLUGS, SLUG_PATTERN } from './host.js'

test('Tenant Routing: Host classification accurately identifies root, tenant, and local environments', () => {
  // Production root
  assert.deepEqual(classifyHost('marryme.web.id'), { type: 'root', hostname: 'marryme.web.id' })
  assert.deepEqual(classifyHost('MARRYME.WEB.ID.'), { type: 'root', hostname: 'marryme.web.id' })

  // Local development root
  assert.deepEqual(classifyHost('localhost'), { type: 'root', hostname: 'localhost' })
  assert.deepEqual(classifyHost('127.0.0.1'), { type: 'root', hostname: '127.0.0.1' })

  // Subdomain / Tenant hosts
  assert.deepEqual(classifyHost('kia-toni.marryme.web.id'), {
    type: 'invitation',
    hostname: 'kia-toni.marryme.web.id',
    slug: 'kia-toni',
  })
  assert.deepEqual(classifyHost('budi-siti2026.marryme.web.id'), {
    type: 'invitation',
    hostname: 'budi-siti2026.marryme.web.id',
    slug: 'budi-siti2026',
  })
  assert.deepEqual(classifyHost('my-wedding.localhost'), {
    type: 'invitation',
    hostname: 'my-wedding.localhost',
    slug: 'my-wedding',
  })
})

test('Tenant Routing: Blocks all reserved subdomains from being treated as invitations', () => {
  const reservedList = ['admin', 'www', 'api', 'app', 'login', 'dashboard', 'static', 'assets', 'support']
  for (const slug of reservedList) {
    assert.equal(RESERVED_SLUGS.has(slug), true, `Slug ${slug} must be in RESERVED_SLUGS`)
    assert.deepEqual(classifyHost(`${slug}.marryme.web.id`), { type: 'invalid' }, `Host ${slug}.marryme.web.id must be invalid`)
    assert.deepEqual(classifyHost(`${slug}.localhost`), { type: 'invalid' }, `Host ${slug}.localhost must be invalid`)
  }
})

test('Tenant Routing: Rejects nested subdomains, malformed patterns, and domain spoofing attacks', () => {
  const invalidHosts = [
    'foo.bar.marryme.web.id',     // Nested subdomain
    'nested.tenant.localhost',    // Nested local
    '-start-dash.marryme.web.id', // Leading hyphen
    'end-dash-.marryme.web.id',   // Trailing hyphen
    'special@char.marryme.web.id',// Special characters
    'evilmarryme.web.id',         // Suffix confusion
    'marryme.web.id.evil.com',    // Appending target domain
    'attacker.com',               // Completely unrelated domain
    '',                           // Empty string
    '   ',                        // Whitespace only
  ]

  for (const host of invalidHosts) {
    assert.deepEqual(classifyHost(host), { type: 'invalid' }, `Host "${host}" should be classified as invalid`)
  }
})

test('Tenant Routing: SLUG_PATTERN enforces valid subdomain slug formats', () => {
  // Valid slugs
  assert.equal(SLUG_PATTERN.test('kia-toni'), true)
  assert.equal(SLUG_PATTERN.test('budi2026'), true)
  assert.equal(SLUG_PATTERN.test('a'), true)
  assert.equal(SLUG_PATTERN.test('a-b-c-d'), true)
  assert.equal(SLUG_PATTERN.test('wedding-of-romeo-and-juliet-2026'), true)

  // Invalid slugs
  assert.equal(SLUG_PATTERN.test('-leading'), false)
  assert.equal(SLUG_PATTERN.test('trailing-'), false)
  assert.equal(SLUG_PATTERN.test('space in slug'), false)
  assert.equal(SLUG_PATTERN.test('UPPERCASE'), false)
  assert.equal(SLUG_PATTERN.test('special!@#'), false)
  assert.equal(SLUG_PATTERN.test('a'.repeat(64)), false) // Exceeds max length of 63 chars
})

test('Tenant Routing: buildPublicUrl generates correct URLs for production and local environments', () => {
  const origBase = process.env.BASE_DOMAIN
  const origSecure = process.env.COOKIE_SECURE
  const origPort = process.env.WEB_PORT

  try {
    // Production URL builder (HTTPS)
    process.env.BASE_DOMAIN = 'marryme.web.id'
    process.env.COOKIE_SECURE = 'true'
    assert.equal(buildPublicUrl('kia-toni'), 'https://kia-toni.marryme.web.id')

    // Insecure production (HTTP)
    process.env.COOKIE_SECURE = 'false'
    assert.equal(buildPublicUrl('kia-toni'), 'http://kia-toni.marryme.web.id')

    // Local development URL builder
    process.env.BASE_DOMAIN = 'localhost'
    process.env.WEB_PORT = '5173'
    assert.equal(buildPublicUrl('budi-siti'), 'http://budi-siti.localhost:5173')
  } finally {
    process.env.BASE_DOMAIN = origBase
    process.env.COOKIE_SECURE = origSecure
    process.env.WEB_PORT = origPort
  }
})

test('Tenant Routing: Status access rules simulate tenant lifecycle correctly', () => {
  function evaluateTenantAccess(invitation, requestingUser, isDev = false) {
    if (!invitation || invitation.deleted_at) {
      return { status: 404, code: 'TENANT_NOT_FOUND' }
    }
    if (invitation.status === 'suspended') {
      return { status: 403, code: 'INVITATION_SUSPENDED' }
    }
    if (invitation.status === 'expired' || new Date(`${invitation.expires_at}Z`).getTime() <= Date.now()) {
      return { status: 410, code: 'INVITATION_EXPIRED' }
    }
    if (invitation.status !== 'active') {
      if (!isDev) {
        if (!requestingUser || requestingUser.id !== invitation.owner_user_id) {
          return { status: 404, code: 'INVITATION_INACTIVE' }
        }
      }
    }
    return { status: 200, access: 'granted' }
  }

  const activeTenant = { id: 1, owner_user_id: 10, status: 'active', expires_at: '2099-01-01T00:00:00' }
  const draftTenant = { id: 2, owner_user_id: 10, status: 'draft', expires_at: '2099-01-01T00:00:00' }
  const suspendedTenant = { id: 3, owner_user_id: 10, status: 'suspended', expires_at: '2099-01-01T00:00:00' }
  const expiredTenant = { id: 4, owner_user_id: 10, status: 'active', expires_at: '2020-01-01T00:00:00' }

  // 1. Active tenant is accessible publicly
  assert.deepEqual(evaluateTenantAccess(activeTenant, null), { status: 200, access: 'granted' })

  // 2. Draft tenant is 404 for unauthenticated visitors
  assert.deepEqual(evaluateTenantAccess(draftTenant, null), { status: 404, code: 'INVITATION_INACTIVE' })

  // 3. Draft tenant is 404 for other authenticated users
  assert.deepEqual(evaluateTenantAccess(draftTenant, { id: 99 }), { status: 404, code: 'INVITATION_INACTIVE' })

  // 4. Draft tenant is accessible for owner
  assert.deepEqual(evaluateTenantAccess(draftTenant, { id: 10 }), { status: 200, access: 'granted' })

  // 5. Suspended tenant is forbidden
  assert.deepEqual(evaluateTenantAccess(suspendedTenant, { id: 10 }), { status: 403, code: 'INVITATION_SUSPENDED' })

  // 6. Expired tenant returns 410 Gone
  assert.deepEqual(evaluateTenantAccess(expiredTenant, null), { status: 410, code: 'INVITATION_EXPIRED' })
})
