export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

export const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const

/**
 * Format ISO date (YYYY-MM-DD) to full Indonesian format: "Minggu, 16 Agustus 2026"
 */
export function formatIndonesianDate(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const trimmed = isoDate.slice(0, 10)
  const parts = trimmed.split('-').map(Number)
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return ''
  const [y, m, d] = parts
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const dayName = INDONESIAN_DAYS[date.getUTCDay()]
  const monthName = INDONESIAN_MONTHS[m - 1]
  return `${dayName}, ${d} ${monthName} ${y}`
}

/**
 * Extract YYYY-MM-DD from any date string format:
 * - ISO: "2026-08-16T08:00:00" or "2026-08-16 08:00:00" or "2026-08-16"
 * - DD-MM-YYYY / DD/MM/YYYY: "16/08/2026" or "16-08-2026"
 * - Indonesian text: "Minggu, 16 Agustus 2026" or "16 Agustus 2026"
 */
export function extractIsoDate(str: string | null | undefined): string {
  if (!str) return ''
  const trimmed = String(str).trim()

  // 1. Standard ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  // 2. Common DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = trimmed.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0')
    const month = String(dmyMatch[2]).padStart(2, '0')
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }

  // 3. Indonesian verbal date format: "Minggu, 16 Agustus 2026" or "16 Agustus 2026"
  const textMatch = trimmed.match(
    /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i,
  )
  if (textMatch) {
    const day = String(textMatch[1]).padStart(2, '0')
    const monthIdx = INDONESIAN_MONTHS.findIndex(
      (m) => m.toLowerCase() === textMatch[2].toLowerCase(),
    )
    if (monthIdx !== -1) {
      const month = String(monthIdx + 1).padStart(2, '0')
      const year = textMatch[3]
      return `${year}-${month}-${day}`
    }
  }

  return ''
}

/**
 * Extract start time, end time, and timezone from time strings like "08:00 - 10:00 WIB"
 */
export function extractTimes(timeStr: string | null | undefined): {
  startTime: string
  endTime: string
  timezone: 'WIB' | 'WITA' | 'WIT'
} {
  const defaultRes = {
    startTime: '08:00',
    endTime: '10:00',
    timezone: 'WIB' as const,
  }
  if (!timeStr || timeStr.toLowerCase().includes('segera diumumkan')) {
    return defaultRes
  }

  const tzMatch = timeStr.match(/\b(WIB|WITA|WIT)\b/i)
  const timezone = (tzMatch ? tzMatch[1].toUpperCase() : 'WIB') as 'WIB' | 'WITA' | 'WIT'

  const timeMatches = timeStr.match(/\b(\d{1,2}:\d{2})\b/g)
  if (!timeMatches || timeMatches.length === 0) {
    return { ...defaultRes, timezone }
  }

  const startTime = timeMatches[0].padStart(5, '0')
  const endTime = timeMatches.length > 1 ? timeMatches[1].padStart(5, '0') : '10:00'

  return {
    startTime,
    endTime,
    timezone,
  }
}

/**
 * Construct formatted Indonesian time string e.g. "08:00 - 10:00 WIB"
 */
export function buildTimeString(
  startTime: string,
  endTime: string,
  timezone: 'WIB' | 'WITA' | 'WIT' = 'WIB',
): string {
  if (!startTime && !endTime) return ''
  if (startTime && endTime) {
    return `${startTime} - ${endTime} ${timezone}`
  }
  if (startTime) {
    return `${startTime} ${timezone}`
  }
  return ''
}

/**
 * Combine date (YYYY-MM-DD) and start time (HH:mm) into an ISO datetime string for wedding_date
 */
export function combineToIsoDateTime(isoDate: string, startTime: string): string {
  if (!isoDate) return ''
  const validTime = startTime && /^\d{2}:\d{2}$/.test(startTime) ? `${startTime}:00` : '08:00:00'
  return `${isoDate}T${validTime}`
}
