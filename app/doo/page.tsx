'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomNav } from '@/components/BottomNav'
import { getUkupnoPrihodZaGodinu, readProfilFromStorage } from '@/lib/profile'
import {
  DOO_EXPENSE_RATIO,
  DOO_HIGH_REVENUE_THRESHOLD_RSD,
  DOO_MIN_CONTRIBUTIONS_MONTHLY_RSD,
  DOO_PROFIT_TAX_RATE,
  obracunajDooGodisnje,
  pausalacGodisnjeIzMesečnog,
  razlikaDooMinusPausal,
} from '@/lib/doo-calculator'
const supabase = getSupabaseBrowser()

type PrihodRow = { iznos_rsd: number | null; datum: string }

function formatRsd(n: number) {
  return new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 }).format(n)
}

function parseRevenueInput(s: string): number {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export default function DooCalculatorPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [prihodInput, setPrihodInput] = useState('')
  const prefillOnce = useRef(false)
  const [mesečnoPausal, setMesečnoPausal] = useState(0)

  const godina = new Date().getFullYear()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/doo')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return

    const load = async () => {
      setDataLoading(true)
      const { data: prof } = await supabase
        .from('profiles')
        .select('porez_na_prihod, pio_doprinos, zdravstveno, nezaposleni')
        .eq('id', user.id)
        .single()

      const y = String(godina)
      const { data: rows } = await supabase
        .from('prihodi')
        .select('iznos_rsd, datum')
        .eq('user_id', user.id)
        .gte('datum', `${y}-01-01`)
        .lte('datum', `${y}-12-31`)

      const ukupno = (rows as PrihodRow[] | null)?.reduce((s, r) => s + (r.iznos_rsd ?? 0), 0) ?? 0
      const prihodGodina = getUkupnoPrihodZaGodinu(ukupno, godina)

      let t = prof?.porez_na_prihod ?? 0
      let p = prof?.pio_doprinos ?? 0
      let h = prof?.zdravstveno ?? 0
      let u = prof?.nezaposleni ?? 0

      if (t + p + h + u === 0) {
        const ls = readProfilFromStorage()
        if (ls) {
          t = parseInt(String(ls.mesecniPorez ?? '0').replace(/\s/g, ''), 10) || 0
          p = parseInt(String(ls.mesecniPio ?? '0').replace(/\s/g, ''), 10) || 0
          h = parseInt(String(ls.mesecniZdravstvo ?? '0').replace(/\s/g, ''), 10) || 0
          u = parseInt(String(ls.mesecniNezaposlenost ?? '0').replace(/\s/g, ''), 10) || 0
        }
      }

      setMesečnoPausal(t + p + h + u)
      if (!prefillOnce.current) {
        setPrihodInput(prihodGodina > 0 ? String(prihodGodina) : '')
        prefillOnce.current = true
      }
      setDataLoading(false)
    }

    void load()
  }, [user, godina])

  const prihod = useMemo(() => parseRevenueInput(prihodInput), [prihodInput])
  const pausalGodisnje = pausalacGodisnjeIzMesečnog(mesečnoPausal)
  const doo = obracunajDooGodisnje(prihod)
  const razlika = razlikaDooMinusPausal(prihod, mesečnoPausal)
  const absRazlika = Math.abs(Math.round(razlika))

  const rezultatTekst =
    prihod <= 0
      ? 'Unesi godišnji prihod da vidiš uporedni prikaz.'
      : Math.abs(razlika) < 500
        ? `DOO bi te koštao približno koliko i paušal (razlika oko ${formatRsd(absRazlika)} RSD godišnje).`
        : razlika > 0
          ? `DOO bi te koštao ${formatRsd(absRazlika)} RSD više godišnje.`
          : `DOO bi te koštao ${formatRsd(absRazlika)} RSD manje godišnje.`

  const kartica: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  }

  if (authLoading || !user) {
    return (
      <div
        style={{
          background: 'var(--bg-primary)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {authLoading ? 'Učitavanje…' : 'Preusmeravam…'}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        minHeight: '100vh',
        color: 'var(--text-primary)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        className="app-header"
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Link
            href="/dashboard"
            style={{ color: 'var(--text-muted)', fontSize: 20, textDecoration: 'none', lineHeight: 1 }}
            aria-label="Nazad na pregled"
          >
            ←
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--accent)',
                letterSpacing: '-0.02em',
              }}
            >
              Da li je vreme za DOO?
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Pojednostavljen uporedni prikaz · {godina}. godina
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <div className="page-content" style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 120px 16px' }}>
        {dataLoading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Učitavanje prihoda i poreskog rešenja…</p>
        ) : (
          <>
            <div style={kartica}>
              <label htmlFor="doo-prihod" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
                GODIŠNJI PRIHOD (RSD)
              </label>
              <input
                id="doo-prihod"
                type="text"
                inputMode="numeric"
                value={prihodInput}
                onChange={e => setPrihodInput(e.target.value)}
                placeholder="npr. 3500000"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  color: 'var(--text-primary)',
                  fontSize: 16,
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <p style={{ margin: '10px 0 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Preuzeto iz evidencije prihoda za tekuću godinu (možeš ručno da izmeniš).
              </p>
            </div>

            <div style={kartica}>
              <p style={{ margin: '0 0 12px 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>PAUŠALAC (iz poreskog rešenja)</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Porez i doprinosi godišnje</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{formatRsd(pausalGodisnje)} RSD</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {mesečnoPausal > 0 ? (
                  <>{formatRsd(mesečnoPausal)} RSD mesečno × 12.</>
                ) : (
                  <>
                    Nema unetih iznosa — dopuni u{' '}
                    <Link href="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      podešavanjima
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>

            <div style={kartica}>
              <p style={{ margin: '0 0 12px 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>DOO (model)</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65 }}>
                <li>
                  Porez na dobit {Math.round(DOO_PROFIT_TAX_RATE * 100)}% na dobit: prihod − {Math.round(DOO_EXPENSE_RATIO * 100)}% rashoda (pretpostavka)
                </li>
                <li>
                  Minimalni doprinosi na platu: oko {formatRsd(DOO_MIN_CONTRIBUTIONS_MONTHLY_RSD)} RSD / mesec
                </li>
              </ul>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Porez na dobit (procena)</span>
                  <span style={{ fontWeight: 700 }}>{formatRsd(doo.porezNaDobit)} RSD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Minimalni doprinosi godišnje</span>
                  <span style={{ fontWeight: 700 }}>{formatRsd(doo.minimalniDoprinosiGodisnje)} RSD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>Ukupno DOO (procena)</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)' }}>{formatRsd(doo.ukupnoDoo)} RSD</span>
                </div>
              </div>
            </div>

            <div
              style={{
                ...kartica,
                borderColor: prihod > DOO_HIGH_REVENUE_THRESHOLD_RSD ? 'rgba(0, 255, 179, 0.35)' : 'var(--border)',
                background:
                  prihod > DOO_HIGH_REVENUE_THRESHOLD_RSD ? 'rgba(0, 255, 179, 0.06)' : 'var(--bg-card)',
              }}
            >
              <p style={{ margin: '0 0 10px 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>REZULTAT</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.45, color: 'var(--text-primary)' }}>{rezultatTekst}</p>
              {prihod > DOO_HIGH_REVENUE_THRESHOLD_RSD && (
                <p
                  style={{
                    margin: '14px 0 0 0',
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--accent)',
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.5,
                    color: 'var(--text-primary)',
                  }}
                >
                  Prihod prelazi 4.000.000 RSD — na ovom nivou često se razmatra prelazak na DOO ili druge oblike; obavezno proveri modele sa računovođom.
                </p>
              )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 20px 0' }}>
              Preporučujemo konsultaciju sa računovođom pre donošenja odluke. Brojevi su ilustrativni i ne uključuju PDV, naknade knjigovođe niti individualne stope i olakšice.
            </p>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
