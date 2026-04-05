'use client'

import { useEffect, useRef } from 'react'
export function ProUpgradeModal(props: {
  open: boolean
  onClose: () => void
  title?: string
  body?: string
}) {
  const primaryRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (!props.open) return
    primaryRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props.open, props.onClose])

  if (!props.open) return null

  const title = props.title ?? 'Ova funkcija je deo Pro plana'
  const body =
    props.body ??
    'Nadogradi na Pro: mesečna pretplata od 4,99 € — neograničene fakture, viševalutno fakturisanje i PDF izvoz KPO knjige.'

  return (
    <div className="app-modal-overlay" onClick={props.onClose} role="presentation">
      <div
        className="app-modal-panel app-modal-panel--narrow"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-upgrade-title"
      >
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div id="pro-upgrade-title" style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 16 }}>
            {title}
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>{body}</p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={props.onClose}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Zatvori
            </button>
            <a
              ref={primaryRef}
              href="/pricing"
              onClick={props.onClose}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent)',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 15,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Nadogradi na Pro
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
