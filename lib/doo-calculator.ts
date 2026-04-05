/**
 * Pojednostavljen uporedni okvir (DOO vs paušal). Nije poreski ili pravni savet.
 * DOO: 15% na dobit; pretpostavka 30% rashoda; minimalni doprinosi na platu (~45.000 RSD/mes).
 */

export const DOO_EXPENSE_RATIO = 0.3
export const DOO_PROFIT_TAX_RATE = 0.15
/** Minimalni mesečni doprinosi na osnovicu (okvirno, za ilustraciju) */
export const DOO_MIN_CONTRIBUTIONS_MONTHLY_RSD = 45_000

export const DOO_HIGH_REVENUE_THRESHOLD_RSD = 4_000_000

export function pausalacGodisnjeIzMesečnog(ukupnoMesečno: number): number {
  return Math.round(ukupnoMesečno * 12)
}

export type DooObračun = {
  profitnaOsnovica: number
  porezNaDobit: number
  minimalniDoprinosiGodisnje: number
  ukupnoDoo: number
}

export function obracunajDooGodisnje(prihodGodisnje: number): DooObračun {
  const r = Math.max(0, prihodGodisnje)
  const profitnaOsnovica = r * (1 - DOO_EXPENSE_RATIO)
  const porezNaDobit = Math.round(DOO_PROFIT_TAX_RATE * profitnaOsnovica)
  const minimalniDoprinosiGodisnje = DOO_MIN_CONTRIBUTIONS_MONTHLY_RSD * 12
  return {
    profitnaOsnovica,
    porezNaDobit,
    minimalniDoprinosiGodisnje,
    ukupnoDoo: porezNaDobit + minimalniDoprinosiGodisnje,
  }
}

/** Pozitivno = DOO skuplji od paušala za dati iznos (RSD godišnje). */
export function razlikaDooMinusPausal(prihodGodisnje: number, ukupnoMesečnoPausal: number): number {
  const doo = obracunajDooGodisnje(prihodGodisnje).ukupnoDoo
  const pausal = pausalacGodisnjeIzMesečnog(ukupnoMesečnoPausal)
  return doo - pausal
}
