'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import {
  clearProfileMemory,
  isSessionOnboardingPersistedForUser,
  setOnboardingMemory,
} from '@/lib/profile'
import { clearPlanMemory } from '@/lib/plan'
import { hydrateUserProfile } from '@/lib/profile-hydrate'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

const supabase = getSupabaseBrowser()

const JAVNE_STAZE = new Set(['/', '/login', '/register', '/reset-password', '/pricing', '/auth/nova-lozinka'])

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const syncGenerationRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const sync = async (uid: string | null) => {
      const gen = ++syncGenerationRef.current
      setUserId(uid)
      if (!uid) {
        clearProfileMemory()
        clearPlanMemory()
        if (cancelled || gen !== syncGenerationRef.current) return
        setOnboardingDone(null)
        setReady(true)
        return
      }
      setOnboardingDone(null)
      let onboardingCompleted = await hydrateUserProfile(supabase, uid)
      if (!onboardingCompleted && isSessionOnboardingPersistedForUser(uid)) {
        onboardingCompleted = true
        setOnboardingMemory(true)
      }
      if (cancelled || gen !== syncGenerationRef.current) return
      console.log('[OnboardingGate] profiles.onboarding_completed → showWizard will be', !onboardingCompleted, {
        userId: uid,
        onboardingCompleted,
        syncGen: gen,
      })
      setOnboardingDone(onboardingCompleted)
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
          onDone={() => {
            setOnboardingDone(true)
            setShowWizard(false)
            router.replace('/dashboard')
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
