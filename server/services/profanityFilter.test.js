import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkProfanity,
  validateGuestbookContent,
  normalizeLeetspeak,
} from './profanityFilter.js'

test('Profanity Filter: Normalizes leetspeak characters accurately', () => {
  assert.equal(normalizeLeetspeak('k0nt0l'), 'kontol')
  assert.equal(normalizeLeetspeak('b1tch'), 'bitch')
  assert.equal(normalizeLeetspeak('f!ck'), 'fick')
  assert.equal(normalizeLeetspeak('4nj1ng'), 'anjing')
  assert.equal(normalizeLeetspeak('ng3nt0t'), 'ngentot')
})

test('Profanity Filter: Catches direct Indonesian vulgar words', () => {
  const badWords = [
    'kontol',
    'memek',
    'jembut',
    'pepek',
    'itil',
    'ngentot',
    'anjing',
    'babi',
    'bangsat',
    'bajingan',
    'pantek',
    'puki',
    'lonte',
    'pelacur',
    'jablay',
    'tolol',
    'goblok',
    'bego',
  ]

  for (const word of badWords) {
    const result = checkProfanity(word)
    assert.equal(result.hasProfanity, true, `Expected "${word}" to be flagged as profanity`)
  }
})

test('Profanity Filter: Catches direct English vulgar words', () => {
  const badWords = [
    'fuck',
    'fucking',
    'fucker',
    'shit',
    'bullshit',
    'bitch',
    'cunt',
    'asshole',
    'bastard',
    'dick',
    'cock',
    'pussy',
    'boobs',
    'slut',
    'whore',
  ]

  for (const word of badWords) {
    const result = checkProfanity(word)
    assert.equal(result.hasProfanity, true, `Expected "${word}" to be flagged as profanity`)
  }
})

test('Profanity Filter: Catches evasion tactics (leetspeak, dots, spaces, repeating letters)', () => {
  const evasions = [
    'k0nt0l',
    'K.O.N.T.O.L',
    'k o n t o l',
    'k_o_n_t_o_l',
    'kooontoolll',
    'f u c k',
    'f.u.c.k',
    'fuuuuuck',
    'b1tch',
    'b!tch',
    '4nj1ng',
    'ng3nt000t',
    'm3m3k',
    'j3mbut',
  ]

  for (const evasion of evasions) {
    const result = checkProfanity(evasion)
    assert.equal(result.hasProfanity, true, `Expected evasion "${evasion}" to be detected`)
  }
})

test('Profanity Filter: Whitelist allows safe wedding and conversational words without false positives', () => {
  const safePhrases = [
    'Selamat menikah untuk kedua mempelai!',
    'Semoga menjadi keluarga sakinah mawaddah warahmah.',
    'Assalamu\'alaikum warahmatullah, selamat ya!',
    'Wa\'alaikumsalam, terima kasih undangannya.',
    'Nanti saya hubungi lewat kontak WA ya.',
    'Mohon maaf belum bisa hadir karena ada jadwal konsultasi.',
    'Selamat dan sukses, semoga langgeng sampai kakek nenek.',
    'Doa terbaik untuk kalian berdua.',
    'Very passionate and lovely couple, happy wedding!',
    'Classic and beautiful celebration.',
  ]

  for (const phrase of safePhrases) {
    const result = checkProfanity(phrase)
    assert.equal(result.hasProfanity, false, `Expected phrase "${phrase}" to be clean, but got: ${result.matched.join(', ')}`)
  }
})

test('Profanity Filter: validateGuestbookContent flags bad name or bad message accurately', () => {
  // Bad name
  const res1 = validateGuestbookContent({
    name: 'Kontol',
    message: 'Selamat ya bro',
  })
  assert.equal(res1.isValid, false)
  assert.equal(res1.field, 'name')

  // Bad message
  const res2 = validateGuestbookContent({
    name: 'Budi',
    message: 'Gue sumpahin cepet cere f u c k you',
  })
  assert.equal(res2.isValid, false)
  assert.equal(res2.field, 'message')

  // Clean entry
  const res3 = validateGuestbookContent({
    name: 'Ahmad & Keluarga',
    message: 'Barakallahu lakuma wa baraka alaikuma.',
  })
  assert.equal(res3.isValid, true)
})
