'use client'

import { KPO_TABLE_GRID_COLS } from '@/lib/kpo-table-grid'

export function FaktureListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="pausalac-sr-only">Učitavanje faktura…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dashboard-skeleton-line" style={{ width: '42%', height: 12, marginBottom: 8 }} />
              <div className="dashboard-skeleton-line" style={{ width: '68%', height: 14 }} />
            </div>
            <div className="dashboard-skeleton-line" style={{ width: 88, height: 20, flexShrink: 0, borderRadius: 8 }} />
          </div>
          <div className="dashboard-skeleton-line" style={{ width: 120, height: 10 }} />
        </div>
      ))}
    </div>
  )
}

export function PrihodiListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="table-scroll-wrap" style={{ marginLeft: 0, marginRight: 0 }}>
      <div className="table-min-width" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', minWidth: 360 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 120px 40px', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
          <div className="dashboard-skeleton-line" style={{ width: 52, height: 10 }} />
          <div className="dashboard-skeleton-line" style={{ width: '48%', height: 10 }} />
          <div className="dashboard-skeleton-line" style={{ width: 56, height: 10, justifySelf: 'end' }} />
          <div className="dashboard-skeleton-line" style={{ width: 18, height: 10, justifySelf: 'center' }} />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 120px 40px',
              gap: 8,
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <div className="dashboard-skeleton-line" style={{ width: 72, height: 12 }} />
            <div className="dashboard-skeleton-line" style={{ width: '88%', height: 14 }} />
            <div className="dashboard-skeleton-line" style={{ width: '92%', height: 14, justifySelf: 'end' }} />
            <div className="dashboard-skeleton-line" style={{ width: 22, height: 22, borderRadius: 6, justifySelf: 'center' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function KpoTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="table-scroll-wrap kpo-scroll-sticky" style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}>
      <span className="pausalac-sr-only">Učitavanje tabele KPO…</span>
      <div className="table-min-width kpo-table kpo-table-shell">
        <div className="kpo-table-head" style={{ gridTemplateColumns: KPO_TABLE_GRID_COLS }}>
          {Array.from({ length: 7 }, (_, i) => (
            <p key={i} style={{ margin: 0 }}>
              <span className="dashboard-skeleton-line" style={{ display: 'block', width: i === 2 ? '72%' : '58%', height: 10 }} />
            </p>
          ))}
        </div>
        {Array.from({ length: rows }, (_, ri) => (
          <div
            key={ri}
            className={`kpo-table-row${ri % 2 === 1 ? ' kpo-table-row--stripe' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: KPO_TABLE_GRID_COLS,
              gap: 8,
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <p style={{ margin: 0 }}><span className="dashboard-skeleton-line" style={{ display: 'inline-block', width: 22, height: 12 }} /></p>
            <p style={{ margin: 0 }}><span className="dashboard-skeleton-line" style={{ display: 'inline-block', width: 68, height: 12 }} /></p>
            <p style={{ margin: 0 }}><span className="dashboard-skeleton-line" style={{ display: 'inline-block', width: '92%', height: 12 }} /></p>
            <p style={{ margin: 0 }}><span className="dashboard-skeleton-line" style={{ display: 'inline-block', width: 72, height: 12 }} /></p>
            <p style={{ margin: 0, textAlign: 'right' }}><span className="dashboard-skeleton-line" style={{ display: 'inline-block', width: 52, height: 12 }} /></p>
            <p style={{ margin: 0, textAlign: 'right' }}><span className="dashboard-skeleton-line" style={{ display: 'inline-block', width: 64, height: 13 }} /></p>
            <p style={{ margin: 0, textAlign: 'right' }}><span className="dashboard-skeleton-line" style={{ display: 'inline-block', width: 56, height: 22, borderRadius: 8 }} /></p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Kartice u tabu (npr. podešavanja liste) dok se podaci učitavaju */
export function DashboardTabListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" style={{ padding: '8px 0 24px' }}>
      <span className="pausalac-sr-only">Učitavanje…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '16px 18px',
            marginBottom: i < rows - 1 ? 10 : 0,
          }}
        >
          <div className="dashboard-skeleton-line" style={{ width: '36%', height: 11, marginBottom: 10 }} />
          <div className="dashboard-skeleton-line" style={{ width: '92%', height: 14, marginBottom: 8 }} />
          <div className="dashboard-skeleton-line" style={{ width: '55%', height: 12 }} />
        </div>
      ))}
    </div>
  )
}
