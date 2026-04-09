import jsPDF from 'jspdf'
import { brojRacunaZaPrikaz } from '@/lib/kpo-prihod'

export type KpoOfficialPrihod = {
  id: string
  datum: string
  klijent: string
  napomena: string | null
  iznos_rsd: number
}

export type KpoOfficialProfil = {
  pib?: string
  obveznik?: string
  nazivFirme?: string
  sediste?: string
  sifraPoreskogObveznika?: string
  sifraDelatnosti?: string
}

const ascii = (t: string) =>
  (t || '')
    .replace(/[čć]/g, 'c')
    .replace(/[ČĆ]/g, 'C')
    .replace(/[š]/g, 's')
    .replace(/[Š]/g, 'S')
    .replace(/[ž]/g, 'z')
    .replace(/[Ž]/g, 'Z')
    .replace(/[đ]/g, 'dj')
    .replace(/[Đ]/g, 'Dj')

function formatDatum(d: string) {
  const [god, mes, dan] = d.split('-')
  if (!god || !mes || !dan) return d
  return `${dan}.${mes}.${god}.`
}

function formatIznosPdf(iznos: number) {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(iznos)
}

function placeholder(v: string | undefined, empty = '__________') {
  const s = (v ?? '').trim()
  return s ? ascii(s) : empty
}

/**
 * Službeni izgled KPO: A4 portrait, Times (serif), crno na belo.
 * Kolone 3–5: proizvodi, usluge, svega; podrazumevano sav prihod u koloni 4 (usluge).
 */
export function downloadOfficialKpoPdf(opts: {
  rows: KpoOfficialPrihod[]
  godina: number
  profil: KpoOfficialProfil
  filename?: string
}) {
  const { rows, godina, profil } = opts
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentW = pageWidth - margin * 2

  /** Zbir širina = 180 mm (širina sadržaja A4 sa marginom 15 mm) */
  const colW = {
    c1: 10,
    c2: 92,
    c3: 26,
    c4: 26,
    c5: 26,
  }
  const x1 = margin
  const x2 = x1 + colW.c1
  const x3 = x2 + colW.c2
  const x4 = x3 + colW.c3
  const x5 = x4 + colW.c4
  const x6 = x5 + colW.c5

  const headerRowH = 14
  const lineH = 4.2
  const pad = 1.5

  const setSerif = (style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('times', style)
  }

  let yCursor = margin

  setSerif('normal')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.text(`PIB: ${placeholder(profil.pib, '________________')}`, x1, yCursor)
  yCursor += 5
  doc.text(`Obveznik: ${placeholder(profil.obveznik)}`, x1, yCursor)
  yCursor += 5
  doc.text(`Firma - radnja: ${placeholder(profil.nazivFirme)}`, x1, yCursor)
  yCursor += 5
  doc.text(`Sedište: ${placeholder(profil.sediste)}`, x1, yCursor)
  yCursor += 5
  doc.text(`Šifra poreskog obveznika: ${placeholder(profil.sifraPoreskogObveznika)}`, x1, yCursor)
  yCursor += 5
  doc.text(`Šifra delatnosti: ${placeholder(profil.sifraDelatnosti)}`, x1, yCursor)
  yCursor += 10

  const title = 'KNJIGA O OSTVARENOM PROMETU PAUŠALNO OPOREZOVANIH OBVEZNIKA'
  setSerif('bold')
  doc.setFontSize(11)
  const titleLines = doc.splitTextToSize(title, contentW)
  titleLines.forEach((ln: string, i: number) => {
    doc.text(ln, pageWidth / 2, yCursor + i * 5, { align: 'center' })
  })
  yCursor += titleLines.length * 5 + 6

  doc.setFontSize(9)
  setSerif('normal')
  doc.text(`Za kalendarsku godinu: ${godina}.`, pageWidth / 2, yCursor, { align: 'center' })
  yCursor += 8

  const drawTableHeader = (top: number) => {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    ;(
      [
        [x1, colW.c1],
        [x2, colW.c2],
        [x3, colW.c3],
        [x4, colW.c4],
        [x5, colW.c5],
      ] as const
    ).forEach(([x, w]) => doc.rect(x, top, w, headerRowH, 'S'))

    setSerif('bold')
    doc.setFontSize(6.2)
    const hc = (lines: string[], cx: number, cw: number) => {
      let yy = top + 3.5
      lines.forEach((line) => {
        doc.text(line, cx + cw / 2, yy, { align: 'center' })
        yy += 3.1
      })
    }
    hc(['Redni', 'broj', '(1)'], x1, colW.c1)
    hc(['Datum i opis', 'knjizenja', '(2)'], x2, colW.c2)
    hc(['Prihod od', 'delatnosti -', 'od prodaje', 'proizvoda (3)'], x3, colW.c3)
    hc(['Prihod od', 'delatnosti -', 'od izvrsenih', 'usluga (4)'], x4, colW.c4)
    hc(['Svega prihodi', 'od delatnosti', '(3)+(4)', '(5)'], x5, colW.c5)
    setSerif('normal')
  }

  const drawRowBox = (top: number, h: number) => {
    doc.setDrawColor(0, 0, 0)
    doc.line(x1, top, x6, top)
    doc.line(x1, top + h, x6, top + h)
    ;[x1, x2, x3, x4, x5, x6].forEach((x) => doc.line(x, top, x, top + h))
  }

  const bottomMin = 38
  let tableTop = yCursor
  drawTableHeader(tableTop)
  let y = tableTop + headerRowH

  const sorted = [...rows].sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())

  let sum3 = 0
  let sum4 = 0
  let sum5 = 0

  sorted.forEach((p, idx) => {
    const rb = idx + 1
    const br = brojRacunaZaPrikaz(p.napomena, rb, godina)
    const datumStr = formatDatum(p.datum)
    const opis = ascii(
      `${datumStr}${p.klijent ? ` - ${p.klijent}` : ''}${br ? `, br. ${br}` : ''}`.trim(),
    )
    const col2Lines = doc.splitTextToSize(opis, colW.c2 - pad * 2)
    const iznos = p.iznos_rsd ?? 0
    const v3 = 0
    const v4 = iznos
    const v5 = v3 + v4
    sum3 += v3
    sum4 += v4
    sum5 += v5

    const rowH = Math.max(8, col2Lines.length * lineH + pad * 2)

    if (y + rowH > pageHeight - bottomMin) {
      doc.addPage()
      tableTop = margin
      y = tableTop
      drawTableHeader(y)
      y += headerRowH
    }

    drawRowBox(y, rowH)
    doc.setFontSize(8)
    setSerif('normal')
    doc.text(String(rb), x1 + colW.c1 / 2, y + rowH / 2 + 1, { align: 'center' })

    let ly = y + pad + 3
    col2Lines.forEach((line: string) => {
      doc.text(line, x2 + pad, ly)
      ly += lineH
    })

    doc.text(formatIznosPdf(v3), x3 + colW.c3 - pad, y + rowH / 2 + 1, { align: 'right' })
    doc.text(formatIznosPdf(v4), x4 + colW.c4 - pad, y + rowH / 2 + 1, { align: 'right' })
    doc.text(formatIznosPdf(v5), x5 + colW.c5 - pad, y + rowH / 2 + 1, { align: 'right' })

    y += rowH
  })

  const totalH = 9
  if (y + totalH > pageHeight - bottomMin) {
    doc.addPage()
    y = margin
    drawTableHeader(y)
    y += headerRowH
  }

  drawRowBox(y, totalH)
  setSerif('bold')
  doc.setFontSize(9)
  doc.text('Ukupno:', x3 - pad, y + totalH / 2 + 1.5, { align: 'right' })
  doc.text(formatIznosPdf(sum3), x3 + colW.c3 - pad, y + totalH / 2 + 1.5, { align: 'right' })
  doc.text(formatIznosPdf(sum4), x4 + colW.c4 - pad, y + totalH / 2 + 1.5, { align: 'right' })
  doc.text(formatIznosPdf(sum5), x5 + colW.c5 - pad, y + totalH / 2 + 1.5, { align: 'right' })
  setSerif('normal')

  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  const last = totalPages
  doc.setPage(last)
  setSerif('normal')
  doc.setFontSize(10)
  doc.text('Sastavio: _______________________________', x1, pageHeight - 22)
  doc.text('Odgovorno lice: _______________________________', x6, pageHeight - 22, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.text(`Strana ${i} od ${totalPages}`, x6, pageHeight - 10, { align: 'right' })
  }

  doc.save(opts.filename ?? `KPO-${godina}-obrazac.pdf`)
}
