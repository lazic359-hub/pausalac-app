import { getNbsToRsdRate } from './exchange-rate'

/** Polja potrebna za KPO unos pri naplati fakture (naziv/adresa kupca, broj računa, iznos u RSD po kursu NBS). */
export type FakturaZaKpo = {
  id: string
  klijent: string | null
  iznos: number | null
  valuta: string | null
  broj_fakture: string | null
  napomena: string | null
  payload?: unknown
  /** Sačuvan RSD ekvivalent sa fakture (kurs NBS za datum fakture). */
  iznos_rsd?: number | null
  /** Datum fakture (YYYY-MM-DD) — za napomenu o kursu. */
  datum_fakture?: string | null
}

export function tagFakturaPrihodId(fakturaId: string): string {
  return `[faktura_id:${fakturaId}]`
}

export function parseKpoBrojRacuna(napomena: string | null): string | null {
  if (!napomena) return null
  const m =
    napomena.match(/\[KPO Broj računa:\s*([^\]]+)\]/i) ||
    napomena.match(/\[KPO Broj racuna:\s*([^\]]+)\]/i)
  return m ? m[1].trim() : null
}

/** Naziv i adresa kupca u jednom polju (KPO kolona). */
export function kupacNazivIAdresa(f: FakturaZaKpo): string {
  const payload = f.payload && typeof f.payload === 'object' ? (f.payload as Record<string, unknown>) : null
  const adresa = typeof payload?.klijent_adresa === 'string' ? payload.klijent_adresa.trim() : ''
  const naziv = (f.klijent ?? '').trim()
  if (!naziv && adresa) return adresa
  if (!adresa) return naziv
  return `${naziv}, ${adresa}`
}

function formatDatumShort(d: string) {
  const p = d.split('-')
  if (p.length !== 3) return d
  return `${p[2]}.${p[1]}.${p[0]}.`
}

export async function buildPrihodRowForPaidFaktura(
  f: FakturaZaKpo,
  datumNaplate: string,
): Promise<{
  klijent: string
  iznos: number
  valuta: 'RSD' | 'EUR' | 'USD'
  iznos_rsd: number
  napomena: string
}> {
  const val = (f.valuta || 'RSD').toUpperCase() as 'RSD' | 'EUR' | 'USD'
  const iznos = Number(f.iznos) || 0
  const klijent = kupacNazivIAdresa(f)
  const payload = f.payload && typeof f.payload === 'object' ? (f.payload as Record<string, unknown>) : null
  const kursSaFakture =
    payload?.kurs != null && !Number.isNaN(Number(payload.kurs)) ? Number(payload.kurs) : null

  let iznos_rsd: number
  const parts: string[] = []

  if (val === 'RSD') {
    iznos_rsd = iznos
  } else {
    const storedRsd = f.iznos_rsd != null ? Number(f.iznos_rsd) : NaN
    if (Number.isFinite(storedRsd) && storedRsd > 0) {
      iznos_rsd = Math.round(storedRsd)
      const df = (f.datum_fakture ?? '').trim()
      if (kursSaFakture != null) {
        parts.push(
          `[Kurs 1 ${val} = ${kursSaFakture.toFixed(4)} RSD (NBS, datum fakture ${df ? formatDatumShort(df) : '—'})]`,
        )
      } else if (iznos > 0) {
        const implied = storedRsd / iznos
        parts.push(
          `[Kurs 1 ${val} ≈ ${implied.toFixed(4)} RSD (iznos sa fakture${df ? ', datum ' + formatDatumShort(df) : ''})]`,
        )
      } else {
        parts.push(`[RSD ekvivalent sa fakture: ${iznos_rsd.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}]`)
      }
    } else {
      const rate = await getNbsToRsdRate(val, datumNaplate)
      iznos_rsd = Math.round(iznos * rate)
      parts.push(`[Kurs 1 ${val} = ${rate.toFixed(4)} RSD (NBS, datum naplate ${formatDatumShort(datumNaplate)})]`)
    }
  }

  const broj = (f.broj_fakture ?? '').trim()
  if (broj) parts.push(`[KPO Broj računa: ${broj}]`)
  parts.push(tagFakturaPrihodId(f.id))

  const napomenaExtra = f.napomena?.trim() ? f.napomena.trim() + ' · ' : ''
  const napomena = napomenaExtra + parts.join(' ')

  return {
    klijent,
    iznos,
    valuta: val,
    iznos_rsd,
    napomena,
  }
}

/** Broj računa za prikaz: tag KPO, zatim [Faktura X], inače redni broj/godina. */
export function brojRacunaZaPrikaz(
  napomena: string | null,
  redniBroj: number,
  godina: number,
): string {
  const tagged = parseKpoBrojRacuna(napomena)
  if (tagged) return tagged
  if (napomena) {
    const legacy = napomena.match(/\[Faktura\s+([^\]]+)\]/)
    if (legacy) return legacy[1].trim()
  }
  return `${redniBroj}/${godina}`
}
