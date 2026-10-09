export function fmtDate(ts: string): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function fmtIdr(amount: number): string {
  return idrFormatter.format(amount)
}

const numberFormatter = new Intl.NumberFormat('id-ID')

export function fmtNumber(value: number): string {
  return numberFormatter.format(value)
}

export function fmtShortDate(ts: string | null | undefined): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDayLabel(isoDate: string, long = false): string {
  const date = new Date(`${isoDate}T00:00:00`)
  return long
    ? date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// "baru saja", "5 mnt lalu", "3 jam lalu", "2 hari lalu", lalu tanggal.
export function fmtRelative(ts: string | null | undefined): string {
  if (!ts) return 'Belum pernah'
  const diff = Date.now() - new Date(ts).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return fmtShortDate(ts)
}

export const STATUS_META: Record<string, { label: string; color: string; tone: 'green' | 'amber' | 'red' | 'gray' }> = {
  active: { label: 'Aktif', color: '#16a34a', tone: 'green' },
  pending_verification: { label: 'Menunggu verifikasi', color: '#d97706', tone: 'amber' },
  awaiting_payment: { label: 'Menunggu bayar', color: '#d97706', tone: 'amber' },
  draft: { label: 'Draft', color: '#a8a29e', tone: 'gray' },
  expired: { label: 'Kedaluwarsa', color: '#57534e', tone: 'gray' },
  suspended: { label: 'Ditangguhkan', color: '#c0262d', tone: 'red' },
}

export function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, color: '#a8a29e', tone: 'gray' as const }
}

export function initials(name: string | null | undefined, fallback = '?'): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}
