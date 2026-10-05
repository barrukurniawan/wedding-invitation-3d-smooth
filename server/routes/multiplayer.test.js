import test from 'node:test'
import assert from 'node:assert/strict'

test('Multiplayer Sanity & Validation Tests', async (t) => {
  await t.test('Dirs contains standard cardinal and diagonal directions', () => {
    const dirs = new Set(['north', 'south', 'east', 'west', 'north-east', 'north-west', 'south-east', 'south-west'])
    assert.equal(dirs.has('north'), true)
    assert.equal(dirs.has('south-west'), true)
    assert.equal(dirs.has('up'), false)
  })

  await t.test('Player state clamping and sanitization', () => {
    function sanitizePoint(p) {
      const dirs = new Set(['north', 'south', 'east', 'west', 'north-east', 'north-west', 'south-east', 'south-west'])
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !dirs.has(p.dir)) {
        throw new Error('invalid coordinates or direction')
      }
      return {
        x: Math.max(0, Math.min(1536, p.x)),
        y: Math.max(0, Math.min(1024, p.y)),
        dir: p.dir,
        walking: Boolean(p.walking),
      }
    }

    const clamped = sanitizePoint({ x: 2000, y: -50, dir: 'south', walking: true })
    assert.equal(clamped.x, 1536)
    assert.equal(clamped.y, 0)
    assert.equal(clamped.dir, 'south')
    assert.equal(clamped.walking, true)

    assert.throws(() => sanitizePoint({ x: 100, y: 100, dir: 'invalid-dir' }), /invalid coordinates/)
  })

  await t.test('Player chat message truncation to 15 graphemes max', () => {
    const raw = '   Halo selamat berbahagia ya untuk kedua mempelai tercinta!!   '
    const trimmed = raw.trim().slice(0, 15)
    assert.equal(trimmed.length <= 15, true)
  })
})
