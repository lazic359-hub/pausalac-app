'use client'
import dynamic from 'next/dynamic'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false }
)

const FakturaPDF = dynamic(() => import('./FakturaPDF'), { ssr: false })

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
  style?: React.CSSProperties
  label?: string
}

export default function PreuzmiPDFDugme({ brojFakture, datum, izdavalac, klijent, stavke, napomena, valuta, kurs, style, label }: Props) {
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
    />
  )

  return (
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
      {({ loading }) => loading ? '⏳ Priprema PDF...' : (label || '📄 Preuzmi PDF')}
    </PDFDownloadLink>
  )
}