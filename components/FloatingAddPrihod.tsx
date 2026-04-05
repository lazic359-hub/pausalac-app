'use client'

import Link from 'next/link'

/** Fiksiran u donjem desnom uglu, iznad bottom navigacije. */
export function FloatingAddPrihod() {
  return (
    <Link
      href="/dashboard?tab=dodaj"
      className="fab-add-prihod"
      aria-label="Dodaj prihod"
    >
      <span className="fab-add-prihod-ico" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fab-add-prihod-label">Dodaj prihod</span>
    </Link>
  )
}
