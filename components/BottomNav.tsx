'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { FloatingAddPrihod } from '@/components/FloatingAddPrihod'
import { FloatingNovaFaktura } from '@/components/FloatingNovaFaktura'
import { NavDodajFabPlus } from '@/components/NavDodajFabPlus'
import { InstallAppBanner } from '@/components/InstallAppBanner'

const NAV_ITEMS = [
  { key: 'dashboard', icon: '📊', label: 'Pregled', href: '/dashboard' },
  { key: 'prihodi', icon: '📋', label: 'Prihodi', href: '/prihodi' },
  { key: 'dodaj', label: 'Dodaj', href: '/dashboard' },
  { key: 'faktura', icon: '🧾', label: 'Faktura', href: '/fakture' },
  { key: 'kpo', icon: '📒', label: 'KPO', href: '/kpo' },
  { key: 'doo', icon: '🏢', label: 'DOO', href: '/doo' },
  { key: 'settings', icon: '⚙️', label: 'Profil', href: '/profil' },
] as const

function BottomNavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  const isActive = (item: { key: string; href: string }) => {
    if (item.key === 'dashboard') return pathname === '/dashboard' && tab !== 'dodaj'
    if (item.key === 'dodaj') return pathname === '/dashboard' && tab === 'dodaj'
    if (item.key === 'settings') return pathname === '/profil' || pathname.startsWith('/profil/')
    return pathname.startsWith(item.href)
  }

  return (
    <>
      <InstallAppBanner />
      <nav
        className="bottom-nav-fixed"
        style={{
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border)',
        }}
        aria-label="Glavna navigacija"
      >
        {NAV_ITEMS.map((item) => {
          const isCurrent = isActive(item)
          if (item.key === 'dodaj') {
            return (
              <Link
                key={item.key}
                href="/dashboard?tab=dodaj"
                className={`bottom-nav-dodaj${isCurrent ? ' bottom-nav-dodaj--active' : ''}`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <span className="bottom-nav-dodaj-lift" aria-hidden>
                  <span className="bottom-nav-dodaj-fab">
                    <NavDodajFabPlus />
                  </span>
                </span>
                <span className="bottom-nav-dodaj-label">{item.label}</span>
              </Link>
            )
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              className="bottom-nav-item"
              style={{
                color: isCurrent ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: isCurrent ? 700 : 400,
              }}
            >
              <span className="bottom-nav-item-icon" aria-hidden>{item.icon}</span>
              <span className="bottom-nav-item-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      {pathname === '/fakture' ? (
        <FloatingNovaFaktura />
      ) : pathname !== '/prihodi' && pathname !== '/kpo' && pathname !== '/doo' && pathname !== '/profil' && pathname !== '/settings' ? (
        <FloatingAddPrihod />
      ) : null}
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