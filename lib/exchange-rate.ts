export async function getNbsToRsdRate(valuta: 'EUR' | 'USD', dateStr: string): Promise<number> {
  const r = await getNbsToRsdRateMeta(valuta, dateStr)
  return r.rate
}

/** Srednji kurs NBS za datum (RSD po 1 EUR/USD); `fallback` ako API nije dostupan. */
export async function getNbsToRsdRateMeta(
  valuta: 'EUR' | 'USD',
  dateStr: string,
): Promise<{ rate: number; fallback: boolean }> {
  try {
    const res = await fetch(`/api/kurs?datum=${encodeURIComponent(dateStr)}&valuta=${valuta}`)
    const data = await res.json()
    if (!data.rate) throw new Error('Nema kursa')
    return { rate: Number(data.rate), fallback: Boolean(data.fallback) }
  } catch {
    return { rate: valuta === 'EUR' ? 117 : 108, fallback: true }
  }
}

export async function getEurToRsdRate(dateStr: string): Promise<number> {
  return getNbsToRsdRate('EUR', dateStr)
}