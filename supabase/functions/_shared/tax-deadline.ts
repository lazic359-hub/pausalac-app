/** Kopija lib/tax-deadline.ts za Edge Function (Beograd kalendar). */
const ORTHODOX_EASTER: Record<number, string> = {
  2024: '2024-05-05',
  2025: '2025-04-20',
  2026: '2026-04-12',
  2027: '2027-05-02',
  2028: '2028-04-16',
  2029: '2029-04-08',
  2030: '2030-04-28',
}

function getOrthodoxEaster(year: number): Date | null {
  const s = ORTHODOX_EASTER[year]
  if (!s) return null
  return new Date(s + 'T12:00:00')
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isNonWorkingDay(d: Date): boolean {
  const day = d.getDay()
  if (day === 0 || day === 6) return true

  const y = d.getFullYear()
  const key = dateKey(d)

  const fixed: string[] = [
    `${y}-01-01`,
    `${y}-01-02`,
    `${y}-01-07`,
    `${y}-01-27`,
    `${y}-02-15`,
    `${y}-02-16`,
    `${y}-02-17`,
    `${y}-05-01`,
    `${y}-05-02`,
    `${y}-05-09`,
    `${y}-11-11`,
  ]

  if (fixed.includes(key)) return true

  const easter = getOrthodoxEaster(y)
  if (easter) {
    const easterKey = dateKey(easter)
    const goodFriday = new Date(easter)
    goodFriday.setDate(goodFriday.getDate() - 2)
    const easterMonday = new Date(easter)
    easterMonday.setDate(easterMonday.getDate() + 1)
    if (key === easterKey || key === dateKey(goodFriday) || key === dateKey(easterMonday)) return true
  }

  return false
}

export function getTaxDeadlineForMonth(year: number, month: number): Date {
  const d = new Date(year, month, 15)
  d.setHours(0, 0, 0, 0)
  while (isNonWorkingDay(d)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

export function belgradeTodayYmdString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Belgrade' })
}

export function belgradeCalendarDate(): Date {
  const ymd = belgradeTodayYmdString()
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function getNextTaxDeadline(referenceDate?: Date): Date {
  const now = referenceDate ? new Date(referenceDate.getTime()) : new Date()
  now.setHours(0, 0, 0, 0)
  const current = getTaxDeadlineForMonth(now.getFullYear(), now.getMonth())
  if (current >= now) return current
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return getTaxDeadlineForMonth(nextMonth.getFullYear(), nextMonth.getMonth())
}

export function daysUntilTaxDeadlineBelgrade(): number {
  const today = belgradeCalendarDate()
  const deadline = getNextTaxDeadline(today)
  const t0 = today.getTime()
  const t1 = deadline.getTime()
  return Math.ceil((t1 - t0) / (1000 * 60 * 60 * 24))
}

export function nextTaxDeadlineRefKeyBelgrade(): string {
  const d = getNextTaxDeadline(belgradeCalendarDate())
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
