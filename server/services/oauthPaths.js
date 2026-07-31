export function normalizeReturnPath(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return '/dashboard'
  }
  if (raw.length > 255 || raw.includes('://')) return '/dashboard'
  return raw
}
