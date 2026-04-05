'use client'

import { Suspense, lazy } from 'react'

const RegisterContent = lazy(() => import('./RegisterContent'))

export default function RegisterRoute() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  )
}
