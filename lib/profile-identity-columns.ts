/** Sinhronizacija KPO zaglavlja: kolone u `profiles` + `company_data` (camelCase u JSON-u). */

/** Kolone koje dodaje migracija `20260406120000_profiles_kpo_identity_columns.sql`. */
export const PROFILES_KPO_COLUMN_NAMES =
  'pib, firma_naziv, sediste, sifra_delatnosti, obveznik, sifra_poreskog_obveznika' as const

/** PostgREST kada tražena kolona ne postoji u keširanoj šemi (stara baza bez migracije). */
export function isProfilesMissingColumnError(message: string | undefined | null): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  if (!m.includes('profiles')) return false
  return m.includes('schema cache') || (m.includes('could not find') && m.includes('column'))
}

export type ProfileIdentityRow = {
  pib?: string | null
  firma_naziv?: string | null
  sediste?: string | null
  sifra_delatnosti?: string | null
  obveznik?: string | null
  sifra_poreskog_obveznika?: string | null
}

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  return String(v).trim()
}

/** Pri učitavanju: dopuni company iz denormalizovanih kolona ako u JSON-u fali. */
export function mergeCompanyWithIdentityColumns(
  company: Record<string, unknown>,
  row: ProfileIdentityRow | null | undefined
): Record<string, unknown> {
  if (!row) return company
  const out = { ...company }
  if (!str(out.pib) && row.pib) out.pib = row.pib
  if (!str(out.nazivFirme) && row.firma_naziv) out.nazivFirme = row.firma_naziv
  if (!str(out.sediste) && row.sediste) out.sediste = row.sediste
  if (!str(out.sifraDelatnosti) && row.sifra_delatnosti) out.sifraDelatnosti = row.sifra_delatnosti
  if (!str(out.obveznik) && row.obveznik) out.obveznik = row.obveznik
  if (!str(out.sifraPoreskogObveznika) && row.sifra_poreskog_obveznika) {
    out.sifraPoreskogObveznika = row.sifra_poreskog_obveznika
  }
  return out
}

/** Pri upsertu u `profiles` — mapiranje iz company_data. */
export function identityColumnsPayload(company: Record<string, unknown>): ProfileIdentityRow {
  return {
    pib: str(company.pib) || null,
    firma_naziv: str(company.nazivFirme) || null,
    sediste: str(company.sediste) || null,
    sifra_delatnosti: str(company.sifraDelatnosti) || null,
    obveznik: str(company.obveznik) || null,
    sifra_poreskog_obveznika: str(company.sifraPoreskogObveznika) || null,
  }
}
