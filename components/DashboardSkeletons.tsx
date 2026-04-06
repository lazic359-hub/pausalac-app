'use client'

/** Skeleton blocks for dashboard summary + obligations while Supabase data loads */
export function DashboardMainSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ position: 'relative' }}>
      <span className="pausalac-sr-only">Učitavanje pregleda…</span>

      <section style={{ marginBottom: 14 }}>
        <div className="dashboard-skeleton-line" style={{ width: 72, height: 10, marginBottom: 8 }} />
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="dashboard-skeleton-line" style={{ width: '55%', height: 12, marginBottom: 10 }} />
          <div className="dashboard-skeleton-line" style={{ width: '72%', height: 36, marginBottom: 10 }} />
          <div className="dashboard-skeleton-line" style={{ width: '40%', height: 12, marginBottom: 16 }} />
          <div className="dashboard-skeleton-line" style={{ width: '88%', height: 12, marginBottom: 8 }} />
          <div className="dashboard-skeleton-line" style={{ width: '100%', height: 6, borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div className="dashboard-skeleton-line" style={{ width: '28%', height: 10 }} />
            <div className="dashboard-skeleton-line" style={{ width: '32%', height: 10 }} />
            <div className="dashboard-skeleton-line" style={{ width: '24%', height: 10 }} />
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 14 }}>
        <div className="dashboard-skeleton-line" style={{ width: 168, height: 10, marginBottom: 8 }} />
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
            <div className="dashboard-skeleton-line" style={{ width: '45%', height: 14 }} />
            <div className="dashboard-skeleton-line" style={{ width: 48, height: 20, borderRadius: 20 }} />
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: i < 2 ? 10 : 0,
              }}
            >
              <div className="dashboard-skeleton-line" style={{ width: '36%', height: 10, marginBottom: 8 }} />
              <div className="dashboard-skeleton-line" style={{ width: '78%', height: 14, marginBottom: 6 }} />
              <div className="dashboard-skeleton-line" style={{ width: '92%', height: 10 }} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 4 }}>
        <div className="dashboard-skeleton-line" style={{ width: '100%', height: 44, borderRadius: 12, marginBottom: 10 }} />
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 18px 18px',
          }}
        >
          <div className="dashboard-skeleton-line" style={{ width: '38%', height: 11, marginBottom: 6 }} />
          <div className="dashboard-skeleton-line" style={{ width: '52%', height: 22, marginBottom: 14 }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 120 }}>
            {[48, 72, 56, 88, 64, 76, 52, 68].map((h, i) => (
              <div
                key={i}
                className="dashboard-skeleton-line"
                style={{ flex: 1, height: h, minHeight: 40, borderRadius: 6, maxWidth: 40 }}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

/** Placeholder while the Analitika chunk (Recharts) loads */
export function AnalyticsPanelSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        marginTop: 0,
      }}
    >
      <span className="pausalac-sr-only">Učitavanje analitike…</span>
      <div className="dashboard-skeleton-line" style={{ width: '42%', height: 12, marginBottom: 14 }} />
      <div className="dashboard-skeleton-line" style={{ width: '55%', height: 28, marginBottom: 10 }} />
      <div className="dashboard-skeleton-line" style={{ width: '100%', height: 8, borderRadius: 8, marginBottom: 14 }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 132 }}>
        {[52, 78, 64, 92, 70, 84, 58, 72].map((h, i) => (
          <div
            key={i}
            className="dashboard-skeleton-line"
            style={{ flex: 1, height: h, minHeight: 36, borderRadius: 6, maxWidth: 44 }}
          />
        ))}
      </div>
    </div>
  )
}
