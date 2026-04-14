'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  BarChart3,
  BookMarked,
  Building2,
  ClipboardList,
  Receipt,
  UserRound,
} from 'lucide-react'
import { FloatingAddPrihod } from '@/components/FloatingAddPrihod'
import { FloatingNovaFaktura } from '@/components/FloatingNovaFaktura'
import { NavDodajFabPlus } from '@/components/NavDodajFabPlus'
import { InstallAppBanner } from '@/components/InstallAppBanner'
import { bottomNavIdleColor } from '@/lib/bottom-nav-colors'

const NAV_ITEMS = [
  { key: 'dashboard', Icon: BarChart3, label: 'Pregled', href: '/dashboard' },
  { key: 'prihodi', Icon: ClipboardList, label: 'Prihodi', href: '/prihodi' },
  { key: 'dodaj', label: 'Dodaj', href: '/dashboard' },
  { key: 'faktura', Icon: Receipt, label: 'Faktura', href: '/fakture' },
  { key: 'kpo', Icon: BookMarked, label: 'KPO', href: '/kpo' },
  { key: 'doo', Icon: Building2, label: 'DOO', href: '/doo' },
  { key: 'settings', Icon: UserRound, label: 'Profil', href: '/profil' },
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
          const Icon = 'Icon' in item ? item.Icon : null
          return (
            <Link
              key={item.key}
              href={item.href}
              className="bottom-nav-item"
              style={{
                color: isCurrent ? 'var(--accent)' : bottomNavIdleColor(item.key),
                fontWeight: isCurrent ? 700 : 400,
              }}
            >
              <span className="bottom-nav-item-icon" aria-hidden>
                {Icon ? <Icon size={22} strokeWidth={2} /> : null}
              </span>
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