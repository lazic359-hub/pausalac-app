'use client'

import { useEffect, useRef } from 'react'
import { FAKTURA_STATUS_LABELS, type FakturaStatusDisplay } from '@/lib/faktura-status'

type FakturaPayloadStavka = { opis?: string; iznos?: string }

function formatIznos(n: number) {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function formatDatum(d: string) {
  const p = d.split('-')
  if (p.length !== 3) return d
  return `${p[2]}.${p[1]}.${p[0]}.`
}

export function FakturaDetailsModal(props: {
  open: boolean
  displayBroj: string
  klijent: string
  datum: string
  /** Iznos u valuti fakture (EUR/USD); za RSD isto kao RSD red. */
  iznosOriginal: number | null
  iznosRsd: number
  valuta: string | null
  status: FakturaStatusDisplay
  napomena: string | null
  payload: unknown
  onClose: () => void
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!props.open) return
    closeBtnRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props.open, props.onClose])

  if (!props.open) return null

  let stavke: FakturaPayloadStavka[] = []
  if (props.payload && typeof props.payload === 'object' && props.payload !== null && 'stavke' in props.payload) {
    const raw = (props.payload as { stavke?: unknown }).stavke
    if (Array.isArray(raw)) stavke = raw.filter((s): s is FakturaPayloadStavka => s != null && typeof s === 'object')
  }

  return (
    <div className="app-modal-overlay" onClick={props.onClose} role="presentation">
      <div
        className="app-modal-panel"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalji fakture"
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>FAKTURA</div>
            <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginTop: 4 }}>{props.displayBroj}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{props.klijent}</div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={props.onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 26, cursor: 'pointer', lineHeight: 1, padding: 2, flexShrink: 0 }}
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <div style={{ padding: 18, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>DATUM</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>{formatDatum(props.datum)}</div>
            </div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>STATUS</div>
              <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>{FAKTURA_STATUS_LABELS[props.status]}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>IZNOS</div>
            {props.valuta && props.valuta !== 'RSD' && props.iznosOriginal != null && (
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                {formatIznos(props.iznosOriginal)} {props.valuta}
              </div>
            )}
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Protivvrednost (RSD)</div>
            <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 20 }}>{formatIznos(props.iznosRsd)} RSD</div>
            {props.valuta && props.valuta !== 'RSD' && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>
                Po srednjem kursu NBS za datum fakture ({formatDatum(props.datum)}).
              </div>
            )}
          </div>

          {stavke.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 8 }}>STAVKE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stavke.map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.opis || '—'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.iznos ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(props.napomena ?? '').trim() && (
            <div style={{ marginTop: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 6 }}>NAPOMENA</div>
              <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{props.napomena}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
