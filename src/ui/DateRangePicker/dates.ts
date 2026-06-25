/* Date primitives + range presets for the picker.
 *
 * Dates are passed around as `YYYY-MM-DD` strings (timezone-stable,
 * matches the server's LocalDate scalar and our cached `ticketDate`
 * column). All arithmetic uses noon-UTC to dodge DST edges, then
 * reformats via `toDateStr`. */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getTodayStr(): string {
  const d = new Date()
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

export function formatDateShort(dateStr: string, showYear: boolean): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) return dateStr
  if (showYear) return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`
  return `${SHORT_MONTHS[m - 1]} ${d}`
}

export function formatRange(start: string, end: string): string {
  const [sy] = start.split('-').map(Number)
  const [ey] = end.split('-').map(Number)
  const current = new Date().getFullYear()
  const showYear = sy !== current || ey !== current
  if (start === end) return formatDateShort(start, showYear)
  return `${formatDateShort(start, showYear)} – ${formatDateShort(end, showYear)}`
}

/** Calendar grid with leading nulls for empty cells before day 1, then
 *  the numeric days of the month, trailing nulls to fill out the week. */
export function getMonthGrid(
  year: number,
  month: number,
): ReadonlyArray<number | null> {
  const firstDay = new Date(year, month, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Monday-start
  const cells: Array<number | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/* ── Presets ────────────────────────────────────────────────────────── */

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'wtd'
  | 'mtd'
  | 'ytd'
  | 'last7'
  | 'last30'
  | 'last90'

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  wtd: 'Week to date',
  mtd: 'Month to date',
  ytd: 'Year to date',
  last7: 'Last 7 days',
  last30: 'Last 30 days',
  last90: 'Last 90 days',
}

export const ALL_DATE_PRESETS: ReadonlyArray<DatePreset> = [
  'today',
  'yesterday',
  'wtd',
  'mtd',
  'ytd',
  'last7',
  'last30',
  'last90',
]

/* ── Manual input parsing ───────────────────────────────────────────── */

/** Format a `YYYY-MM-DD` date string as `MM/DD/YYYY` for display in a
 *  typeable input. Returns '' on malformed input. */
export function formatDateForInput(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`
}

function validateYMD(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null
  }
  return toDateStr(y, m - 1, d)
}

/** Lenient date parser. Accepts `YYYY-MM-DD`, `M/D/YYYY`, `M/D/YY`,
 *  `M-D-YYYY`, `M.D.YYYY`, or `M/D` (current year). Two-digit years
 *  ≥70 are 1900s, otherwise 2000s. Returns canonical `YYYY-MM-DD` or
 *  `null` if the input doesn't parse. */
export function parseDateInput(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (m) return validateYMD(Number(m[1]), Number(m[2]), Number(m[3]))
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(s)
  if (m) {
    let y = Number(m[3])
    if (y < 100) y = y >= 70 ? 1900 + y : 2000 + y
    return validateYMD(y, Number(m[1]), Number(m[2]))
  }
  m = /^(\d{1,2})[./-](\d{1,2})$/.exec(s)
  if (m) {
    return validateYMD(new Date().getFullYear(), Number(m[1]), Number(m[2]))
  }
  return null
}

/** Resolve a preset to concrete `{ from, to }` date strings. Uses noon
 *  UTC for arithmetic so DST never shifts a date by ±1 day. */
export function resolveDatePreset(
  preset: DatePreset,
  todayOverride?: string,
): {
  from: string
  to: string
} {
  const now = new Date()
  const today =
    todayOverride ?? toDateStr(now.getFullYear(), now.getMonth(), now.getDate())
  const [y, m, d] = today.split('-').map(Number) as [number, number, number]
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const fmt = (dt: Date) =>
    toDateStr(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())

  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const yest = new Date(noon)
      yest.setUTCDate(yest.getUTCDate() - 1)
      const s = fmt(yest)
      return { from: s, to: s }
    }
    case 'wtd': {
      const dow = noon.getUTCDay()
      const diffToMon = dow === 0 ? 6 : dow - 1
      const monday = new Date(noon)
      monday.setUTCDate(monday.getUTCDate() - diffToMon)
      return { from: fmt(monday), to: today }
    }
    case 'mtd':
      return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: today }
    case 'ytd':
      return { from: `${y}-01-01`, to: today }
    case 'last7': {
      const s = new Date(noon)
      s.setUTCDate(s.getUTCDate() - 6)
      return { from: fmt(s), to: today }
    }
    case 'last30': {
      const s = new Date(noon)
      s.setUTCDate(s.getUTCDate() - 29)
      return { from: fmt(s), to: today }
    }
    case 'last90': {
      const s = new Date(noon)
      s.setUTCDate(s.getUTCDate() - 89)
      return { from: fmt(s), to: today }
    }
  }
}
