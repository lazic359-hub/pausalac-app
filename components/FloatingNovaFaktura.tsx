'use client'

import Link from 'next/link'

/** FAB iznad bottom nav-a na listi faktura — umesto „Dodaj prihod“. */
export function FloatingNovaFaktura() {
  return (
    <Link
      href="/faktura"
      className="fab-add-prihod"
      aria-label="Nova faktura"
    >
      <span className="fab-add-prihod-ico" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9 12h6M9 16h6M9 8h3M7 3h6l4 4v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="fab-add-prihod-label">Nova faktura</span>
    </Link>
  )
}
