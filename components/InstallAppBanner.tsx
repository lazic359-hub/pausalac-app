'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const DISMISS_KEY = 'pausalac_install_prompt_dismissed'
const VISIT_COUNT_KEY = 'pausalac_visit_sessions'
const SESSION_MARK_KEY = 'pausalac_visit_session_counted'

function readDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(DISMISS_KEY) === '1'
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return true
  const mq = window.matchMedia('(display-mode: standalone)')
  if (mq.matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallAppBanner() {
  const [visible, setVisible] = useState(false)
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const isIosDevice =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' &&
        ((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0) > 1))

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
    document.body.classList.remove('install-app-banner-visible')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (readDismissed() || isStandaloneDisplay()) return

    let sessions = 0
    try {
      if (!sessionStorage.getItem(SESSION_MARK_KEY)) {
        sessionStorage.setItem(SESSION_MARK_KEY, '1')
        const prev = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10)
        sessions = Number.isFinite(prev) ? prev + 1 : 1
        localStorage.setItem(VISIT_COUNT_KEY, String(sessions))
      } else {
        sessions = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10)
      }
    } catch {
      return
    }

    if (sessions < 3) return

    setVisible(true)
    document.body.classList.add('install-app-banner-visible')
    return () => {
      document.body.classList.remove('install-app-banner-visible')
    }
  }, [])

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return
    const onBip = (e: Event) => {
      e.preventDefault()
      deferredRef.current = e as BeforeInstallPromptEvent
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [visible])

  const onInstall = useCallback(async () => {
    const ev = deferredRef.current
    if (ev) {
      try {
        await ev.prompt()
        await ev.userChoice
      } catch {
        /* ignore */
      }
      deferredRef.current = null
      return
    }
    if (isIosDevice) setIosHint((h) => !h)
  }, [isIosDevice])

  if (!visible) return null

  return (
    <div
      className="install-app-banner"
      role="region"
      aria-label="Instalacija aplikacije"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'var(--bottom-nav-height)',
        zIndex: 1003,
        padding: '12px 14px',
        paddingLeft: 'max(14px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(14px, env(safe-area-inset-right, 0px))',
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 24px color-mix(in srgb, var(--text-primary) 8%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: 4,
              lineHeight: 1.25,
            }}
          >
            Instaliraj aplikaciju
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--text-muted)', fontWeight: 500 }}>
            Dodaj Paušo na početni ekran za brži pristup
          </p>
          {iosHint ? (
            <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.4, color: 'var(--text-muted)' }}>
              Dodirni „Podeli“ (□↑) pa izaberi „Dodaj na početni ekran“.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Zatvori"
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            border: 'none',
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
            color: 'var(--text-muted)',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={onInstall}
        style={{
          width: '100%',
          minHeight: 44,
          border: 'none',
          borderRadius: 12,
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Instaliraj
      </button>
    </div>
  )
}
