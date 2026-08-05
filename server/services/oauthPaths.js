export function normalizeReturnPath(raw, fallback = '/') {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return fallback
  }
  if (raw.length > 255 || raw.includes('://')) return fallback
  return raw
}
