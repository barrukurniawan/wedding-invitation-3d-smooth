/**
 * Profanity & Content Moderation Filter
 * Filters inappropriate, vulgar, rude, and offensive words in Indonesian and English.
 */

// Whitelist of words/phrases that might contain substring matches but are completely safe
const SAFE_WHITELIST = new Set([
  'kontak',
  'kontakku',
  'mengontak',
  'dihubungi',
  'konsultasi',
  'konser',
  'kondisi',
  'kontribusi',
  'konsep',
  'konteks',
  'kontrak',
  'assalamualaikum',
  'assalamu',
  'assalam',
  'waalaikumsalam',
  'passionate',
  'compassion',
  'classic',
  'class',
  'grass',
  'glass',
  'mass',
  'masyarakat',
  'bimbingan',
  'membina',
  'pembina',
  'pembicara',
  'bicara',
  'pancing',
  'memancing',
  'terpancing',
  'sate',
  'taiwan',
  'tailor',
  'titik',
  'menitipkan',
  'titip',
  'itinerary',
])

// Indonesian bad words list (base forms)
const ID_BAD_WORDS = [
  'kontol',
  'memek',
  'jembut',
  'pepek',
  'peler',
  'peli',
  'itil',
  'ngentot',
  'entot',
  'ewita',
  'tetek',
  'toket',
  'ngocok',
  'coli',
  'crot',
  'pejuh',
  'bokep',
  'bugil',
  'telanjang',
  'pantek',
  'puki',
  'pukimak',
  'lonte',
  'perek',
  'pelacur',
  'jablay',
  'sundal',
  'germo',
  'anjing',
  'babi',
  'bangsat',
  'bajingan',
  'kampret',
  'tolol',
  'bego',
  'goblok',
  'idiot',
  'geblek',
  'bejad',
  'sinting',
  'setan',
  'iblis',
  'dajjal',
  'kafir',
  'bencong',
  'banci',
]

// English bad words list (base forms)
const EN_BAD_WORDS = [
  'fuck',
  'fucker',
  'fucking',
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
  'tits',
  'blowjob',
  'handjob',
  'dildo',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'porn',
  'porno',
  'semen',
]

// Leetspeak character mapping
const LEET_MAP = {
  '0': 'o',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '3': 'e',
  '4': 'a',
  '@': 'a',
  '5': 's',
  '$': 's',
  '7': 't',
  '+': 't',
  '8': 'b',
  '9': 'g',
}

/**
 * Normalizes text by converting leetspeak characters to standard letters.
 * @param {string} text
 * @returns {string}
 */
export function normalizeLeetspeak(text) {
  if (!text) return ''
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    result += LEET_MAP[char] || char
  }
  return result
}

/**
 * Collapses duplicate consecutive characters (e.g., "kooontoolll" -> "kontol")
 * @param {string} text
 * @returns {string}
 */
export function collapseRepeating(text) {
  return text.replace(/(.)\1{2,}/g, '$1$1')
}

/**
 * Clean and normalize text into tokens and compact forms for profanity scanning.
 * @param {string} input
 * @returns {{ raw: string, words: string[], compacted: string, deLeetCompacted: string }}
 */
function prepareTextVariants(input) {
  if (typeof input !== 'string') return { raw: '', words: [], compacted: '', deLeetCompacted: '' }

  const raw = input.trim()
  const lower = raw.toLowerCase()

  // Remove common punctuation to extract clean words
  const words = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  // Compact versions without spaces/symbols for evasion detection (e.g., "k.o.n.t.o.l" -> "kontol")
  const stripped = lower.replace(/[^a-z0-9]/g, '')
  const deLeet = normalizeLeetspeak(lower).replace(/[^a-z]/g, '')

  return {
    raw,
    words,
    compacted: stripped,
    deLeetCompacted: deLeet,
  }
}

const ALL_BAD_WORDS = Array.from(new Set([...ID_BAD_WORDS, ...EN_BAD_WORDS]))

/**
 * Checks if a single word or text contains profanity.
 * @param {string} text
 * @returns {{ hasProfanity: boolean, matched: string[] }}
 */
export function checkProfanity(text) {
  if (!text || typeof text !== 'string') {
    return { hasProfanity: false, matched: [] }
  }

  const { words, deLeetCompacted } = prepareTextVariants(text)
  const matched = new Set()

  // 1. Direct word token check with leet normalization
  for (const word of words) {
    if (SAFE_WHITELIST.has(word)) continue

    const deLeetWord = normalizeLeetspeak(word)
    const collapsed = deLeetWord.replace(/(.)\1+/g, '$1')

    for (const bad of ALL_BAD_WORDS) {
      if (word === bad || deLeetWord === bad || collapsed === bad) {
        matched.add(bad)
      }
    }
  }

  // 2. Compact string check for evasion attempts (like "k o n t o l", "k.o.n.t.o.l", "f_u_c_k")
  // Only trigger if length is reasonable and no whitelist keyword overrides it
  if (deLeetCompacted.length >= 3) {
    const collapsedDeLeet = deLeetCompacted.replace(/(.)\1+/g, '$1')

    for (const bad of ALL_BAD_WORDS) {
      if (bad.length < 3) continue

      // If bad word matches exact compacted form
      if (deLeetCompacted === bad || collapsedDeLeet === bad) {
        matched.add(bad)
        continue
      }

      // If the bad word is contained inside compacted form, verify it's not a whitelisted word
      if (deLeetCompacted.includes(bad) || collapsedDeLeet.includes(bad)) {
        let isWhitelisted = false
        for (const safe of SAFE_WHITELIST) {
          if (deLeetCompacted.includes(safe)) {
            isWhitelisted = true
            break
          }
        }
        if (!isWhitelisted) {
          matched.add(bad)
        }
      }
    }
  }

  return {
    hasProfanity: matched.size > 0,
    matched: Array.from(matched),
  }
}

/**
 * Validates guestbook submission payload for inappropriate content.
 * @param {{ name?: string, message?: string }} entry
 * @returns {{ isValid: boolean, error?: string, field?: string }}
 */
export function validateGuestbookContent({ name, message }) {
  if (name) {
    const nameCheck = checkProfanity(name)
    if (nameCheck.hasProfanity) {
      return {
        isValid: false,
        field: 'name',
        error: 'Nama mengandung kata atau ungkapan yang tidak pantas.',
      }
    }
  }

  if (message) {
    const msgCheck = checkProfanity(message)
    if (msgCheck.hasProfanity) {
      return {
        isValid: false,
        field: 'message',
        error: 'Ucapan mengandung kata atau ungkapan yang tidak pantas.',
      }
    }
  }

  return { isValid: true }
}
