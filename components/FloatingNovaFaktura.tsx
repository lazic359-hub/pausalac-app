'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'

/** FAB iznad bottom nav-a na listi faktura — umesto „Dodaj prihod“. */
export function FloatingNovaFaktura() {
  return (
    <Link
      href="/faktura"
      className="fab-add-prihod"
      aria-label="Nova faktura"
    >
      <span className="fab-add-prihod-ico" aria-hidden>
        <FileText size={18} strokeWidth={2} />
      </span>
      <span className="fab-add-prihod-label">Nova faktura</span>
    </Link>
  )
}
