'use client'

import { useEffect, useRef } from 'react'

type IncomeLike = {
  id: string
  klijent: string | null
  datum: string | null
  iznos: number | null
  valuta: string | null
  iznos_rsd: number | null
  napomena?: string | null
}

function formatIznos(n: number) {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function formatDatum(d: string) {
  const p = d.split('-')
  if (p.length !== 3) return d
  return `${p[2]}.${p[1]}.${p[0]}.`
}

export function IncomeDetailsModal(props: {
  open: boolean
  income: IncomeLike | null
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

  if (!props.open || !props.income) return null

  const i = props.income
  const napomena = (i.napomena ?? '').trim()

  return (
    <div className="app-modal-overlay" onClick={props.onClose} role="presentation">
      <div
        className="app-modal-panel"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalji prihoda"
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>DETALJI</div>
            <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {i.klijent || 'Prihod'}
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={props.onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 26, cursor: 'pointer', lineHeight: 1, padding: 2 }}
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <div style={{ padding: 18, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>DATUM</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>{i.datum ? formatDatum(i.datum) : '—'}</div>
            </div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>IZNOS</div>
              <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 14 }}>
                {typeof i.iznos === 'number' ? formatIznos(i.iznos) : '—'} {i.valuta || ''}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {typeof i.iznos_rsd === 'number' ? `${formatIznos(i.iznos_rsd)} RSD` : '—'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2, opacity: 0.75 }}>
                Kurs na dan uplate
              </div>
            </div>
          </div>

          {napomena && (
            <div style={{ marginTop: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 6 }}>NAPOMENA</div>
              <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{napomena}</div>
            </div>
          )}

          <div style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 11 }}>
            ID: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{i.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
