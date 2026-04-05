'use client'

import { Suspense } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { AuthSessionExpiry } from '@/components/AuthSessionExpiry'
import { OnboardingGate } from '@/components/OnboardingGate'
import { OfflineBanner } from '@/components/OfflineBanner'
import { PushPermissionAfterLogin } from '@/components/PushPermissionAfterLogin'
import { PushNotificationsSetup } from '@/components/PushNotificationsSetup'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
    >
      <Suspense fallback={null}>
        <AuthSessionExpiry />
        <OfflineBanner />
        <PushPermissionAfterLogin />
        <PushNotificationsSetup />
        <OnboardingGate>{children}</OnboardingGate>
      </Suspense>
    </NextThemesProvider>
  )
}