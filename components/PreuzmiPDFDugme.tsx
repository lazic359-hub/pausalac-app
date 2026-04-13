'use client'
import { useEffect, useMemo, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

type Stavka = { opis: string; iznos: string }
type Props = {
  brojFakture: string
  datum: string
  /** Datum valute / rok plaćanja (PDF kolona „Datum valute“). */
  datumValute?: string
  izdavalac: { nazivFirme: string; pib: string; maticniBroj: string; brojRacuna: string }
  klijent: { naziv: string; pib?: string; adresa: string }
  stavke: Stavka[]
  napomena?: string
  valuta?: string
  kurs?: number
  legalNotes?: string
  style?: React.CSSProperties
  label?: string
  /** Kompaktno dugme sa ikonom (npr. u tabeli faktura) */
  variant?: 'default' | 'compact'
}

function PdfIcon() {
  return <FileText size={16} strokeWidth={2} aria-hidden />
}

export default function PreuzmiPDFDugme({ brojFakture, datum, datumValute, izdavalac, klijent, stavke, napomena, valuta, kurs, legalNotes, style, label, variant = 'default' }: Props) {
  const [Komp, setKomp] = useState<any>(null)

  const pdfDeps = useMemo(
    () =>
      JSON.stringify({
        brojFakture,
        datum,
        datumValute,
        stavke,
        izdavalac,
        klijent,
        napomena,
        valuta,
        kurs,
        legalNotes,
        variant,
        label,
        style,
      }),
    [brojFakture, datum, datumValute, stavke, izdavalac, klijent, napomena, valuta, kurs, legalNotes, variant, label, style]
  )

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
          datumValute={datumValute}
          izdavalac={izdavalac}
          klijent={klijent}
          stavke={stavke}
          napomena={napomena}
          valuta={valuta}
          kurs={kurs}
          legalNotes={legalNotes}
        />
      )

      const compact = variant === 'compact'
      setKomp(
        <PDFDownloadLink
          document={dokument}
          fileName={`faktura-${brojFakture}.pdf`}
          className={compact ? 'pdf-dugme-compact' : undefined}
          style={{
            background: 'transparent',
            border: compact ? '1px solid var(--border)' : '1px solid var(--accent)',
            borderRadius: compact ? 10 : 12,
            padding: compact ? '8px 12px' : '14px',
            color: 'var(--accent)',
            fontSize: compact ? 13 : 14,
            fontWeight: 700,
            textDecoration: 'none',
            textAlign: 'center',
            display: compact ? 'inline-flex' : 'block',
            alignItems: compact ? 'center' : undefined,
            justifyContent: compact ? 'center' : undefined,
            gap: compact ? 8 : undefined,
            cursor: 'pointer',
            transition: 'background 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s',
            ...style,
          }}
        >
          {({ loading }: { loading: boolean }) =>
            loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Loader2 className="pdf-dugme-spinner" size={16} strokeWidth={2} aria-hidden />
                Priprema…
              </span>
            ) : compact ? (
              <>
                <PdfIcon />
                <span>{label ?? 'PDF'}</span>
              </>
            ) : (
              (label || 'Preuzmi PDF')
            )}
        </PDFDownloadLink>
      )
    })
  }, [pdfDeps])

  if (!Komp) {
    const compact = variant === 'compact'
    return (
      <button
        type="button"
        disabled
        className={compact ? 'pdf-dugme-compact pdf-dugme-compact--loading' : undefined}
        style={{
          width: compact ? 'auto' : '100%',
          background: 'transparent',
          border: compact ? '1px solid var(--border)' : '1px solid var(--border)',
          borderRadius: compact ? 10 : 12,
          padding: compact ? '8px 12px' : '14px',
          color: 'var(--text-muted)',
          fontSize: compact ? 13 : 14,
          fontWeight: 700,
          cursor: 'not-allowed',
          display: compact ? 'inline-flex' : 'block',
          alignItems: compact ? 'center' : undefined,
          gap: compact ? 8 : undefined,
          ...style,
        }}
      >
        {compact ? (
          <>
            <PdfIcon />
            <span>…</span>
          </>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Loader2 className="pdf-dugme-spinner" size={16} strokeWidth={2} aria-hidden />
            Priprema PDF…
          </span>
        )}
      </button>
    )
  }

  return Komp
}