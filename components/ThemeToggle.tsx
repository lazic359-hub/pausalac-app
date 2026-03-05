'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900" />
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Svetla tema' : 'Tamna tema'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      <span className="text-lg dark:hidden" aria-hidden="true">
        🌙
      </span>
      <span className="hidden text-lg dark:inline" aria-hidden="true">
        ☀️
      </span>
      <span className="sr-only">{isDark ? 'Prebaci na svetlu temu' : 'Prebaci na tamnu temu'}</span>
    </button>
  )
}