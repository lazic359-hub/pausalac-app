'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

const supabase = getSupabaseBrowser()

export default function OnboardingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  if (!userId) return null

  return (
    <OnboardingWizard
      userId={userId}
      onDone={() => {
        router.replace('/dashboard')
      }}
    />
  )
}
