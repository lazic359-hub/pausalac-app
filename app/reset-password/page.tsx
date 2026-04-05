'use client'

import { Suspense, lazy } from 'react'

const ResetPasswordRequestContent = lazy(() => import('./ResetPasswordRequestContent'))

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordRequestContent />
    </Suspense>
  )
}
