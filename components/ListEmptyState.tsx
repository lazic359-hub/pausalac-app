'use client'

import type { ReactNode } from 'react'

type ListEmptyStateProps = {
  icon: string
  headline: string
  subtext: string
  children: ReactNode
}

export function ListEmptyState({ icon, headline, subtext, children }: ListEmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: 'min(520px, calc(100vh - 260px))',
        padding: '32px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }} aria-hidden>
        {icon}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px 0', color: '#fff' }}>
        {headline}
      </h2>
      <p
        style={{
          color: '#888',
          fontSize: 15,
          lineHeight: 1.5,
          margin: '0 0 24px 0',
          maxWidth: 360,
          whiteSpace: 'pre-line',
        }}
      >
        {subtext}
      </p>
      {children}
    </div>
  )
}
