const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('id-ID')

export const fmtIdr = (value: number) => idr.format(value).replace(/ /g, ' ')
export const fmtNum = (value: number) => num.format(value)

export const discountPct = (normal: number, current: number) =>
  normal > 0 ? Math.round(((normal - current) / normal) * 100) : 0

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; total: number }

export function splitRemaining(ms: number): CountdownParts {
  const total = Math.max(0, ms)
  const s = Math.floor(total / 1000)
  return {
    total,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
