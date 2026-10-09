// Klasifikasi sumber kunjungan dan perapian path untuk analitik admin (hanya baca).

// Parameter iklan/pelacak + parameter dev; dibuang supaya link yang sama dihitung satu path.
const NOISE_PARAMS = new Set(['fbclid', 'gclid', 'igshid', 'mibextid', 'ttclid', 'msclkid', '_gl', 'ref', 'authError', 'perf', 'spawn', 'venue', 'gesture'])

const UTM_SOURCES = [
  [/^(ig|instagram)$/i, 'Instagram'],
  [/^(fb|facebook)$/i, 'Facebook'],
  [/^threads$/i, 'Threads'],
  [/^(wa|whatsapp)$/i, 'WhatsApp'],
  [/^tiktok$/i, 'TikTok'],
  [/^google$/i, 'Google'],
  [/^(x|twitter)$/i, 'X'],
]

const REFERRER_HOSTS = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'],
  [/(^|\.)threads\.(net|com)$/, 'Threads'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)google\.[a-z.]+$/, 'Google'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X'],
  [/(^|\.)marryme\.web\.id$|^localhost$|\.localhost$/, 'Internal'],
]

function parseQuery(path) {
  const index = typeof path === 'string' ? path.indexOf('?') : -1
  return index >= 0 ? new URLSearchParams(path.slice(index + 1)) : new URLSearchParams()
}

export function classifySource(referrer, path) {
  const query = parseQuery(path)
  const utm = query.get('utm_source')
  if (utm) {
    const match = UTM_SOURCES.find(([pattern]) => pattern.test(utm.trim()))
    return match ? match[1] : 'Lainnya'
  }
  if (query.has('fbclid')) return 'Facebook'
  if (!referrer) return 'Langsung'
  let host
  try {
    host = new URL(referrer).hostname.toLowerCase()
  } catch {
    return 'Lainnya'
  }
  const match = REFERRER_HOSTS.find(([pattern]) => pattern.test(host))
  return match ? match[1] : 'Lainnya'
}

export function normalizePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return '/'
  const index = path.indexOf('?')
  if (index < 0) return path
  const base = path.slice(0, index) || '/'
  const query = new URLSearchParams(path.slice(index + 1))
  const kept = [...query.entries()].filter(([key]) => !key.startsWith('utm_') && !NOISE_PARAMS.has(key))
  return kept.length ? `${base}?${new URLSearchParams(kept).toString()}` : base
}

// Gabungkan baris [{ key, views }] ke Map berdasarkan fungsi kunci, urut menurun.
export function sumBy(rows, keyOf) {
  const totals = new Map()
  for (const row of rows) {
    const key = keyOf(row)
    totals.set(key, (totals.get(key) || 0) + Number(row.views || 0))
  }
  return [...totals.entries()].map(([key, views]) => ({ key, views })).sort((a, b) => b.views - a.views)
}
