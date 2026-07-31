const DEFAULT_BASE_DOMAIN = 'marryme.web.id'
export const RESERVED_SLUGS = new Set([
  'www', 'api', 'admin', 'app', 'login', 'dashboard', 'static', 'assets', 'support',
])
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function classifyHost(rawHostname, baseDomain = process.env.BASE_DOMAIN || DEFAULT_BASE_DOMAIN) {
  const hostname = String(rawHostname || '').trim().toLowerCase().replace(/\.$/, '')
  const normalizedBase = baseDomain.trim().toLowerCase().replace(/\.$/, '')

  if (!hostname || hostname.includes(':')) return { type: 'invalid' }
  if (hostname === normalizedBase || hostname === 'localhost' || hostname === '127.0.0.1') {
    return { type: 'root', hostname }
  }

  const suffix = hostname.endsWith('.localhost') ? '.localhost' : `.${normalizedBase}`
  if (!hostname.endsWith(suffix)) return { type: 'invalid' }

  const slug = hostname.slice(0, -suffix.length)
  if (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug)) return { type: 'invalid' }
  return { type: 'invitation', hostname, slug }
}
