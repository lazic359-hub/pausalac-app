'use client'
import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import jsPDF from 'jspdf'

type KpoUnos = {
  datum: string
  klijent: string
  iznos: number
  brojFakture: string
  nacinPlacanja?: string
}

const KVARTALI = {
  Q1: ['01', '02', '03'],
  Q2: ['04', '05', '06'],
  Q3: ['07', '08', '09'],
  Q4: ['10', '11', '12'],
}

export default function KpoPage() {
  const [fakture, setFakture] = useState<KpoUnos[]>([])
  const [filter, setFilter] = useState<'sve' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('sve')
  const [selectedGodina, setSelectedGodina] = useState<number>(new Date().getFullYear())
  const [brisanje, setBrisanje] = useState<number | null>(null)
  const [undoStavka, setUndoStavka] = useState<{ stavka: KpoUnos; index: number } | null>(null)
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ucitaj()
  }, [])

  const ucitaj = () => {
    const saved = localStorage.getItem('kpo_knjiga')
    if (saved) {
      const lista: KpoUnos[] = JSON.parse(saved)
      lista.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
      setFakture(lista)
    }
  }

  const filtriranePoGodini = fakture.filter(f =>
    new Date(f.datum).getFullYear() === selectedGodina
  )

  const filtrirane = filtriranePoGodini.filter(f => {
    if (filter === 'sve') return true
    const mes = f.datum.split('-')[1]
    return KVARTALI[filter].includes(mes)
  })

  const filtriranesBrojevima = filtrirane.map((f, i) => ({
    ...f,
    redniBroj: i + 1
  }))

  const ukupno = filtrirane.reduce((sum, f) => sum + f.iznos, 0)
  const ukupnoSve = filtriranePoGodini.reduce((sum, f) => sum + f.iznos, 0)

  const potvrdiDrisanje = (index: number) => {
    setBrisanje(index)
  }

  const obrisi = (index: number) => {
    const stavka = filtrirane[index]
    const globalIndex = fakture.findIndex(
      f => f.datum === stavka.datum && f.klijent === stavka.klijent && f.iznos === stavka.iznos
    )
    const novaLista = [...fakture]
    novaLista.splice(globalIndex, 1)
    setFakture(novaLista)
    localStorage.setItem('kpo_knjiga', JSON.stringify(novaLista))
    setBrisanje(null)
    setUndoStavka({ stavka, index: globalIndex })
    if (undoTimer) clearTimeout(undoTimer)
    const t = setTimeout(() => setUndoStavka(null), 5000)
    setUndoTimer(t)
  }

  const undo = () => {
    if (!undoStavka) return
    const novaLista = [...fakture]
    novaLista.splice(undoStavka.index, 0, undoStavka.stavka)
    novaLista.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
    setFakture(novaLista)
    localStorage.setItem('kpo_knjiga', JSON.stringify(novaLista))
    setUndoStavka(null)
    if (undoTimer) clearTimeout(undoTimer)
  }

  const formatDatum = (d: string) => {
    const [god, mes, dan] = d.split('-')
    return `${dan}.${mes}.${god}`
  }

  const formatIznos = (iznos: number) =>
    new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(iznos)

  const preuzmiPDF = async () => {
    const doc = new jsPDF()
    const ukupnoStrana = () => (doc as any).internal.getNumberOfPages()
    const sada = new Date().toLocaleString('sr-RS')

    const ascii = (t: string) => t
      .replace(/[čć]/g, 'c').replace(/[ČĆ]/g, 'C')
      .replace(/[š]/g, 's').replace(/[Š]/g, 'S')
      .replace(/[ž]/g, 'z').replace(/[Ž]/g, 'Z')
      .replace(/[đ]/g, 'dj').replace(/[Đ]/g, 'Dj')

    // Učitaj podatke o firmi
    const profilRaw = localStorage.getItem('pausalac_profil')
    const profil = profilRaw ? JSON.parse(profilRaw) : {}
    const nazivFirme = ascii(profil.nazivFirme || '')
    const pib = profil.pib || ''
    const maticniBroj = profil.maticniBroj || ''

    const formatIznosPDF = (iznos: number) =>
      new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(iznos) + ' RSD'

    // Sortiraj hronološki
    const sortirane = [...filtrirane].sort(
      (a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime()
    )

    const dodajFooter = () => {
      const ukupno = ukupnoStrana()
      for (let i = 1; i <= ukupno; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Generisano: ${sada}`, 14, 290)
        doc.text(`Stranica ${i} od ${ukupno}`, 196, 290, { align: 'right' })
      }
    }

    // Zaglavlje firme (gornji levi ugao)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(nazivFirme, 14, 14)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    if (pib) doc.text(`PIB: ${pib}`, 14, 20)
    if (maticniBroj) doc.text(`Maticni broj: ${maticniBroj}`, 14, 25)

    // Linija ispod zaglavlja firme
    doc.setDrawColor(200, 200, 200)
    doc.line(14, 29, 196, 29)

    // Naslov dokumenta
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`KPO Knjiga — ${selectedGodina}`, 14, 38)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Period: ${filter !== 'sve' ? filter : 'Cela godina'}`, 14, 44)
    doc.text(`Ukupno: ${formatIznosPDF(ukupno)}`, 14, 49)

    // Zaglavlje tabele
    const tableTop = 55
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.setFillColor(220, 220, 220)
    doc.rect(14, tableTop, 182, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('BR.', 16, tableTop + 5.5)
    doc.text('DATUM', 28, tableTop + 5.5)
    doc.text('KUPAC', 65, tableTop + 5.5)
    doc.text('BR. FAKTURE', 112, tableTop + 5.5)
    doc.text('PLACANJE', 150, tableTop + 5.5)
    doc.text('IZNOS (RSD)', 175, tableTop + 5.5)
    doc.setFont('helvetica', 'normal')

    let y = tableTop + 12

    sortirane.forEach((f, i) => {
      if (y > 275) {
        doc.addPage()
        // Ponovi zaglavlje na novoj strani
        doc.setFillColor(220, 220, 220)
        doc.rect(14, 14, 182, 8, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('BR.', 16, 19.5)
        doc.text('DATUM', 28, 19.5)
        doc.text('KUPAC', 65, 19.5)
        doc.text('BR. FAKTURE', 112, 19.5)
        doc.text('PLACANJE', 150, 19.5)
        doc.text('IZNOS (RSD)', 175, 19.5)
        doc.setFont('helvetica', 'normal')
        y = 28
      }

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.text(String(i + 1), 16, y)
      doc.text(formatDatum(f.datum), 28, y)
      doc.text(ascii(f.klijent).substring(0, 35), 65, y)
      doc.text(f.brojFakture || '-', 112, y)
      const placanje = (f.nacinPlacanja || 'Prenos').replace('Prenos na račun', 'Prenos').replace('Gotovina', 'Gotovina').replace('Kartica', 'Kartica')
      doc.text(placanje, 150, y)
      doc.text(formatIznosPDF(f.iznos), 196, y, { align: 'right' })
      doc.setDrawColor(220, 220, 220)
      doc.line(14, y + 2.5, 196, y + 2.5)
      y += 9
    })

    // Ukupno na kraju
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(`UKUPNO: ${formatIznosPDF(ukupno)}`, 196, y + 8, { align: 'right' })

    // Mesto, datum i potpis
    const sediste = profil.sediste ? `U ${ascii(profil.sediste)}` : 'U ______'
    const d = new Date()
    const datumDanas = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
    const ukupnoStr = ukupnoStrana()
    for (let i = 1; i <= ukupnoStr; i++) {
      doc.setPage(i)
      if (i === ukupnoStr) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(`${sediste}, dana ${datumDanas}`, 14, 272)
        doc.setDrawColor(0, 0, 0)
        doc.line(130, 278, 196, 278)
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text('Potpis odgovornog lica', 163, 283, { align: 'center' })
      }
    }

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

    const redovi = sortirane.map((f, i) => ({
      'BR.': i + 1,
      'DATUM': formatDatumExcel(f.datum),
      'KUPAC': f.klijent,
      'BROJ FAKTURE': f.brojFakture || '-',
      'NACIN PLACANJA': f.nacinPlacanja || 'Prenos na racun',
      'IZNOS (RSD)': f.iznos,
    }))

    // Ukupno red
    redovi.push({
      'BR.': '' as any,
      'DATUM': '',
      'KUPAC': 'UKUPNO',
      'BROJ FAKTURE': '',
      'NACIN PLACANJA': '',
      'IZNOS (RSD)': filtrirane.reduce((sum, f) => sum + f.iznos, 0),
    })

    const ws = XLSX.utils.json_to_sheet(redovi)

    // Boldiranje zaglavlja
    const zaglavlje = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1']
    zaglavlje.forEach(ref => {
      if (ws[ref]) ws[ref].s = { font: { bold: true } }
    })

    // Širine kolona
    ws['!cols'] = [
      { wch: 5 },   // BR.
      { wch: 12 },  // DATUM
      { wch: 30 },  // KUPAC
      { wch: 18 },  // BROJ FAKTURE
      { wch: 20 },  // NACIN PLACANJA
      { wch: 15 },  // IZNOS
    ]

    const wb = XLSX.utils.book_new()
    wb.Workbook = { Views: [{ RTL: false }] }
    XLSX.utils.book_append_sheet(wb, ws, `KPO ${selectedGodina}`)

    const d = new Date()
    const datum = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
    XLSX.writeFile(wb, `KPO_Knjiga_${selectedGodina}_${datum}.xlsx`, { cellStyles: true })
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 18 }}>📒</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#00ffb3' }}>Arhiva i KPO</span>
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
            style={{ background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ⬇️ PDF
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 40px 16px' }}>

        {/* Ukupan promet */}
        <div style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1e 100%)', border: '1px solid #1a2040', borderRadius: 16, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 4px 0' }}>UKUPAN PROMET {selectedGodina}.</p>
            <p style={{ color: '#00ffb3', fontWeight: 800, fontSize: 28, margin: 0 }}>{ukupnoSve.toLocaleString()} <span style={{ fontSize: 14, color: '#444' }}>RSD</span></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 4px 0' }}>BROJ FAKTURA</p>
            <p style={{ color: '#00ffb3', fontWeight: 800, fontSize: 28, margin: 0 }}>{fakture.length}</p>
          </div>
        </div>

        {/* Godišnji filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: 12 }}>Godina:</span>
          {[2022, 2023, 2024, 2025, 2026].map(g => (
            <button
              key={g}
              onClick={() => setSelectedGodina(g)}
              style={{
                background: selectedGodina === g ? '#00ffb3' : '#0d1117',
                color: selectedGodina === g ? '#000' : '#555',
                fontWeight: selectedGodina === g ? 700 : 400,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 10,
                border: `1px solid ${selectedGodina === g ? '#00ffb3' : '#1a2040'}`,
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
                background: filter === k ? '#00ffb3' : '#0d1117',
                color: filter === k ? '#000' : '#555',
                fontWeight: filter === k ? 700 : 400,
                fontSize: 13,
                padding: '8px 0',
                borderRadius: 10,
                border: `1px solid ${filter === k ? '#00ffb3' : '#1a2040'}`,
                cursor: 'pointer',
              }}
            >
              {k === 'sve' ? 'Sve' : k}
            </button>
          ))}
        </div>

        {/* Undo poruka */}
        {undoStavka && (
          <div style={{ background: '#1a2040', border: '1px solid #00ffb330', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Faktura obrisana</p>
            <button onClick={undo} style={{ background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
              ↩ Vrati
            </button>
          </div>
        )}

        {/* Tabela */}
        {filtrirane.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#333' }}>
            <p style={{ fontSize: 40 }}>📒</p>
            <p>Nema faktura {filter !== 'sve' ? `za ${filter}` : ''}</p>
          </div>
        ) : (
          <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, overflow: 'hidden' }}>

            {/* Header tabele */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 90px 1fr 110px 40px', gap: 8, padding: '12px 16px', borderBottom: '1px solid #1a2040', background: '#111' }}>
              <p style={{ color: '#444', fontSize: 11, margin: 0 }}>BR.</p>
              <p style={{ color: '#444', fontSize: 11, margin: 0 }}>DATUM</p>
              <p style={{ color: '#444', fontSize: 11, margin: 0 }}>KUPAC</p>
              <p style={{ color: '#444', fontSize: 11, margin: 0, textAlign: 'right' }}>IZNOS</p>
              <div />
            </div>

            {/* Redovi */}
            {filtriranesBrojevima.map((f, i) => (
              <div key={i}>
                {brisanje === i ? (
                  <div style={{ padding: '14px 16px', background: '#1a0a0a', borderBottom: '1px solid #1a2040', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>Obrisati ovu fakturu?</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setBrisanje(null)} style={{ background: '#1a2040', border: 'none', color: '#888', fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
                        Otkaži
                      </button>
                      <button onClick={() => obrisi(i)} style={{ background: '#ff4d4d', border: 'none', color: 'white', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
                        Da, obriši
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 90px 1fr 110px 40px', gap: 8, padding: '14px 16px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <p style={{ color: '#444', fontSize: 12, margin: 0 }}>{f.redniBroj}.</p>
                    <p style={{ color: '#666', fontSize: 12, margin: 0 }}>{formatDatum(f.datum)}</p>
                    <p style={{ color: '#ddd', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.klijent}</p>
                    <p style={{ color: '#00ffb3', fontWeight: 700, fontSize: 13, margin: 0, textAlign: 'right' }}>{formatIznos(f.iznos)} RSD</p>
                    <button
                      onClick={() => potvrdiDrisanje(i)}
                      style={{ background: 'none', border: 'none', color: '#333', fontSize: 18, cursor: 'pointer', textAlign: 'center' }}
                    >×</button>
                  </div>
                )}
              </div>
            ))}

            {/* Footer — ukupno za filter */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 90px 1fr 110px 40px', gap: 8, padding: '14px 16px', background: '#111', alignItems: 'center' }}>
              <div />
              <div />
              <p style={{ color: '#555', fontSize: 12, margin: 0, fontWeight: 700 }}>UKUPNO {filter !== 'sve' ? filter : ''}</p>
              <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 14, margin: 0, textAlign: 'right' }}>{formatIznos(ukupno)} RSD</p>
              <div />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}