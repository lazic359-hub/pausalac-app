'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

/** Fiksiran u donjem desnom uglu, iznad bottom navigacije. */
export function FloatingAddPrihod() {
  return (
    <Link
      href="/dashboard?tab=dodaj"
      className="fab-add-prihod"
      aria-label="Dodaj prihod"
    >
      <span className="fab-add-prihod-ico" aria-hidden>
        <Plus size={18} strokeWidth={2.25} />
      </span>
      <span className="fab-add-prihod-label">Dodaj prihod</span>
    </Link>
  )
}
