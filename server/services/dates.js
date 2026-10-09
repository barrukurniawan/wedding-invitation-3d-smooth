// Serialisasi tanggal dari MySQL ke ISO. TIMESTAMP datang sebagai Date (pool memakai
// dateStrings hanya untuk DATETIME); String(Date) menghasilkan teks yang tidak bisa di-parse.
export function toIsoString(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  return String(value).replace(' ', 'T')
}
