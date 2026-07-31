export type HostContext =
  | { type: 'root' }
  | { type: 'invitation'; slug: string }
  | { type: 'invalid' }

const BASE_DOMAIN = (import.meta.env.VITE_BASE_DOMAIN || 'marryme.web.id').toLowerCase()
const RESERVED = new Set(['www', 'api', 'admin', 'app', 'login', 'dashboard', 'static', 'assets', 'support'])
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function classifyBrowserHost(hostname: string): HostContext {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '')

  if (host === 'localhost' || host === '127.0.0.1' || host === BASE_DOMAIN) {
    return { type: 'root' }
  }

  const suffix = host.endsWith('.localhost') ? '.localhost' : `.${BASE_DOMAIN}`
  if (!host.endsWith(suffix)) return { type: 'invalid' }

  const slug = host.slice(0, -suffix.length)
  if (!SLUG.test(slug) || RESERVED.has(slug) || slug.includes('.')) return { type: 'invalid' }
  return { type: 'invitation', slug }
}

export function isRootHost(hostname: string) {
  return classifyBrowserHost(hostname).type === 'root'
}
