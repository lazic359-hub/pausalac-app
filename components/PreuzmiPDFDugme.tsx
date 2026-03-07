'use client'
import { useEffect, useState } from 'react'

type Stavka = { opis: string; iznos: string }
type Props = {
  brojFakture: string
  datum: string
  izdavalac: { nazivFirme: string; pib: string; maticniBroj: string; brojRacuna: string }
  klijent: { naziv: string; pib?: string; adresa: string }
  stavke: Stavka[]
  napomena?: string
  valuta?: string
  kurs?: number
  legalNotes?: string
  style?: React.CSSProperties
  label?: string
}

export default function PreuzmiPDFDugme({ brojFakture, datum, izdavalac, klijent, stavke, napomena, valuta, kurs, legalNotes, style, label }: Props) {
  const [Komp, setKomp] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      import('@react-pdf/renderer'),
      import('./FakturaPDF'),
    ]).then(([renderer, fakturaMod]) => {
      const { PDFDownloadLink } = renderer
      const FakturaPDF = fakturaMod.default

      const dokument = (
        <FakturaPDF
          brojFakture={brojFakture}
          datum={datum}
          izdavalac={izdavalac}
          klijent={klijent}
          stavke={stavke}
          napomena={napomena}
          valuta={valuta}
          kurs={kurs}
          legalNotes={legalNotes}
        />
      )

      setKomp(
        <PDFDownloadLink
          document={dokument}
          fileName={`faktura-${brojFakture}.pdf`}
          style={{
            background: '#0d1117',
            border: '1px solid #1a2040',
            borderRadius: 12,
            padding: '14px',
            color: '#00ffb3',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            textAlign: 'center',
            display: 'block',
            cursor: 'pointer',
            ...style,
          }}
        >
          {({ loading }: { loading: boolean }) => loading ? '⏳ Priprema PDF...' : (label || '📄 Preuzmi PDF')}
        </PDFDownloadLink>
      )
    })
  }, [brojFakture])

  if (!Komp) return (
    <button disabled style={{
      width: '100%', background: '#0d1117', border: '1px solid #1a2040',
      borderRadius: 12, padding: '14px', color: '#444',
      fontSize: 14, fontWeight: 700, cursor: 'not-allowed',
    }}>
      ⏳ Priprema PDF...
    </button>
  )

  return Komp
}