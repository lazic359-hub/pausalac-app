'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomNav } from '@/components/BottomNav'
import { ConfirmModal } from '@/components/ConfirmModal'
import jsPDF from 'jspdf'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileSpreadsheet, FileDown, Pencil, Trash2, Info } from 'lucide-react'
import { getKpoLimitRsdFromStorage, getUkupnoPrihodZaGodinu, readProfilFromStorage } from '@/lib/profile'
import { brojRacunaZaPrikaz } from '@/lib/kpo-prihod'
import { KPO_TABLE_GRID_COLS } from '@/lib/kpo-table-grid'
import { formatOfflineTimestamp, loadOfflineKpoPrihodi, saveOfflineKpoPrihodi } from '@/lib/offline-data-cache'
import { KpoTableSkeleton } from '@/components/PageSkeletons'
import { ListEmptyState } from '@/components/ListEmptyState'

const supabase = getSupabaseBrowser()

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

type SortKpo = 'datum-asc' | 'datum-desc' | 'iznos-asc' | 'iznos-desc'

function sortKpoRows(rows: Prihod[], key: SortKpo): Prihod[] {
  const copy = [...rows]
  if (key === 'datum-asc') {
    copy.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
  } else if (key === 'datum-desc') {
    copy.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
  } else if (key === 'iznos-asc') {
    copy.sort((a, b) => (a.iznos_rsd ?? 0) - (b.iznos_rsd ?? 0))
  } else {
    copy.sort((a, b) => (b.iznos_rsd ?? 0) - (a.iznos_rsd ?? 0))
  }
  return copy
}

export default function KpoPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [prihodi, setPrihodi] = useState<Prihod[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'sve' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('sve')
  const [selectedGodina, setSelectedGodina] = useState<number>(new Date().getFullYear())
  const [sortBy, setSortBy] = useState<SortKpo>('datum-asc')
  const [brisanjeId, setBrisanjeId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    klijent: '',
    iznos: '',
    valuta: 'RSD' as Valuta,
    datum: '',
    napomena: '',
  })
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const [kpoLimitRsd, setKpoLimitRsd] = useState(6_000_000)
  const [kpoAsOf, setKpoAsOf] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setKpoLimitRsd(getKpoLimitRsdFromStorage())
    sync()
    window.addEventListener('pausalac-profil-updated', sync)
    return () => window.removeEventListener('pausalac-profil-updated', sync)
  }, [])

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
    const onFocus = () => {
      setKpoLimitRsd(getKpoLimitRsdFromStorage())
      void ucitajPrihode(user.id)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  const ucitajPrihode = async (userId: string) => {
    setLoading(true)
    if (typeof window !== 'undefined' && !navigator.onLine) {
      const snap = loadOfflineKpoPrihodi(userId)
      if (snap?.data.rows?.length) {
        setPrihodi(snap.data.rows as Prihod[])
        setKpoAsOf(snap.updatedAt)
      } else {
        setPrihodi([])
        setKpoAsOf(null)
      }
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('prihodi')
      .select('*')
      .eq('user_id', userId)
      .order('datum', { ascending: true })
    if (!error && data) {
      const rows = (data as Prihod[]) || []
      setPrihodi(rows)
      saveOfflineKpoPrihodi(userId, rows)
      setKpoAsOf(new Date().toISOString())
    } else {
      const snap = loadOfflineKpoPrihodi(userId)
      if (snap?.data.rows?.length) {
        setPrihodi(snap.data.rows as Prihod[])
        setKpoAsOf(snap.updatedAt)
      }
    }
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

  const filtriraneSortirane = sortKpoRows(filtrirane, sortBy)

  const filtriranesBrojevima = filtriraneSortirane.map(p => ({
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
  const ukupnoSaPocetkom = getUkupnoPrihodZaGodinu(ukupnoRSD, selectedGodina)
  const ukupnoFilter = filtrirane.reduce((sum, p) => sum + (p.iznos_rsd ?? 0), 0)

  const limitPctRaw = kpoLimitRsd > 0 ? (ukupnoSaPocetkom / kpoLimitRsd) * 100 : 0
  const limitBarFillPct = Math.min(100, limitPctRaw)
  const limitTrackColor =
    limitPctRaw >= 100 ? '#ef4444' : limitPctRaw >= 80 ? '#eab308' : '#22c55e'
  const preostaloDoLimita = Math.max(0, kpoLimitRsd - ukupnoSaPocetkom)

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

  const nbsTooltipText = (p: Prihod & { redniBroj: number }) => {
    const kursStr = parseKursIzNapomene(p.napomena)
    if (p.valuta === 'RSD') return 'Iznos u RSD (bez konverzije)'
    if (kursStr) {
      const fromFaktura = (p.napomena ?? '').includes('datum fakture')
      const k = parseFloat(kursStr)
      return fromFaktura
        ? `Srednji kurs NBS na datum fakture (sa fakture): ${k.toFixed(4)}`
        : `Srednji kurs NBS na dan naplate ${formatDatum(p.datum)}: ${k.toFixed(4)}`
    }
    return `Srednji kurs NBS (vidi napomenu)`
  }

  const obrisiPrihod = async (id: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setToast({ message: 'Nema veze — brisanje nije moguće offline.', tone: 'danger' })
      setBrisanjeId(null)
      setTimeout(() => setToast(null), 3500)
      return
    }
    const { error } = await supabase.from('prihodi').delete().eq('id', id)
    if (!error) {
      setPrihodi(prev => {
        const next = prev.filter(p => p.id !== id)
        if (user) saveOfflineKpoPrihodi(user.id, next)
        return next
      })
      setKpoAsOf(new Date().toISOString())
      setBrisanjeId(null)
      setToast({ message: 'Prihod obrisan', tone: 'success' })
      setTimeout(() => setToast(null), 3000)
    } else {
      setToast({ message: error.message, tone: 'danger' })
      setTimeout(() => setToast(null), 4500)
    }
  }

  const otvoriIzmenuPrihoda = (p: Prihod) => {
    setEditId(p.id)
    setEditForm({
      klijent: p.klijent,
      iznos: String(p.iznos),
      valuta: p.valuta,
      datum: p.datum,
      napomena: p.napomena ?? '',
    })
    setEditOpen(true)
  }

  const sacuvajIzmenuPrihoda = async () => {
    if (!user || !editId) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setToast({ message: 'Nema veze — izmena nije moguća offline.', tone: 'danger' })
      setTimeout(() => setToast(null), 3500)
      return
    }
    const klijent = editForm.klijent.trim()
    const iznosNum = parseFloat(String(editForm.iznos).replace(',', '.'))
    if (!klijent || Number.isNaN(iznosNum) || iznosNum <= 0) {
      setToast({ message: 'Proveri klijenta i iznos.', tone: 'danger' })
      setTimeout(() => setToast(null), 3500)
      return
    }
    setEditSaving(true)
    let iznos_rsd = editForm.valuta === 'RSD' ? iznosNum : 0
    let kursZaNapomenu: number | null = null
    if (editForm.valuta !== 'RSD') {
      try {
        const res = await fetch(`/api/kurs?datum=${encodeURIComponent(editForm.datum)}&valuta=${editForm.valuta}`)
        const data = await res.json()
        const kurs = data.rate ?? (editForm.valuta === 'USD' ? 108 : 117)
        kursZaNapomenu = kurs
        iznos_rsd = Math.round(iznosNum * kurs)
      } catch {
        kursZaNapomenu = editForm.valuta === 'USD' ? 108 : 117
        iznos_rsd = Math.round(iznosNum * kursZaNapomenu)
      }
    }
    let napomenaOut = editForm.napomena.trim().replace(/\s*\[Kurs 1 (?:EUR|USD) = [^\]]+\]/gi, '').trim()
    if (editForm.valuta !== 'RSD' && kursZaNapomenu != null) {
      napomenaOut = (napomenaOut ? napomenaOut + ' ' : '') + `[Kurs 1 ${editForm.valuta} = ${kursZaNapomenu.toFixed(4)} RSD]`
    }
    const { error } = await supabase
      .from('prihodi')
      .update({
        klijent,
        iznos: iznosNum,
        valuta: editForm.valuta,
        iznos_rsd,
        datum: editForm.datum,
        napomena: napomenaOut || null,
      })
      .eq('id', editId)
    setEditSaving(false)
    if (!error) {
      await ucitajPrihode(user.id)
      setEditOpen(false)
      setEditId(null)
      setToast({ message: 'Prihod ažuriran', tone: 'success' })
      setTimeout(() => setToast(null), 3000)
    } else {
      setToast({ message: error.message, tone: 'danger' })
      setTimeout(() => setToast(null), 4500)
    }
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

    const profil = readProfilFromStorage() ?? {}
    const nazivFirme = (profil.nazivFirme && String(profil.nazivFirme).trim()) ? ascii(String(profil.nazivFirme)) : '________________'
    const pib = (profil.pib != null && String(profil.pib).trim() !== '') ? String(profil.pib) : '________________'
    const adresa = ascii(String(profil.sediste ?? 'Adresa'))

    const formatIznosPDF = (iznos: number) =>
      new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(iznos) + ' RSD'

    const sortirane = filtriraneSortirane

    /** Službeni obrazac KPO: Red. br. | Datum naplate | Naziv i adresa kupca | Broj računa | Iznos u RSD */
    const colW1 = 10
    const colW2 = 22
    const colW4 = 24
    const colW5 = 28
    const colW3 = contentWidth - colW1 - colW2 - colW4 - colW5
    const x1 = margin
    const x2 = x1 + colW1
    const x3 = x2 + colW2
    const x4 = x3 + colW3
    const x5 = x4 + colW4
    const x6 = x5 + colW5
    const rowHeightHeader = 10
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

    const drawRowBorders5 = (y: number, h: number) => {
      doc.setDrawColor(0, 0, 0)
      doc.line(x1, y, x6, y)
      doc.line(x1, y + h, x6, y + h)
      ;[x1, x2, x3, x4, x5, x6].forEach(x => {
        doc.line(x, y, x, y + h)
      })
    }

    const drawHeaderRow = (top: number) => {
      doc.setDrawColor(0, 0, 0)
      doc.rect(x1, top, colW1, rowHeightHeader, 'S')
      doc.rect(x2, top, colW2, rowHeightHeader, 'S')
      doc.rect(x3, top, colW3, rowHeightHeader, 'S')
      doc.rect(x4, top, colW4, rowHeightHeader, 'S')
      doc.rect(x5, top, colW5, rowHeightHeader, 'S')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.text('Red. br.', x1 + colW1 / 2, top + 4, { align: 'center' })
      doc.text('Datum naplate', x2 + colW2 / 2, top + 4, { align: 'center' })
      doc.setFontSize(6.5)
      doc.text('Naziv i adresa', x3 + colW3 / 2, top + 3.5, { align: 'center' })
      doc.text('kupca', x3 + colW3 / 2, top + 7, { align: 'center' })
      doc.setFontSize(7)
      doc.text('Broj racuna', x4 + colW4 / 2, top + 4, { align: 'center' })
      doc.text('Iznos u RSD', x5 + colW5 / 2, top + 4, { align: 'center' })
      doc.setFont('helvetica', 'normal')
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

    const tableTop = titleY + 10
    drawHeaderRow(tableTop)

    let y = tableTop + rowHeightHeader
    const bottomY = pageHeight - 35

    sortirane.forEach((p) => {
      const rb = redniBrojMap.get(p.id) ?? 0
      const datumStr = formatDatum(p.datum)
      const brojRacStr = brojRacunaZaPrikaz(p.napomena, rb, selectedGodina)

      doc.setFontSize(9)
      const kupacLines = doc.splitTextToSize(ascii(p.klijent), Math.max(colW3 - cellPadding * 2, 10))
      const brojRacLines = doc.splitTextToSize(ascii(brojRacStr), Math.max(colW4 - cellPadding * 2, 8))
      const numLines = Math.max(1, kupacLines.length, brojRacLines.length)
      const rowH = Math.max(rowHeightHeader, numLines * lineHeight + cellPadding)

      if (y + rowH > bottomY) {
        doc.addPage()
        y = margin + rowHeightHeader
        drawHeaderRow(margin)
        y = margin + rowHeightHeader
      }

      drawRowBorders5(y, rowH)
      doc.setTextColor(0, 0, 0)
      const midY = y + rowH / 2 + 1.5
      doc.text(String(rb), x1 + cellPadding, midY)
      doc.text(datumStr, x2 + cellPadding, midY)
      let lineY = y + cellPadding + 3.5
      kupacLines.forEach((line: string) => {
        doc.text(line, x3 + cellPadding, lineY)
        lineY += lineHeight
      })
      lineY = y + cellPadding + 3.5
      brojRacLines.forEach((line: string) => {
        doc.text(line, x4 + cellPadding, lineY)
        lineY += lineHeight
      })
      doc.text(formatIznosPDF(p.iznos_rsd ?? 0), x5 + colW5 - cellPadding, midY, { align: 'right' })
      y += rowH
    })

    const ukupnoRowH = 9
    drawRowBorders5(y, ukupnoRowH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('UKUPNO:', x3 + cellPadding, y + ukupnoRowH / 2 + 0.5)
    doc.text(formatIznosPDF(ukupnoFilter), x5 + colW5 - cellPadding, y + ukupnoRowH / 2, { align: 'right' })
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
    const sortirane = filtriraneSortirane

    const formatDatumExcel = (d: string) => {
      const [god, mes, dan] = d.split('-')
      return `${dan}.${mes}.${god}`
    }

    const redovi = sortirane.map((p) => {
      const rb = redniBrojMap.get(p.id) ?? 0
      return {
        'Red. br.': rb,
        'Datum naplate': formatDatumExcel(p.datum),
        'Naziv i adresa kupca': p.klijent,
        'Broj računa': brojRacunaZaPrikaz(p.napomena, rb, selectedGodina),
        'Iznos orig.': p.valuta === 'RSD' ? `${formatIznos(p.iznos)} RSD` : `${formatIznos(p.iznos)} ${p.valuta || 'EUR'}`,
        'Iznos u RSD': p.iznos_rsd ?? 0,
      }
    })

    redovi.push({
      'Red. br.': '',
      'Datum naplate': '',
      'Naziv i adresa kupca': 'UKUPNO',
      'Broj računa': '',
      'Iznos orig.': '',
      'Iznos u RSD': ukupnoFilter,
    } as any)

    const ws = XLSX.utils.json_to_sheet(redovi)

    const zaglavlje = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1']
    zaglavlje.forEach(ref => {
      if (ws[ref]) (ws[ref] as any).s = { font: { bold: true } }
    })

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let r = 1; r <= range.e.r; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: 5 })
      const cell = ws[ref]
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n'
        cell.z = '#,##0.00'
        if (cell.s) (cell.s as any).numFmt = '#,##0.00'
      }
    }

    ws['!cols'] = [
      { wch: 8 }, { wch: 14 }, { wch: 36 }, { wch: 16 },
      { wch: 16 }, { wch: 16 },
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
    router.replace('/login?next=/kpo')
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Preusmeravam na prijavu…</span>
      </div>
    )
  }

  const inp = {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: 16,
    outline: 'none',
    marginBottom: 12,
  }

  const kpoGridCols = KPO_TABLE_GRID_COLS

  return (
    <div className="kpo-page" style={{ color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: toast.tone === 'success' ? '#22c55e' : 'var(--alert-danger-solid)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 24px',
          borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast.message}
        </div>
      )}

      <ConfirmModal
        open={brisanjeId != null}
        message="Da li si siguran da želiš da obrišeš ovaj prihod?"
        confirmText="Da, obriši"
        cancelText="Ne"
        onCancel={() => setBrisanjeId(null)}
        onConfirm={() => {
          if (!brisanjeId) return
          void obrisiPrihod(brisanjeId)
        }}
      />

      {editOpen && (
        <div
          className="kpo-modal-overlay"
          onClick={() => !editSaving && setEditOpen(false)}
          role="presentation"
        >
          <div
            className="kpo-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Izmena prihoda"
          >
            <div className="kpo-modal-head">
              <h2 className="kpo-modal-title">Izmeni prihod</h2>
              <button type="button" className="kpo-modal-close" disabled={editSaving} onClick={() => setEditOpen(false)} aria-label="Zatvori">×</button>
            </div>
            <div className="kpo-modal-body">
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Klijent</label>
              <input type="text" value={editForm.klijent} onChange={e => setEditForm(f => ({ ...f, klijent: e.target.value }))} style={inp} />
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <input type="number" value={editForm.iznos} onChange={e => setEditForm(f => ({ ...f, iznos: e.target.value }))} style={{ ...inp, marginBottom: 0, flex: 1 }} />
                <select value={editForm.valuta} onChange={e => setEditForm(f => ({ ...f, valuta: e.target.value as Valuta }))} style={{ ...inp, marginBottom: 0, minWidth: 88 }}>
                  <option value="RSD">RSD</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Datum</label>
              <input type="date" value={editForm.datum} onChange={e => setEditForm(f => ({ ...f, datum: e.target.value }))} style={inp} />
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Napomena</label>
              <input type="text" value={editForm.napomena} onChange={e => setEditForm(f => ({ ...f, napomena: e.target.value }))} style={inp} />
              <button
                type="button"
                className="kpo-modal-save"
                onClick={() => void sacuvajIzmenuPrihoda()}
                disabled={editSaving}
                style={{ opacity: editSaving ? 0.85 : 1, cursor: editSaving ? 'not-allowed' : 'pointer' }}
              >
                {editSaving ? 'Čuvanje…' : 'Sačuvaj izmene'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="kpo-header">
        <div className="kpo-title-block">
          <button type="button" className="kpo-back-btn" onClick={() => window.history.back()} aria-label="Nazad">←</button>
          <span className="kpo-title-emoji" aria-hidden>📒</span>
          <div className="kpo-title-text">
            <span className="kpo-title-kicker">Evidencija</span>
            <span className="kpo-title-main">Arhiva i KPO</span>
          </div>
        </div>
        <div className="kpo-header-actions">
          <ThemeToggle />
          <button type="button" className="kpo-export-btn kpo-export-btn--excel" onClick={() => void preuzmiExcel()}>
            <FileSpreadsheet size={20} strokeWidth={2.25} aria-hidden />
            Excel
          </button>
          <button type="button" className="kpo-export-btn kpo-export-btn--pdf" onClick={() => void preuzmiPDF()}>
            <FileDown size={20} strokeWidth={2.25} aria-hidden />
            PDF
          </button>
        </div>
      </header>

      <div className="page-content dashboard-main-column" style={{ padding: '22px 16px 100px 16px' }}>
        {kpoAsOf && (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 14px 0', fontWeight: 600 }}>
            Poslednje ažuriranje: {formatOfflineTimestamp(kpoAsOf)}
          </p>
        )}

        <div className="kpo-stat-grid">
          <div className="kpo-stat-card">
            <p className="kpo-stat-label">Ukupan promet ({selectedGodina})</p>
            <p className="kpo-stat-value">
              {formatIznos(ukupnoSaPocetkom)}
              <span className="kpo-stat-unit">RSD</span>
            </p>
            {ukupnoSaPocetkom !== ukupnoRSD && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                U aplikaciji: {formatIznos(ukupnoRSD)} RSD · uključen početni prihod za godinu
              </p>
            )}
          </div>
          <div className="kpo-stat-card kpo-stat-card--muted">
            <p className="kpo-stat-label">Broj prihoda</p>
            <p className="kpo-stat-value">{filtriranePoGodini.length}</p>
          </div>
        </div>

        <div className="kpo-limit-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <p className="kpo-filter-label" style={{ marginBottom: 6 }}>Godišnji limit (paušal)</p>
              <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {formatIznos(kpoLimitRsd)} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>RSD</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="kpo-filter-label" style={{ marginBottom: 6 }}>Preostalo do limita</p>
              <p style={{ color: limitTrackColor, fontWeight: 800, fontSize: 20, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {formatIznos(preostaloDoLimita)} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>RSD</span>
              </p>
            </div>
          </div>
          <div className="kpo-limit-track" aria-hidden>
            <div className="kpo-limit-marker-80" title="80% limita" />
            <div
              className="kpo-limit-fill"
              style={{
                width: `${limitBarFillPct}%`,
                background: limitTrackColor,
                boxShadow: `0 0 24px color-mix(in srgb, ${limitTrackColor} 50%, transparent)`,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            <span>Iskorišćeno: <strong style={{ color: 'var(--text-primary)' }}>{limitPctRaw.toFixed(1)}%</strong></span>
            <span style={{ fontWeight: 600 }}>
              {limitPctRaw >= 100 ? 'Limit dostignut ili prekoračen' : limitPctRaw >= 80 ? 'Blizu limita (≥80%)' : 'U okviru limita'}
            </span>
          </div>
          <p style={{ margin: '12px 0 0 0', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Godišnji limit prihoda podešavaš u{' '}
            <Link href="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>Podešavanjima profila</Link>.
          </p>
        </div>

        <p className="kpo-filter-label">Godina</p>
        <div className="kpo-segment" style={{ marginBottom: 14 }}>
          {[2022, 2023, 2024, 2025, 2026].map(g => (
            <button
              key={g}
              type="button"
              className={`kpo-segment-btn${selectedGodina === g ? ' kpo-segment-btn--active' : ''}`}
              onClick={() => setSelectedGodina(g)}
            >
              {g}
            </button>
          ))}
        </div>

        <p className="kpo-filter-label">Period (kvartal)</p>
        <div className="kpo-segment kpo-segment--quarters" style={{ marginBottom: 16 }}>
          {(['sve', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(k => (
            <button
              key={k}
              type="button"
              className={`kpo-segment-btn${filter === k ? ' kpo-segment-btn--active' : ''}`}
              onClick={() => setFilter(k)}
            >
              {k === 'sve' ? 'Sve' : k}
            </button>
          ))}
        </div>

        <p className="kpo-filter-label">Sortiranje</p>
        <div className="kpo-sort-bar" role="group" aria-label="Sortiranje redova">
          {([
            { key: 'datum-asc' as const, label: 'Datum ↑' },
            { key: 'datum-desc' as const, label: 'Datum ↓' },
            { key: 'iznos-asc' as const, label: 'Iznos ↑' },
            { key: 'iznos-desc' as const, label: 'Iznos ↓' },
          ]).map(opt => (
            <button
              key={opt.key}
              type="button"
              className={`kpo-sort-btn${sortBy === opt.key ? ' kpo-sort-btn--active' : ''}`}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <KpoTableSkeleton rows={4} />
        ) : prihodi.length === 0 ? (
          <ListEmptyState
            icon="📒"
            headline="KPO knjiga je prazna"
            subtext={'KPO se automatski popunjava kada označiš\nfakturu kao plaćenu. Nema ručnog unosa.'}
          >
            <Link
              href="/fakture"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'var(--accent)',
                color: '#000',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 20px',
                borderRadius: 12,
                textDecoration: 'none',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 20px #00C89640',
                transition: 'transform 0.15s ease, box-shadow 0.2s ease',
              }}
            >
              Idi na fakture
            </Link>
          </ListEmptyState>
        ) : filtrirane.length === 0 ? (
          <div className="kpo-empty">
            <p style={{ fontSize: 40, margin: '0 0 12px 0', lineHeight: 1 }} aria-hidden>📋</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Nema prihoda za ovaj period</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, marginBottom: 16, lineHeight: 1.45 }}>Promeni godinu ili kvartal, ili dodaj prihod iz Pregleda / Prihoda.</p>
          </div>
        ) : (
          <div className="table-scroll-wrap kpo-scroll-sticky" style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}>
          <div className="table-min-width kpo-table kpo-table-shell">
            <div className="kpo-table-head" style={{ gridTemplateColumns: kpoGridCols }}>
              <p>Red. br.</p>
              <p>Datum naplate</p>
              <p>Naziv i adresa kupca</p>
              <p>Broj računa</p>
              <p style={{ textAlign: 'right' }}>Iznos orig.</p>
              <p style={{ textAlign: 'right' }}>Iznos RSD</p>
              <p style={{ textAlign: 'right' }}>Akcije</p>
            </div>

            {filtriranesBrojevima.map((p, rowIdx) => {
              const over70 = isOver70(p.klijent)
              const stripe = !over70 && rowIdx % 2 === 1
              return (
                <div
                  key={p.id}
                  className={`kpo-table-row${stripe ? ' kpo-table-row--stripe' : ''}${over70 ? ' kpo-table-row--over70' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: kpoGridCols,
                    gap: 8,
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                    background: over70 ? 'rgba(249, 115, 22, 0.12)' : undefined,
                    borderLeft: over70 ? '3px solid #f97316' : undefined,
                  }}
                >
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, fontWeight: 600 }}>{p.redniBroj}.</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{formatDatum(p.datum)}</p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500, margin: 0, lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'break-word' }} title={p.klijent}>
                    {p.klijent}
                  </p>
                  <p className="kpo-fakt-badge" title={brojRacunaZaPrikaz(p.napomena, p.redniBroj, selectedGodina)}>
                    {brojRacunaZaPrikaz(p.napomena, p.redniBroj, selectedGodina)}
                  </p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 12, margin: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{iznosOriginal(p)}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{formatIznos(p.iznos_rsd ?? 0)} RSD</span>
                    <span title={nbsTooltipText(p)} style={{ cursor: 'help', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }} aria-label="Kurs NBS">
                      <Info size={16} strokeWidth={2.25} />
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      type="button"
                      className="kpo-action-btn kpo-action-btn--edit"
                      onClick={() => otvoriIzmenuPrihoda(p)}
                      aria-label="Izmeni prihod"
                    >
                      <Pencil size={17} strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      className="kpo-action-btn kpo-action-btn--delete"
                      onClick={() => setBrisanjeId(p.id)}
                      aria-label="Obriši prihod"
                    >
                      <Trash2 size={17} strokeWidth={2.25} />
                    </button>
                  </div>
                </div>
              )
            })}

            <div className="kpo-table-footer" style={{ display: 'grid', gridTemplateColumns: kpoGridCols, gap: 8, padding: '16px 16px', alignItems: 'center' }}>
              <div />
              <div />
              <div />
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, fontWeight: 800, letterSpacing: '0.04em' }}>UKUPNO {filter !== 'sve' ? filter : ''}</p>
              <div />
              <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 15, margin: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {filter !== 'sve' && <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: 8 }}>{filtrirane.length} {filtrirane.length === 1 ? 'faktura' : filtrirane.length >= 2 && filtrirane.length <= 4 ? 'fakture' : 'faktura'}</span>}
                {formatIznos(ukupnoFilter)} RSD
              </p>
              <div />
            </div>
            {filtrirane.some(p => isOver70(p.klijent)) && (
              <div className="kpo-warning-banner">
                <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>⚠️</span>
                <p>
                  Narandžasta oznaka: klijent čini više od 70% prihoda u prikazu (test samostalnosti).
                </p>
              </div>
            )}
          </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
