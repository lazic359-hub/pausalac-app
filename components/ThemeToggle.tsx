'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        border: '1px solid #1f1f1f', background: '#111',
      }} />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Svetla tema' : 'Tamna tema'}
      style={{
        width: 36, height: 36,
        borderRadius: 8,
        border: `1px solid var(--border)`,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}