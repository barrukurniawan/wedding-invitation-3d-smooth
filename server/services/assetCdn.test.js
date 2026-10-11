import assert from 'node:assert/strict'
import test from 'node:test'
import { assetCdnBase } from './assetCdn.js'

test('valid pinned jsDelivr base is accepted (trailing slash trimmed)', () => {
  const base = 'https://cdn.jsdelivr.net/gh/barrukurniawan/marryme-assets@v2026.10.11-1'
  assert.equal(assetCdnBase({ ASSET_CDN_BASE: base }), base)
  assert.equal(assetCdnBase({ ASSET_CDN_BASE: base + '/' }), base)
})

test('empty, unpinned, or foreign bases disable the CDN', () => {
  assert.equal(assetCdnBase({}), null)
  assert.equal(assetCdnBase({ ASSET_CDN_BASE: '' }), null)
  assert.equal(assetCdnBase({ ASSET_CDN_BASE: 'https://cdn.jsdelivr.net/gh/barrukurniawan/marryme-assets' }), null)
  assert.equal(assetCdnBase({ ASSET_CDN_BASE: 'https://cdn.jsdelivr.net/gh/barrukurniawan/marryme-assets@main' }), null)
  assert.equal(assetCdnBase({ ASSET_CDN_BASE: 'https://evil.example.com/x@v2026.10.11-1' }), null)
})
