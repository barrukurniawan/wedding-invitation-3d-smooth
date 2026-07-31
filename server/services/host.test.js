import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyHost } from './host.js'
import { normalizeReturnPath } from './oauthPaths.js'

test('classifies root and invitation hosts exactly', () => {
  assert.deepEqual(classifyHost('marryme.web.id'), { type: 'root', hostname: 'marryme.web.id' })
  assert.deepEqual(classifyHost('localhost'), { type: 'root', hostname: 'localhost' })
  assert.deepEqual(classifyHost('127.0.0.1'), { type: 'root', hostname: '127.0.0.1' })
  assert.deepEqual(classifyHost('KIA-TONI.marryme.web.id.'), {
    type: 'invitation',
    hostname: 'kia-toni.marryme.web.id',
    slug: 'kia-toni',
  })
  assert.deepEqual(classifyHost('kia-toni.localhost'), {
    type: 'invitation',
    hostname: 'kia-toni.localhost',
    slug: 'kia-toni',
  })
})

test('rejects reserved, nested, malformed, and suffix-confusion hosts', () => {
  for (const hostname of [
    'admin.marryme.web.id',
    'www.marryme.web.id',
    'admin.localhost',
    'foo.bar.marryme.web.id',
    'foo.bar.localhost',
    '-foo.marryme.web.id',
    'foo-.marryme.web.id',
    'marryme.web.id.attacker.test',
    'evilmaryme.web.id',
    '',
  ]) {
    assert.deepEqual(classifyHost(hostname), { type: 'invalid' }, hostname)
  }
})

test('normalizes OAuth return paths to allowlisted root paths only', () => {
  assert.equal(normalizeReturnPath('/dashboard'), '/dashboard')
  assert.equal(normalizeReturnPath('/dashboard?tab=invite'), '/dashboard?tab=invite')
  assert.equal(normalizeReturnPath('https://evil.test'), '/dashboard')
  assert.equal(normalizeReturnPath('//evil.test'), '/dashboard')
  assert.equal(normalizeReturnPath('../admin'), '/dashboard')
  assert.equal(normalizeReturnPath('dashboard'), '/dashboard')
})
