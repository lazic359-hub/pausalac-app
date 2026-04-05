/** Kopija lib/faktura-status.ts (samo isInvoiceOverdueForPush). */

export type FakturaRowLike = {
  status?: string | null
  rok_placanja?: string | null
  datum: string
  payload?: unknown
}

function getRokPlacanja(f: FakturaRowLike): string | null {
  if (f.rok_placanja?.trim()) return f.rok_placanja.trim()
  const p = f.payload
  if (p && typeof p === 'object' && p !== null && 'rok_placanja' in p) {
    const v = (p as { rok_placanja?: string }).rok_placanja
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export function isInvoiceOverdueForPush(f: FakturaRowLike, todayYmdBelgrade: string): boolean {
  const raw = (f.status ?? '').toLowerCase().trim()
  if (raw === 'paid' || raw === 'placena' || raw === 'plaćena') return false
  if (raw === 'kasni') return true
  const due = getRokPlacanja(f)
  if (!due) return false
  return due < todayYmdBelgrade
}
