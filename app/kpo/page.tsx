'use client'
import { useState, useEffect } from 'react'
import { createClient, User } from '@supabase/supabase-js'
import { ThemeToggle } from '@/components/ThemeToggle'
import jsPDF from 'jspdf'

const SUPABASE_URL = "https://ymiyqhblbqkkycpdnlaq.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

type Valuta = 'RSD' | 'EUR' | 'USD'

type Prihod = {
  id: string
  user_id?: string
  datum: string
  klijent: string
  napomena: string | null
  iznos: number
  valuta: Valuta
  iznos_rsd: number
}

const KVARTALI = {
  Q1: ['01', '02', '03'],
  Q2: ['04', '05', '06'],
  Q3: ['07', '08', '09'],
  Q4: ['10', '11', '12'],
}

export default function KpoPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [prihodi, setPrihodi] = useState<Prihod[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'sve' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('sve')
  const [selectedGodina, setSelectedGodina] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)
      setAuthLoading(false)
      if (u) ucitajPrihode(u.id)
    }
    init()
  }, [])

  // Refetch when page gains focus so KPO stays in sync with Dashboard '+ Prihod' entries
  useEffect(() => {
    if (!user) return
    const onFocus = () => ucitajPrihode(user.id)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  const ucitajPrihode = async (userId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prihodi')
      .select('*')
      .eq('user_id', userId)
      .order('datum', { ascending: true })
    if (!error && data) setPrihodi((data as Prihod[]) || [])
    setLoading(false)
  }

  const filtriranePoGodini = prihodi.filter(p =>
    new Date(p.datum).getFullYear() === selectedGodina
  )

  // Redni broj is year-wide (1, 2, 3...) for the selected year, per Serbian KPO rules
  const sortiranePoGodini = [...filtriranePoGodini].sort(
    (a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime()
  )
  const redniBrojMap = new Map<string, number>()
  sortiranePoGodini.forEach((p, i) => redniBrojMap.set(p.id, i + 1))

  const filtrirane = filtriranePoGodini.filter(p => {
    if (filter === 'sve') return true
    const mes = p.datum.split('-')[1]
    return KVARTALI[filter].includes(mes)
  })

  const filtriranesBrojevima = filtrirane.map(p => ({
    ...p,
    redniBroj: redniBrojMap.get(p.id) ?? 0,
  }))

  // Samostalnost: client share of total in current filtered view (>70% = orange row)
  const iznosPoKlijentu = new Map<string, number>()
  filtrirane.forEach(p => {
    iznosPoKlijentu.set(p.klijent, (iznosPoKlijentu.get(p.klijent) ?? 0) + (p.iznos_rsd ?? 0))
  })
  const isOver70 = (klijent: string) =>
    ukupnoFilter > 0 && ((iznosPoKlijentu.get(klijent) ?? 0) / ukupnoFilter) > 0.7

  // Parse NBS kurs from napomena (e.g. " [Kurs 1 EUR = 117 RSD]" or " [Kurs 1 USD = 108 RSD]")
  const parseKursIzNapomene = (napomena: string | null): string | null => {
    if (!napomena) return null
    const m = napomena.match(/Kurs 1 (?:EUR|USD) = ([\d.,]+)\s*RSD/i)
    return m ? m[1].replace(',', '.') : null
  }

  const ukupnoRSD = filtriranePoGodini.reduce((sum, p) => sum + (p.iznos_rsd ?? 0), 0)
  const ukupnoFilter = filtrirane.reduce((sum, p) => sum + (p.iznos_rsd ?? 0), 0)

  const formatDatum = (d: string) => {
    const [god, mes, dan] = d.split('-')
    return `${dan}.${mes}.${god}`
  }

  const formatIznos = (iznos: number) =>
    new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(iznos)

  const iznosOriginal = (p: Prihod) => {
    if (p.valuta === 'RSD') return formatIznos(p.iznos) + ' RSD'
    return formatIznos(p.iznos) + ' ' + (p.valuta || 'EUR')
  }

  // Opis: Račun br. [broj]/[godina] - [Ime Klijenta]
  const formatOpis = (p: { redniBroj: number; klijent: string }) =>
    `Račun br. ${p.redniBroj}/${selectedGodina} - ${p.klijent}`

  const nbsTooltipText = (p: Prihod & { redniBroj: number }) => {
    const kursStr = parseKursIzNapomene(p.napomena)
    if (p.valuta === 'RSD') return 'Iznos u RSD (bez konverzije)'
    if (kursStr) return `Srednji kurs NBS na dan ${formatDatum(p.datum)}: ${parseFloat(kursStr).toFixed(2)}`
    return `Srednji kurs NBS (vidi napomenu)`
  }

  const preuzmiPDF = async () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const ukupnoStrana = () => (doc as any).internal.getNumberOfPages()
    const sada = new Date().toLocaleString('sr-RS')

    // 15mm margins (jsPDF default unit is mm)
    const margin = 15
    const contentWidth = pageWidth - margin * 2

    const ascii = (t: string) => (t || '')
      .replace(/[čć]/g, 'c').replace(/[ČĆ]/g, 'C')
      .replace(/[š]/g, 's').replace(/[Š]/g, 'S')
      .replace(/[ž]/g, 'z').replace(/[Ž]/g, 'Z')
      .replace(/[đ]/g, 'dj').replace(/[Đ]/g, 'Dj')

    const profilRaw = typeof window !== 'undefined' ? localStorage.getItem('pausalac_profil') : null
    const profil = profilRaw ? JSON.parse(profilRaw) : {}
    const nazivFirme = (profil.nazivFirme && String(profil.nazivFirme).trim()) ? ascii(profil.nazivFirme) : '________________'
    const pib = (profil.pib != null && String(profil.pib).trim() !== '') ? String(profil.pib) : '________________'
    const adresa = ascii(profil.sediste || 'Adresa')

    const formatIznosPDF = (iznos: number) =>
      new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(iznos) + ' RSD'

    const sortirane = [...filtrirane].sort(
      (a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime()
    )

    // Table column layout (mm): Red. br. (narrow) | Datum (standard) | Opis (wide) | Iznos RSD (standard)
    const colW1 = 12
    const colW2 = 22
    const colW4 = 28
    const colW3 = contentWidth - colW1 - colW2 - colW4
    const x1 = margin
    const x2 = margin + colW1
    const x3 = margin + colW1 + colW2
    const x4 = margin + colW1 + colW2 + colW3
    const rowHeightHeader = 8
    const lineHeight = 5
    const cellPadding = 2

    const dodajFooter = () => {
      const ukupno = ukupnoStrana()
      for (let i = 1; i <= ukupno; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Generisano: ${sada}`, margin, pageHeight - 10)
        doc.text(`Stranica ${i} od ${ukupno}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
      }
    }

    // Helper: draw thin black border for one row (full width of table)
    const drawRowBorders = (y: number, h: number) => {
      doc.setDrawColor(0, 0, 0)
      doc.line(x1, y, x1 + contentWidth, y)
      doc.line(x1, y + h, x1 + contentWidth, y + h)
      doc.line(x1, y, x1, y + h)
      doc.line(x2, y, x2, y + h)
      doc.line(x3, y, x3, y + h)
      doc.line(x4, y, x4, y + h)
      doc.line(x4 + colW4, y, x4 + colW4, y + h)
    }

    // ——— Top-left: Firma, PIB, Adresa ———
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text('Firma: ' + nazivFirme, x1, margin + 5)
    doc.text('PIB: ' + pib, x1, margin + 10)
    doc.text('Adresa: ' + adresa, x1, margin + 15)

    // ——— Top-right: Godina ———
    doc.text('Godina: ' + selectedGodina + '.', pageWidth - margin, margin + 10, { align: 'right' })

    // ——— Title: centered, bold, underlined ———
    const title = 'KNJIGA O OSTVARENOM PROMETU (OBRAZAC KPO)'
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    const titleY = margin + 28
    doc.text(title, pageWidth / 2, titleY, { align: 'center' })
    const titleWidth = doc.getTextWidth(title)
    doc.setDrawColor(0, 0, 0)
    doc.line(pageWidth / 2 - titleWidth / 2, titleY + 1.5, pageWidth / 2 + titleWidth / 2, titleY + 1.5)

    // ——— Table header (4 columns, white background, thin black borders) ———
    const tableTop = titleY + 10
    doc.setDrawColor(0, 0, 0)
    doc.rect(x1, tableTop, colW1, rowHeightHeader, 'S')
    doc.rect(x2, tableTop, colW2, rowHeightHeader, 'S')
    doc.rect(x3, tableTop, colW3, rowHeightHeader, 'S')
    doc.rect(x4, tableTop, colW4, rowHeightHeader, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Red. br.', x1 + colW1 / 2, tableTop + 5.2, { align: 'center' })
    doc.text('Datum', x2 + colW2 / 2, tableTop + 5.2, { align: 'center' })
    doc.text('Opis (Klijent i Broj racuna)', x3 + colW3 / 2, tableTop + 5.2, { align: 'center' })
    doc.text('Iznos (RSD)', x4 + colW4 / 2, tableTop + 5.2, { align: 'center' })
    doc.setFont('helvetica', 'normal')

    let y = tableTop + rowHeightHeader
    const bottomY = pageHeight - 35

    sortirane.forEach((p) => {
      const rb = redniBrojMap.get(p.id) ?? 0
      const kursStr = parseKursIzNapomene(p.napomena)
      const opisText = p.valuta !== 'RSD' && kursStr
        ? ascii(`Racun br. ${rb}, klijent: ${p.klijent} (Kurs: ${parseFloat(kursStr).toFixed(2)}).`)
        : ascii(`Racun br. ${rb}, klijent: ${p.klijent}.`)
      const datumStr = formatDatum(p.datum)

      doc.setFontSize(9)
      const opisLines = doc.splitTextToSize(opisText, Math.max(colW3 - cellPadding * 2, 10))
      const numLines = Math.max(1, opisLines.length)
      const rowH = Math.max(rowHeightHeader, numLines * lineHeight + cellPadding)

      if (y + rowH > bottomY) {
        doc.addPage()
        y = margin + rowHeightHeader
        doc.setDrawColor(0, 0, 0)
        doc.rect(x1, margin, colW1, rowHeightHeader, 'S')
        doc.rect(x2, margin, colW2, rowHeightHeader, 'S')
        doc.rect(x3, margin, colW3, rowHeightHeader, 'S')
        doc.rect(x4, margin, colW4, rowHeightHeader, 'S')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('Red. br.', x1 + colW1 / 2, margin + 5.2, { align: 'center' })
        doc.text('Datum', x2 + colW2 / 2, margin + 5.2, { align: 'center' })
        doc.text('Opis (Klijent i Broj racuna)', x3 + colW3 / 2, margin + 5.2, { align: 'center' })
        doc.text('Iznos (RSD)', x4 + colW4 / 2, margin + 5.2, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        y = margin + rowHeightHeader
      }

      drawRowBorders(y, rowH)
      doc.setTextColor(0, 0, 0)
      const textBaselineY = y + rowH / 2
      doc.text(String(rb), x1 + cellPadding, textBaselineY)
      doc.text(datumStr, x2 + cellPadding, textBaselineY)
      let lineY = y + cellPadding + 3.5
      opisLines.forEach((line: string) => {
        doc.text(line, x3 + cellPadding, lineY)
        lineY += lineHeight
      })
      doc.text(formatIznosPDF(p.iznos_rsd ?? 0), x4 + colW4 - cellPadding, textBaselineY, { align: 'right' })
      y += rowH
    })

    // ——— UKUPNO row (bold) ———
    const ukupnoRowH = 9
    drawRowBorders(y, ukupnoRowH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('UKUPNO:', x3 + cellPadding, y + ukupnoRowH / 2)
    doc.text(formatIznosPDF(ukupnoFilter), x4 + colW4 - cellPadding, y + ukupnoRowH / 2, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += ukupnoRowH + 12

    // ——— Bottom right: M.P. and (Potpis odgovornog lica) ———
    const lastPage = ukupnoStrana()
    doc.setPage(lastPage)
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text('M.P. _______________________', pageWidth - margin, pageHeight - 22, { align: 'right' })
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text('(Potpis odgovornog lica)', pageWidth - margin, pageHeight - 16, { align: 'right' })

    dodajFooter()
    doc.save(`KPO-${selectedGodina}-${filter}.pdf`)
  }

  const preuzmiExcel = async () => {
    const XLSX = await import('xlsx-js-style')
    const sortirane = [...filtrirane].sort(
      (a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime()
    )

    const formatDatumExcel = (d: string) => {
      const [god, mes, dan] = d.split('-')
      return `${dan}.${mes}.${god}`
    }

    const redovi = sortirane.map((p) => ({
      'Red. br.': redniBrojMap.get(p.id) ?? 0,
      'Datum': formatDatumExcel(p.datum),
      'Opis': `Račun br. ${redniBrojMap.get(p.id) ?? 0}, ${p.klijent}`,
      'Iznos orig.': p.valuta === 'RSD' ? `${formatIznos(p.iznos)} RSD` : `${formatIznos(p.iznos)} ${p.valuta || 'EUR'}`,
      'Iznos (RSD)': p.iznos_rsd ?? 0,
    }))

    redovi.push({
      'Red. br.': '',
      'Datum': '',
      'Opis': 'Total',
      'Iznos orig.': '',
      'Iznos (RSD)': ukupnoFilter,
    } as any)

    const ws = XLSX.utils.json_to_sheet(redovi)

    const zaglavlje = ['A1', 'B1', 'C1', 'D1', 'E1']
    zaglavlje.forEach(ref => {
      if (ws[ref]) (ws[ref] as any).s = { font: { bold: true } }
    })

    // Ensure Iznos (RSD) (column E) is raw number so formulas can sum it
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let r = 1; r <= range.e.r; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: 4 })
      const cell = ws[ref]
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n'
        cell.z = '#,##0.00'
        if (cell.s) (cell.s as any).numFmt = '#,##0.00'
      }
    }

    ws['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 48 },
      { wch: 18 }, { wch: 16 },
    ]

    const wb = XLSX.utils.book_new()
    wb.Workbook = { Views: [{ RTL: false }] }
    XLSX.utils.book_append_sheet(wb, ws, `KPO ${selectedGodina}`)

    const d = new Date()
    const datum = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
    XLSX.writeFile(wb, `KPO_Knjiga_${selectedGodina}_${datum}.xlsx`, { cellStyles: true })
  }

  if (authLoading) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32 }}>📒</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>📒</p>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Prijavite se</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center' }}>Da biste videli Knjigu prihoda (KPO), morate biti prijavljeni.</p>
        <a href="/" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>
          Nazad na početnu
        </a>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 18 }}>📒</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>Arhiva i KPO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <button
            onClick={preuzmiExcel}
            style={{ background: '#1a7a4a', color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 10, border: '1px solid #22c55e40', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📊 Excel
          </button>
          <button
            onClick={preuzmiPDF}
            style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ⬇️ PDF
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 40px 16px' }}>

        {/* Ukupan promet */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>UKUPAN PROMET {selectedGodina}.</p>
            <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 28, margin: 0 }}>{formatIznos(ukupnoRSD)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>RSD</span></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>BROJ PRIHODA</p>
            <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 28, margin: 0 }}>{filtriranePoGodini.length}</p>
          </div>
        </div>

        {/* Godišnji filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Godina:</span>
          {[2022, 2023, 2024, 2025, 2026].map(g => (
            <button
              key={g}
              onClick={() => setSelectedGodina(g)}
              style={{
                background: selectedGodina === g ? 'var(--accent)' : 'var(--bg-card)',
                color: selectedGodina === g ? '#000' : 'var(--text-muted)',
                fontWeight: selectedGodina === g ? 700 : 400,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 10,
                border: `1px solid ${selectedGodina === g ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Kvartalni filteri */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['sve', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                flex: 1,
                background: filter === k ? 'var(--accent)' : 'var(--bg-card)',
                color: filter === k ? '#000' : 'var(--text-muted)',
                fontWeight: filter === k ? 700 : 400,
                fontSize: 13,
                padding: '8px 0',
                borderRadius: 10,
                border: `1px solid ${filter === k ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              {k === 'sve' ? 'Sve' : k}
            </button>
          ))}
        </div>

        {/* Tabela */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Učitavanje prihoda...
          </div>
        ) : filtrirane.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-muted)', textAlign: 'center' }}>
            <p style={{ fontSize: 48, margin: '0 0 12px 0' }}>📋</p>
            <p style={{ fontSize: 16, margin: 0 }}>Nema prihoda za ovaj period.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>

            {/* Header tabele */}
            <div style={{ display: 'grid', gridTemplateColumns: '44px 82px 1fr 90px 100px', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>Red. br.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>Datum</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>Opis (Račun br. i Klijent)</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, textAlign: 'right' }}>Iznos orig.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, textAlign: 'right' }}>Iznos RSD</p>
            </div>

            {/* Redovi */}
            {filtriranesBrojevima.map((p) => {
              const over70 = isOver70(p.klijent)
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 82px 1fr 90px 100px',
                    gap: 8,
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                    background: over70 ? 'rgba(249, 115, 22, 0.15)' : undefined,
                    borderLeft: over70 ? '3px solid #f97316' : undefined,
                  }}
                >
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{p.redniBroj}.</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{formatDatum(p.datum)}</p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={formatOpis(p)}>{formatOpis(p)}</p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 12, margin: 0, textAlign: 'right' }}>{iznosOriginal(p)}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{formatIznos(p.iznos_rsd ?? 0)} RSD</span>
                    <span title={nbsTooltipText(p)} style={{ cursor: 'help', color: 'var(--text-muted)', display: 'inline-flex', fontSize: 14 }} aria-label="Kurs NBS">ℹ️</span>
                  </div>
                </div>
              )
            })}

            {/* Footer — ukupno za filter */}
            <div style={{ display: 'grid', gridTemplateColumns: '44px 82px 1fr 90px 100px', gap: 8, padding: '14px 16px', background: 'var(--bg-primary)', alignItems: 'center' }}>
              <div />
              <div />
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, fontWeight: 700 }}>UKUPNO {filter !== 'sve' ? filter : ''}</p>
              <div />
              <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 14, margin: 0, textAlign: 'right' }}>
                {filter !== 'sve' && <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: 8 }}>{filtrirane.length} {filtrirane.length === 1 ? 'faktura' : filtrirane.length >= 2 && filtrirane.length <= 4 ? 'fakture' : 'faktura'}</span>}
                {formatIznos(ukupnoFilter)} RSD
              </p>
            </div>
            {filtrirane.some(p => isOver70(p.klijent)) && (
              <div style={{ margin: 16, padding: '12px 16px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>⚠️</span>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, flex: 1 }}>
                  Narandžasta oznaka: klijent čini više od 70% prihoda u prikazu (test samostalnosti).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
