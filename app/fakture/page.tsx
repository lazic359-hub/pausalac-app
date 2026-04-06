'use client'
import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomNav } from '@/components/BottomNav'
import { useRouter } from 'next/navigation'
import { FakturaDetailsModal } from '@/components/FakturaDetailsModal'
import {
  effectiveInvoiceStatus,
  FAKTURA_STATUS_BADGE_STYLES,
  FAKTURA_STATUS_LABELS,
  isInvoicePaid,
  normalizeInvoiceStatus,
  type FakturaStatusDisplay,
  type FakturaStatusStored,
} from '@/lib/faktura-status'
import { buildPrihodRowForPaidFaktura } from '@/lib/kpo-prihod'
import { readProfilFromStorage } from '@/lib/profile'
import { formatOfflineTimestamp, loadOfflineFaktureList, saveOfflineFaktureList } from '@/lib/offline-data-cache'
import { FaktureListSkeleton } from '@/components/PageSkeletons'

const supabase = getSupabaseBrowser()

type FakturaRow = {
  id: string
  user_id: string
  klijent: string | null
  iznos: number | null
  valuta: string | null
  iznos_rsd: number | null
  datum: string
  napomena: string | null
  broj_fakture: string | null
  rok_placanja?: string | null
  status?: string | null
  /** Snimak klijenta (adresa) za KPO pri naplati */
  payload?: unknown
}

const PreuzmiPDFDugme = dynamic(() => import('@/components/PreuzmiPDFDugme'), { ssr: false })

function formatIznos(n: number) {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function formatDatum(d: string) {
  const parts = d.split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}.${parts[1]}.${parts[0]}.`
}

function NovaFakturaLink({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/faktura"
      className="fakture-cta-nova"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: 'var(--accent)',
        color: '#000',
        fontWeight: 700,
        fontSize: compact ? 13 : 15,
        padding: compact ? '10px 16px' : '14px 20px',
        borderRadius: 12,
        textDecoration: 'none',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 0 20px #00C89640',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'transform 0.15s ease, box-shadow 0.2s ease',
      }}
    >
      <span aria-hidden style={{ fontSize: compact ? 16 : 18, lineHeight: 1 }}>＋</span>
      Nova faktura
    </Link>
  )
}

export default function FakturePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [fakture, setFakture] = useState<FakturaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGodina, setSelectedGodina] = useState<number>(new Date().getFullYear())
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [detailFaktura, setDetailFaktura] = useState<FakturaRow | null>(null)
  const [detailDisplayBroj, setDetailDisplayBroj] = useState('')
  const [listaAsOf, setListaAsOf] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u ?? null)
      setAuthLoading(false)
      if (u) ucitajFakture(u.id)
    }
    init()
  }, [])

  const ucitajFakture = async (userId: string) => {
    setLoading(true)
    if (typeof window !== 'undefined' && !navigator.onLine) {
      const snap = loadOfflineFaktureList(userId)
      if (snap?.data.rows?.length) {
        setFakture(snap.data.rows as FakturaRow[])
        setListaAsOf(snap.updatedAt)
      } else {
        setFakture([])
        setListaAsOf(null)
      }
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('fakture')
      .select('*')
      .eq('user_id', userId)
      .order('datum', { ascending: false })
    if (!error && data) {
      const rows = (data as FakturaRow[]) || []
      setFakture(rows)
      saveOfflineFaktureList(userId, rows)
      setListaAsOf(new Date().toISOString())
    } else {
      const snap = loadOfflineFaktureList(userId)
      if (snap?.data.rows?.length) {
        setFakture(snap.data.rows as FakturaRow[])
        setListaAsOf(snap.updatedAt)
      }
    }
    setLoading(false)
  }

  const filtriranePoGodini = fakture.filter(f =>
    new Date(f.datum).getFullYear() === selectedGodina
  )

  const q = searchQuery.trim().toLowerCase()
  const filtriranePoPretrazi = q
    ? filtriranePoGodini.filter(f => {
        const klijent = (f.klijent ?? '').toLowerCase()
        const broj = (f.broj_fakture ?? '').toLowerCase()
        const godina = selectedGodina.toString()
        const autoBroj = broj ? '' : `${godina}-${String(filtriranePoGodini.indexOf(f) + 1).padStart(3, '0')}`.toLowerCase()
        return klijent.includes(q) || broj.includes(q) || autoBroj.includes(q)
      })
    : filtriranePoGodini

  const ukupnoRSD = filtriranePoGodini.reduce(
    (sum, f) => sum + (isInvoicePaid(f.status) ? (f.iznos_rsd ?? 0) : 0),
    0,
  )

  const promeniStatus = async (f: FakturaRow) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setToast('Nema veze — status se ne može menjati offline.')
      setTimeout(() => setToast(null), 3500)
      return
    }
    const stored = normalizeInvoiceStatus(f.status)
    const sledeci: FakturaStatusStored = stored === 'paid' ? 'issued' : 'paid'
    setFakture(prev => prev.map(x => x.id === f.id ? { ...x, status: sledeci } : x))
    await supabase.from('fakture').update({ status: sledeci }).eq('id', f.id)

    if (sledeci === 'paid' && user) {
      const datumNaplate = new Date().toISOString().split('T')[0]
      const { data: postojeca } = await supabase
        .from('prihodi')
        .select('id')
        .eq('user_id', user.id)
        .like('napomena', `%[faktura_id:${f.id}]%`)
        .limit(1)
      if (!postojeca?.length) {
        const row = await buildPrihodRowForPaidFaktura(
          {
            id: f.id,
            klijent: f.klijent,
            iznos: f.iznos,
            valuta: f.valuta,
            broj_fakture: f.broj_fakture,
            napomena: f.napomena,
            payload: f.payload,
            iznos_rsd: f.iznos_rsd,
            datum_fakture: f.datum,
          },
          datumNaplate,
        )
        await supabase.from('prihodi').insert({
          user_id: user.id,
          ...row,
          datum: datumNaplate,
        })
      }
      setToast(
        'Faktura označena kao plaćena — prihod i KPO ažurirani (datum naplate = danas; EUR/USD: RSD ekvivalent po kursu NBS sa fakture).',
      )
      setTimeout(() => setToast(null), 4000)
    }

    if (sledeci === 'issued' && stored === 'paid' && user) {
      const { data: vezani } = await supabase
        .from('prihodi')
        .select('id')
        .eq('user_id', user.id)
        .like('napomena', `%[faktura_id:${f.id}]%`)
      if (vezani?.length) {
        await supabase.from('prihodi').delete().in(
          'id',
          vezani.map(r => r.id),
        )
      } else {
        const iznosRsd = f.iznos_rsd ?? 0
        await supabase
          .from('prihodi')
          .delete()
          .eq('user_id', user.id)
          .eq('klijent', f.klijent ?? '')
          .eq('datum', f.datum)
          .gte('iznos_rsd', iznosRsd - 1)
          .lte('iznos_rsd', iznosRsd + 1)
      }
    }
    if (user) {
      setFakture(prev => {
        saveOfflineFaktureList(user.id, prev)
        return prev
      })
      setListaAsOf(new Date().toISOString())
    }
  }

  const openDetails = (f: FakturaRow, displayBroj: string) => {
    setDetailFaktura(f)
    setDetailDisplayBroj(displayBroj)
  }

  const godinaOptions = [new Date().getFullYear(), ...Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i - 1)]

  if (authLoading) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32 }}>🧾</span>
      </div>
    )
  }

  if (!user) {
    router.replace('/login?next=/fakture')
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Preusmeravam na prijavu…</span>
      </div>
    )
  }

  const detailStatus: FakturaStatusDisplay = detailFaktura ? effectiveInvoiceStatus(detailFaktura) : 'issued'

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 24px',
          borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      <FakturaDetailsModal
        open={detailFaktura !== null}
        displayBroj={detailDisplayBroj}
        klijent={detailFaktura?.klijent?.trim() ? detailFaktura.klijent.trim() : '—'}
        datum={detailFaktura?.datum ?? ''}
        iznosOriginal={detailFaktura?.iznos ?? null}
        iznosRsd={detailFaktura?.iznos_rsd ?? 0}
        valuta={detailFaktura?.valuta ?? null}
        status={detailStatus}
        napomena={detailFaktura?.napomena ?? null}
        payload={detailFaktura?.payload}
        onClose={() => { setDetailFaktura(null); setDetailDisplayBroj('') }}
      />

      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', textDecoration: 'none' }}>←</Link>
          <span style={{ fontSize: 18 }}>🧾</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>Fakture</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
        </div>
      </div>

      <div className="page-content dashboard-main-column" style={{ padding: '20px 16px 100px 16px' }}>
        {listaAsOf && (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0', fontWeight: 600 }}>
            Poslednje ažuriranje liste: {formatOfflineTimestamp(listaAsOf)}
          </p>
        )}

        {loading ? (
          <FaktureListSkeleton rows={4} />
        ) : fakture.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '40px 28px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, lineHeight: 1.2, marginBottom: 16 }} aria-hidden>🧾</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
              Još nemaš faktura
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.5, margin: '0 0 24px 0', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
              Kreiraj prvu fakturu za klijenta — biće ovde u listi i moći ćeš da je označiš kao plaćenu ili da preuzmeš PDF.
            </p>
            <NovaFakturaLink />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Godina:</span>
              {godinaOptions.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGodina(g)}
                  style={{
                    background: selectedGodina === g ? 'var(--accent)' : 'var(--bg-card)',
                    color: selectedGodina === g ? '#000' : 'var(--text-muted)',
                    fontWeight: selectedGodina === g ? 700 : 400,
                    fontSize: 13,
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: `1px solid ${selectedGodina === g ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>

            {filtriranePoGodini.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 8px 0', fontSize: 15 }}>
                  Nema faktura za {selectedGodina}.
                </p>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 20px 0', fontSize: 13 }}>
                  Izaberi drugu godinu iznad ili dodaj novu fakturu za ovu godinu.
                </p>
                <NovaFakturaLink />
              </div>
            ) : (
              <>
                <div
                  className="fakture-sticky-toolbar"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 5,
                    background: 'var(--bg-primary)',
                    paddingBottom: 12,
                    marginBottom: 4,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'stretch',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                    }}
                  >
                    <input
                      type="search"
                      placeholder="Pretraga po klijentu ili broju fakture..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '10px 14px',
                        fontSize: 14,
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                    <NovaFakturaLink compact />
                  </div>
                </div>

                <div className="fakture-mobile-only" style={{ marginBottom: 20 }}>
                  {filtriranePoPretrazi.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                      Nema rezultata za pretragu.
                    </div>
                  ) : (
                    filtriranePoPretrazi.map(f => {
                      const klijent = f.klijent?.trim() ? f.klijent : '—'
                      const iznosRSD = f.iznos_rsd ?? 0
                      const indexUGodini = filtriranePoGodini.findIndex(x => x.id === f.id)
                      const displayBroj = f.broj_fakture?.trim()
                        ? f.broj_fakture
                        : `${selectedGodina}-${String(indexUGodini + 1).padStart(3, '0')}`
                      const imaPodatkeZaPDF = !!f.klijent?.trim()
                      const displayStatus = effectiveInvoiceStatus(f)
                      const st = FAKTURA_STATUS_BADGE_STYLES[displayStatus]
                      const overdue = displayStatus === 'overdue'
                      return (
                        <div
                          key={f.id}
                          className={`fakture-mobile-card${overdue ? ' fakture-mobile-card--overdue' : ''}`}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => openDetails(f, displayBroj)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                openDetails(f, displayBroj)
                              }
                            }}
                            style={{
                              padding: '14px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{displayBroj}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.35 }}>{klijent}</div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{formatIznos(iznosRSD)} RSD</div>
                                {f.valuta && f.valuta !== 'RSD' && f.iznos != null && (
                                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{formatIznos(f.iznos)} {f.valuta}</div>
                                )}
                              </div>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>{formatDatum(f.datum)}</div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '12px 16px' }}>
                            <button
                              type="button"
                              title={normalizeInvoiceStatus(f.status) === 'paid' ? 'Klikni da vratiš na izdatu (uklanja prihod iz evidencije)' : 'Klikni da označiš kao plaćenu (dodaje prihod)'}
                              onClick={() => promeniStatus(f)}
                              style={{
                                background: st.bg,
                                color: st.color,
                                border: st.border,
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {FAKTURA_STATUS_LABELS[displayStatus]}
                            </button>
                            {imaPodatkeZaPDF ? (
                              <PdfCel f={f} displayBroj={displayBroj} />
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="table-scroll-wrap fakture-desktop-only" style={{ marginBottom: 20 }}>
                  <table className="table-min-width" style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Broj fakture</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Klijent</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Datum</th>
                        <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Iznos</th>
                        <th style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                        <th style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtriranePoPretrazi.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Nema rezultata za pretragu.</td></tr>
                      ) : (
                        filtriranePoPretrazi.map(f => {
                          const klijent = f.klijent?.trim() ? f.klijent : '—'
                          const iznosRSD = f.iznos_rsd ?? 0
                          const indexUGodini = filtriranePoGodini.findIndex(x => x.id === f.id)
                          const displayBroj = f.broj_fakture?.trim()
                            ? f.broj_fakture
                            : `${selectedGodina}-${String(indexUGodini + 1).padStart(3, '0')}`
                          const imaPodatkeZaPDF = !!f.klijent?.trim()
                          const displayStatus = effectiveInvoiceStatus(f)
                          const st = FAKTURA_STATUS_BADGE_STYLES[displayStatus]
                          return (
                            <tr
                              key={f.id}
                              className="fakture-row-clickable"
                              onClick={() => openDetails(f, displayBroj)}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                                boxShadow: displayStatus === 'overdue' ? 'inset 3px 0 0 #f44336' : undefined,
                                background: displayStatus === 'overdue' ? 'rgba(244, 67, 54, 0.06)' : undefined,
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = displayStatus === 'overdue' ? 'rgba(244, 67, 54, 0.1)' : 'var(--bg-card-hover)'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = displayStatus === 'overdue' ? 'rgba(244, 67, 54, 0.06)' : 'transparent'
                              }}
                            >
                              <td style={{ padding: '12px 8px', fontWeight: 600 }}>{displayBroj}</td>
                              <td style={{ padding: '12px 8px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={klijent}>{klijent}</td>
                              <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{formatDatum(f.datum)}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>
                                <div style={{ fontVariantNumeric: 'tabular-nums' }}>{formatIznos(iznosRSD)} RSD</div>
                                {f.valuta && f.valuta !== 'RSD' && f.iznos != null && (
                                  <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500, marginTop: 2 }}>
                                    {formatIznos(f.iznos)} {f.valuta}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  title={normalizeInvoiceStatus(f.status) === 'paid' ? 'Klikni da vratiš na izdatu (uklanja prihod iz evidencije)' : 'Klikni da označiš kao plaćenu (dodaje prihod)'}
                                  onClick={() => promeniStatus(f)}
                                  style={{
                                    background: st.bg,
                                    color: st.color,
                                    border: st.border,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {FAKTURA_STATUS_LABELS[displayStatus]}
                                </button>
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                {imaPodatkeZaPDF ? (
                                  <PdfCel f={f} displayBroj={displayBroj} />
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Plaćeni promet ({selectedGodina}.):</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 22 }}>{formatIznos(ukupnoRSD)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>RSD</span></span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.4 }}>U prihod i KPO ulaze samo fakture sa statusom „Plaćena“.</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

const PDF_CEL_STYLE: CSSProperties = { padding: '8px 12px', fontSize: 13 }

function PdfCel({ f, displayBroj }: { f: FakturaRow; displayBroj: string }) {
  const klijentNaziv = f.klijent?.trim() || ''
  const [profilVer, setProfilVer] = useState(0)
  useEffect(() => {
    const h = () => setProfilVer((v) => v + 1)
    window.addEventListener('pausalac-profil-updated', h)
    return () => window.removeEventListener('pausalac-profil-updated', h)
  }, [])
  const profil = useMemo(() => {
    const p = readProfilFromStorage()
    return p && Object.keys(p).length > 0
      ? p
      : { nazivFirme: '', pib: '', maticniBroj: '', brojRacuna: '' }
  }, [profilVer])
  const izdavalacPdf = useMemo(() => {
    const p = profil as Record<string, unknown>
    return {
      nazivFirme: String(p.nazivFirme ?? ''),
      pib: String(p.pib ?? ''),
      maticniBroj: String(p.maticniBroj ?? ''),
      brojRacuna: String(p.brojRacuna ?? ''),
    }
  }, [profil])
  const valuta = ((f.valuta as 'RSD' | 'EUR' | 'USD') || 'RSD') as 'RSD' | 'EUR' | 'USD'
  const { stavke, kursNum, datumValute, klijentAdresa } = useMemo(() => {
    const p = f.payload && typeof f.payload === 'object' ? (f.payload as Record<string, unknown>) : null
    const rawStavke = p?.stavke
    let stavkeOut: { opis: string; iznos: string }[]
    if (Array.isArray(rawStavke) && rawStavke.length) {
      stavkeOut = rawStavke.map((row: unknown) => {
        const s = row as Record<string, unknown>
        return { opis: String(s.opis ?? ''), iznos: String(s.iznos ?? '') }
      })
    } else {
      stavkeOut = [{ opis: 'Ukupno', iznos: String(f.iznos ?? 0) }]
    }
    let k = 1
    if (valuta !== 'RSD' && p?.kurs != null && !Number.isNaN(Number(p.kurs))) k = Number(p.kurs)
    const rok = typeof p?.rok_placanja === 'string' ? p.rok_placanja : ''
    return {
      stavke: stavkeOut,
      kursNum: k,
      datumValute: rok || f.datum,
      klijentAdresa: typeof p?.klijent_adresa === 'string' ? p.klijent_adresa : '',
    }
  }, [f.payload, f.iznos, f.datum, valuta])

  if (!klijentNaziv) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>

  return (
    <PreuzmiPDFDugme
      brojFakture={displayBroj}
      datum={f.datum}
      datumValute={datumValute}
      izdavalac={izdavalacPdf}
      klijent={{ naziv: klijentNaziv, adresa: klijentAdresa }}
      stavke={stavke}
      valuta={valuta}
      kurs={kursNum}
      legalNotes={f.napomena ?? undefined}
      style={PDF_CEL_STYLE}
      label="PDF"
      variant="compact"
    />
  )
}
