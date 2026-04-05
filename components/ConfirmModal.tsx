'use client'

import { useEffect, useRef } from 'react'

export function ConfirmModal(props: {
  open: boolean
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!props.open) return
    confirmBtnRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props.open, props.onCancel])

  if (!props.open) return null

  const confirmText = props.confirmText ?? 'Obriši'
  const cancelText = props.cancelText ?? 'Otkaži'

  return (
    <div className="app-modal-overlay" onClick={props.onCancel} role="presentation">
      <div
        className="app-modal-panel app-modal-panel--narrow"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Potvrda brisanja"
      >
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 16 }}>Potvrda</div>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.45 }}>
            {props.message}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={props.onCancel}
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
              {cancelText}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={props.onConfirm}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: '#ff4d4d',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
