/**
 * Invoice status: stored in DB as issued | paid.
 * OVERDUE (dospela) is derived when issued and rok plaćanja is before today.
 */

export type FakturaStatusStored = 'issued' | 'paid'
export type FakturaStatusDisplay = 'issued' | 'paid' | 'overdue'

export type FakturaPayloadLike = {
  rok_placanja?: string
  [key: string]: unknown
}

export type FakturaRowLike = {
  status?: string | null
  rok_placanja?: string | null
  datum: string
  payload?: unknown
}

/** Normalize legacy DB values (neplacena, kasni, placena, …) to stored model */
export function normalizeInvoiceStatus(raw: string | null | undefined): FakturaStatusStored {
  const s = (raw ?? '').toLowerCase().trim()
  if (s === 'paid' || s === 'placena' || s === 'plaćena') return 'paid'
  return 'issued'
}

export function isInvoicePaid(raw: string | null | undefined): boolean {
  return normalizeInvoiceStatus(raw) === 'paid'
}

/** Due date: optional column or payload.rok_placanja (ISO date yyyy-mm-dd) */
export function getRokPlacanja(f: FakturaRowLike): string | null {
  if (f.rok_placanja?.trim()) return f.rok_placanja.trim()
  const p = f.payload
  if (p && typeof p === 'object' && p !== null && 'rok_placanja' in p) {
    const v = (p as FakturaPayloadLike).rok_placanja
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function startOfDay(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

/** Display status: paid stays paid; issued may show as overdue if past due date */
export function effectiveInvoiceStatus(f: FakturaRowLike): FakturaStatusDisplay {
  const raw = (f.status ?? '').toLowerCase().trim()
  if (raw === 'paid' || raw === 'placena' || raw === 'plaćena') return 'paid'
  // Legacy vrednost iz baze — tretiraj kao dospelu
  if (raw === 'kasni') return 'overdue'
  const due = getRokPlacanja(f)
  if (!due) return 'issued'
  const dueMs = startOfDay(new Date(due + 'T12:00:00'))
  const todayMs = startOfDay(new Date())
  if (todayMs > dueMs) return 'overdue'
  return 'issued'
}

export const FAKTURA_STATUS_LABELS: Record<FakturaStatusDisplay, string> = {
  issued: 'Izdata',
  paid: 'Plaćena',
  overdue: 'Dospela',
}

export const FAKTURA_STATUS_BADGE_STYLES: Record<
  FakturaStatusDisplay,
  { bg: string; color: string; border: string }
> = {
  issued: {
    bg: 'rgba(255, 193, 7, 0.22)',
    color: '#f9a825',
    border: '1px solid #f9a825',
  },
  paid: {
    bg: 'rgba(0, 200, 83, 0.2)',
    color: '#00c853',
    border: '1px solid #00c853',
  },
  overdue: {
    bg: 'rgba(244, 67, 54, 0.22)',
    color: '#f44336',
    border: '1px solid #f44336',
  },
}

/** Unpaid invoices for “Iz fakture” flows */
export function isUnpaidInvoiceRow(f: { status?: string | null }): boolean {
  return !isInvoicePaid(f.status)
}

/** Za server push/cron: dospelo ako je rok < današnjeg datuma (YYYY-MM-DD, Beograd). */
export function isInvoiceOverdueForPush(f: FakturaRowLike, todayYmdBelgrade: string): boolean {
  const raw = (f.status ?? '').toLowerCase().trim()
  if (raw === 'paid' || raw === 'placena' || raw === 'plaćena') return false
  if (raw === 'kasni') return true
  const due = getRokPlacanja(f)
  if (!due) return false
  return due < todayYmdBelgrade
}
