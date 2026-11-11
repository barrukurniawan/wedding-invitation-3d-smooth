import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeStoryMoments } from './storyMoments.js'

test('normalizeStoryMoments: maks 5, buang kosong, potong panjang, foto hanya dari server sendiri', () => {
  assert.deepEqual(normalizeStoryMoments(null), [])
  assert.deepEqual(normalizeStoryMoments('bukan json'), [])
  const many = Array.from({ length: 8 }, (_, i) => ({ title: `Momen ${i}` }))
  assert.equal(normalizeStoryMoments(many).length, 5)
  const [m] = normalizeStoryMoments(JSON.stringify([{ time: ' Juni 2022 ', title: 'Pertemuan', description: 'x'.repeat(600), photo: '/api/public/photos/photo_1_ab.webp' }]))
  assert.equal(m.time, 'Juni 2022')
  assert.equal(m.description.length, 500)
  assert.equal(m.photo, '/api/public/photos/photo_1_ab.webp')
  assert.equal(normalizeStoryMoments([{ title: 'A', photo: 'https://evil.example/x.png' }])[0].photo, '')
  assert.equal(normalizeStoryMoments([{ title: 'A', photo: '/api/public/photos/../../etc' }])[0].photo, '')
  assert.deepEqual(normalizeStoryMoments([{ time: '2020' }, {}, 'x']), [])
})
