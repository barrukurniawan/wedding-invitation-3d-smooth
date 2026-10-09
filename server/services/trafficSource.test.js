import assert from 'node:assert/strict'
import test from 'node:test'
import { classifySource, normalizePath, sumBy } from './trafficSource.js'

test('utm_source wins over referrer', () => {
  assert.equal(classifySource('https://l.facebook.com/', '/?utm_source=ig&utm_medium=social'), 'Instagram')
  assert.equal(classifySource(null, '/?utm_source=threads'), 'Threads')
  assert.equal(classifySource(null, '/?utm_source=newsletter'), 'Lainnya')
})

test('fbclid without utm counts as Facebook', () => {
  assert.equal(classifySource(null, '/?fbclid=abc'), 'Facebook')
})

test('referrer hosts are classified', () => {
  assert.equal(classifySource('https://l.instagram.com/?u=x', '/'), 'Instagram')
  assert.equal(classifySource('https://lm.facebook.com/', '/'), 'Facebook')
  assert.equal(classifySource('https://www.google.co.id/', '/'), 'Google')
  assert.equal(classifySource('https://wa.me/123', '/'), 'WhatsApp')
  assert.equal(classifySource('https://kia-toni.marryme.web.id/', '/'), 'Internal')
  assert.equal(classifySource('https://example.com/', '/'), 'Lainnya')
  assert.equal(classifySource('not a url', '/'), 'Lainnya')
})

test('no referrer and no utm is direct', () => {
  assert.equal(classifySource(null, '/'), 'Langsung')
  assert.equal(classifySource('', '/account'), 'Langsung')
})

test('normalizePath strips tracking and dev params', () => {
  assert.equal(normalizePath('/?fbclid=abc&utm_source=ig'), '/')
  assert.equal(normalizePath('/?perf=&spawn=stage&venue=beach'), '/')
  assert.equal(normalizePath('/account?authError=OAUTH_STATE_INVALID'), '/account')
  assert.equal(normalizePath('/?page=2&utm_medium=x'), '/?page=2')
  assert.equal(normalizePath('/admin'), '/admin')
  assert.equal(normalizePath(null), '/')
})

test('sumBy merges rows by key and sorts descending', () => {
  const rows = [{ path: '/?fbclid=1', views: 2 }, { path: '/', views: 3 }, { path: '/admin', views: 4 }]
  assert.deepEqual(sumBy(rows, (r) => normalizePath(r.path)), [{ key: '/', views: 5 }, { key: '/admin', views: 4 }])
})
