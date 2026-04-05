'use client'
import { Suspense, lazy } from 'react'

const LoginContent = lazy(() => import('./LoginContent'))

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

