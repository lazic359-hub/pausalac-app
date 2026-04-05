'use client'

import { useState, useMemo } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import {
  readProfilFromStorage,
  setOnboardingMemory,
  setProfileMemory,
  DEFAULT_GODISNJI_LIMIT_RSD,
} from '@/lib/profile'

const supabase = getSupabaseBrowser()

function notifyProfilUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('pausalac-profil-updated'))
}

type Step = 1 | 2 | 3

function inpStyle(focused: boolean): React.CSSProperties {
  return {
    width: '100%',
    background: 'var(--bg-primary)',
    border: `1px solid ${focused ? '#00C89660' : 'var(--border)'}`,
    borderRadius: 10,
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    boxShadow: focused ? '0 0 0 3px #00C89615' : 'none',
  }
}

export function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [focused, setFocused] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [datumRegistracije, setDatumRegistracije] = useState('')
  const [mesecniPorez, setMesecniPorez] = useState('')
  const [mesecniPio, setMesecniPio] = useState('')
  const [mesecniZdravstvo, setMesecniZdravstvo] = useState('')
  const [mesecniNezaposlenost, setMesecniNezaposlenost] = useState('')
  const [imaPocetniPrihod, setImaPocetniPrihod] = useState(false)
  const [pocetniPrihodRsd, setPocetniPrihodRsd] = useState('')

  const tekucaGodina = new Date().getFullYear()

  const step1Ok = useMemo(() => {
    if (!datumRegistracije.trim()) return false
    const t = Date.parse(datumRegistracije)
    return Number.isFinite(t)
  }, [datumRegistracije])

  const step2Ok = useMemo(() => {
    const n = (s: string) => {
      const x = parseInt(String(s).replace(/\s/g, ''), 10)
      return Number.isFinite(x) && x >= 0
    }
    return n(mesecniPorez) && n(mesecniPio) && n(mesecniZdravstvo) && n(mesecniNezaposlenost)
  }, [mesecniPorez, mesecniPio, mesecniZdravstvo, mesecniNezaposlenost])

  const step3Ok = useMemo(() => {
    if (!imaPocetniPrihod) return true
    const x = parseInt(String(pocetniPrihodRsd).replace(/\s/g, ''), 10)
    return Number.isFinite(x) && x >= 0
  }, [imaPocetniPrihod, pocetniPrihodRsd])

  const finish = async () => {
    setErr(null)
    if (!step1Ok || !step2Ok || !step3Ok) {
      setErr('Proveri korake 1–3 (datum, iznosi, početni prihod) i pokušaj ponovo.')
      return
    }
    setSaving(true)
    try {
      const {
        data: { user: authUser },
        error: authErr,
      } = await supabase.auth.getUser()
      if (authErr || !authUser?.id) {
        setErr('Sesija nije važeća. Osveži stranu i prijavi se ponovo.')
        return
      }
      const uid = authUser.id

      const existing = readProfilFromStorage() ?? {}

      const merged = {
        ...existing,
        datumRegistracije,
        mesecniPorez,
        mesecniPio,
        mesecniZdravstvo,
        mesecniNezaposlenost,
        godisnjLimit: String(
          typeof existing.godisnjLimit === 'string' && existing.godisnjLimit.trim()
            ? existing.godisnjLimit
            : DEFAULT_GODISNJI_LIMIT_RSD
        ),
        pocetniPrihodRsd: imaPocetniPrihod ? String(parseInt(pocetniPrihodRsd.replace(/\s/g, ''), 10) || 0) : '',
        pocetniPrihodGodina: imaPocetniPrihod ? String(tekucaGodina) : '',
      }
      const regParsed = Date.parse(datumRegistracije)
      const registration_date =
        Number.isFinite(regParsed) ? new Date(regParsed).toISOString().slice(0, 10) : null
      const toInt = (s: string) => parseInt(String(s).replace(/\s/g, ''), 10) || 0
      const { error } = await supabase.from('profiles').upsert(
        {
          id: uid,
          company_data: merged,
          onboarding_completed: true,
          registration_date,
          porez_na_prihod: toInt(mesecniPorez),
          pio_doprinos: toInt(mesecniPio),
          zdravstveno: toInt(mesecniZdravstvo),
          nezaposleni: toInt(mesecniNezaposlenost),
        },
        { onConflict: 'id' }
      )
      if (error) {
        setErr(error.message || 'Greška pri čuvanju profila.')
        return
      }

      setProfileMemory(uid, merged as Record<string, unknown>)
      setOnboardingMemory(true)
      notifyProfilUpdated()
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Greška pri čuvanju')
    } finally {
      setSaving(false)
    }
  }

  const goNext = () => {
    setErr(null)
    if (step === 1 && !step1Ok) {
      setErr('Izaberi datum registracije preduzetnika.')
      return
    }
    if (step === 2 && !step2Ok) {
      setErr('Unesi sve iznose iz rešenja (brojevi ≥ 0).')
      return
    }
    if (step === 3) {
      if (!step3Ok) {
        setErr('Unesi iznos početnog prihoda ili isključi opciju.')
        return
      }
      void finish()
      return
    }
    setStep(s => (s === 1 ? 2 : 3) as Step)
  }

  const goBack = () => {
    setErr(null)
    if (step === 1) return
    setStep(s => (s === 3 ? 2 : 1) as Step)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: 'min(92vh, 720px)',
          overflow: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '24px 22px 22px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <p style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', margin: '0 0 6px 0' }}>
              PRVI PUT
            </p>
            <h1 id="onb-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Podesi osnovne podatke
            </h1>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            {step}/3
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {([1, 2, 3] as const).map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 4,
                background: s <= step ? 'var(--accent)' : 'var(--border)',
                opacity: s <= step ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55, margin: '0 0 16px 0' }}>
              Datum kada si registrovao preduzetničku delatnost (upis u APR / početak obavljanja).
            </p>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
              Datum registracije
            </label>
            <input
              type="date"
              value={datumRegistracije}
              onChange={e => setDatumRegistracije(e.target.value)}
              onFocus={() => setFocused('d')}
              onBlur={() => setFocused(null)}
              style={inpStyle(focused === 'd')}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55, margin: '0 0 16px 0' }}>
              Mesečni iznosi iz rešenja Poreskog upravnika (akontacije i doprinosi).
            </p>
            {([
              { k: 'porez', label: 'Porez na prihod', v: mesecniPorez, set: setMesecniPorez },
              { k: 'pio', label: 'PIO doprinos', v: mesecniPio, set: setMesecniPio },
              { k: 'zdr', label: 'Zdravstveno osiguranje', v: mesecniZdravstvo, set: setMesecniZdravstvo },
              { k: 'nez', label: 'Osiguranje za nezaposlenost', v: mesecniNezaposlenost, set: setMesecniNezaposlenost },
            ] as const).map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0', fontWeight: 600 }}>
                  {f.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={f.v}
                    onChange={e => f.set(e.target.value)}
                    onFocus={() => setFocused(f.k)}
                    onBlur={() => setFocused(null)}
                    style={{ ...inpStyle(focused === f.k), paddingRight: 48 }}
                  />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>
                    RSD
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55, margin: '0 0 16px 0' }}>
              Ako si već ostvario prihod u {tekucaGodina}. godini pre nego što koristiš aplikaciju, unesi taj iznos da bi limit i KPO bili tačni.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={imaPocetniPrihod}
                onChange={e => setImaPocetniPrihod(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
              />
              <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Već imam ostvareni prihod ove godine</span>
            </label>
            {imaPocetniPrihod && (
              <>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
                  Prihod pre aplikacije ({tekucaGodina}.)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={pocetniPrihodRsd}
                    onChange={e => setPocetniPrihodRsd(e.target.value)}
                    onFocus={() => setFocused('po')}
                    onBlur={() => setFocused(null)}
                    style={{ ...inpStyle(focused === 'po'), paddingRight: 48 }}
                  />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>
                    RSD
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {err && (
          <p style={{ color: 'var(--alert-danger-text)', fontSize: 12, margin: '14px 0 0 0' }}>{err}</p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              style={{
                flex: 1,
                minWidth: 120,
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: 15,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              Nazad
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={saving}
            style={{
              flex: 2,
              minWidth: 160,
              padding: '14px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 800,
              fontSize: 15,
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 0 24px rgba(0,255,179,0.25)',
            }}
          >
            {saving ? 'Čuvanje…' : step === 3 ? 'Završi' : 'Dalje'}
          </button>
        </div>
      </div>
    </div>
  )
}
