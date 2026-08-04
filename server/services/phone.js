export function normalizeIndonesianPhone(input) {
  if (typeof input !== 'string') return null
  const digits = input.trim().replace(/[\s().-]/g, '')
  if (!digits) return null
  let canonical = digits.startsWith('+') ? digits.slice(1) : digits
  if (canonical.startsWith('08')) canonical = `62${canonical.slice(1)}`
  if (canonical.startsWith('8')) canonical = `62${canonical}`
  if (!/^628\d{8,11}$/.test(canonical)) return null
  return canonical
}
