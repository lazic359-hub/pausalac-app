'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { isOnboardingComplete, clearProfileMemory } from '@/lib/profile'
import { clearPlanMemory } from '@/lib/plan'
import { hydrateUserProfile } from '@/lib/profile-hydrate'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

const supabase = getSupabaseBrowser()

const JAVNE_STAZE = new Set(['/', '/login', '/register', '/reset-password', '/pricing', '/auth/nova-lozinka'])

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    let cancelled = false
    const sync = async (uid: string | null) => {
      setUserId(uid)
      if (!uid) {
        clearProfileMemory()
        clearPlanMemory()
        setOnboardingDone(null)
        setReady(true)
        return
      }
      await hydrateUserProfile(supabase, uid)
      if (cancelled) return
      setOnboardingDone(isOnboardingComplete())
      setReady(true)
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      void sync(user?.id ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      void sync(session?.user?.id ?? null)
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!ready || !userId || onboardingDone === null) {
      setShowWizard(false)
      return
    }
    if (JAVNE_STAZE.has(pathname) || pathname === '/onboarding') {
      setShowWizard(false)
      return
    }
    setShowWizard(!onboardingDone)
  }, [ready, userId, pathname, onboardingDone])

  return (
    <>
      {children}
      {showWizard && userId ? (
        <OnboardingWizard
          userId={userId}
          onDone={() => {
            setOnboardingDone(true)
            setShowWizard(false)
          }}
        />
      ) : null}
    </>
  )
}
