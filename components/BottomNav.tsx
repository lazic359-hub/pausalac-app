'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const NAV_ITEMS = [
  { key: 'dashboard', icon: '📊', label: 'Pregled', href: '/' },
  { key: 'prihodi', icon: '📋', label: 'Prihodi', href: '/prihodi' },
  { key: 'dodaj', icon: '+', label: 'Dodaj', href: '/' },
  { key: 'faktura', icon: '🧾', label: 'Faktura', href: '/fakture' },
  { key: 'kpo', icon: '📒', label: 'KPO', href: '/kpo' },
  { key: 'settings', icon: '⚙️', label: 'Profil', href: '/settings' },
] as const

function BottomNavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  const isActive = (item: { key: string; href: string }) => {
    if (item.key === 'dashboard') return pathname === '/' && tab !== 'izbor'
    if (item.key === 'dodaj') return pathname === '/' && tab === 'izbor'
    if (item.href === '/') return pathname === '/'
    return pathname.startsWith(item.href)
  }

  return (
    <>
      <nav
        className="bottom-nav-fixed"
        style={{
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '12px 0 20px 0',
        }}
        aria-label="Glavna navigacija"
      >
        {NAV_ITEMS.map((item) => {
          const isCurrent = isActive(item)
          return (
            <Link
              key={item.key}
              href={item.key === 'dodaj' ? '/?tab=izbor' : item.href}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                color: isCurrent ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: isCurrent ? 700 : 400,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="page-content-spacer" />
    </>
  )
}

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  )
}