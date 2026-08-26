import { classifyBrowserHost } from '../routing/host'

const VISIT_ID_KEY = 'mm_visit_id'
let sent = false

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

function getVisitId(): string {
  try {
    const existing = localStorage.getItem(VISIT_ID_KEY)
    if (existing) return existing
    const fresh = randomUuid()
    localStorage.setItem(VISIT_ID_KEY, fresh)
    return fresh
  } catch {
    return randomUuid()
  }
}

export function trackVisit(): void {
  if (sent || typeof window === 'undefined') return
  sent = true

  try {
    const host = classifyBrowserHost(window.location.hostname)
    const payload = {
      slug: host.type === 'invitation' ? host.slug : null,
      path: `${window.location.pathname}${window.location.search}`.slice(0, 255) || '/',
      visitId: getVisitId(),
      referrer: document.referrer ? document.referrer.slice(0, 512) : null,
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Tracking is best-effort only.
  }
}
