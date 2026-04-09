'use client'

import { useState, useMemo, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import {
  readProfilFromStorage,
  markSessionOnboardingPersisted,
  setOnboardingMemory,
  setProfileMemory,
  DEFAULT_GODISNJI_LIMIT_RSD,
} from '@/lib/profile'
import { loadOfflineProfile, saveOfflineProfile } from '@/lib/offline-data-cache'
import { identityColumnsPayload } from '@/lib/profile-identity-columns'

const supabase = getSupabaseBrowser()

function notifyProfilUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('pausalac-profil-updated'))
}

function humanizeSaveErrorMessage(msg: string): string {
  const m = (msg || '').toLowerCase()
  if (!m) return 'Greška pri čuvanju profila.'
  if (m.includes('failed to fetch') || m.includes('could not fetch')) {
    return 'Ne mogu da sačuvam profil (mrežna greška). Proveri internet i pokušaj ponovo.'
  }
  if (m.includes('network') || m.includes('timeout')) {
    return 'Ne mogu da sačuvam profil (problem sa mrežom). Pokušaj ponovo.'
  }
  if (m.includes('jwt') || m.includes('session') || m.includes('not authenticated')) {
    return 'Sesija nije važeća. Osveži stranu i prijavi se ponovo.'
  }
  return msg
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
  const [nazivFirme, setNazivFirme] = useState('')
  const [pib, setPib] = useState('')
  const [obveznik, setObveznik] = useState('')
  const [sediste, setSediste] = useState('')
  const [sifraDelatnosti, setSifraDelatnosti] = useState('')
  const [sifraPoreskogObveznika, setSifraPoreskogObveznika] = useState('')
  const [mesecniPorez, setMesecniPorez] = useState('')
  const [mesecniPio, setMesecniPio] = useState('')
  const [mesecniZdravstvo, setMesecniZdravstvo] = useState('')
  const [mesecniNezaposlenost, setMesecniNezaposlenost] = useState('')
  const [nemaResenje, setNemaResenje] = useState(false)
  const [imaPocetniPrihod, setImaPocetniPrihod] = useState(false)
  const [pocetniPrihodRsd, setPocetniPrihodRsd] = useState('')

  const tekucaGodina = new Date().getFullYear()

  useEffect(() => {
    const p = readProfilFromStorage()
    if (!p) return
    if (p.nazivFirme) setNazivFirme(String(p.nazivFirme))
    if (p.pib) setPib(String(p.pib))
    if (p.obveznik) setObveznik(String(p.obveznik))
    if (p.sediste) setSediste(String(p.sediste))
    if (p.sifraDelatnosti) setSifraDelatnosti(String(p.sifraDelatnosti))
    if (p.sifraPoreskogObveznika) setSifraPoreskogObveznika(String(p.sifraPoreskogObveznika))
  }, [])

  useEffect(() => {
    if (obveznik.trim()) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = String((user?.user_metadata as any)?.full_name ?? '').trim()
      if (name) setObveznik(name)
    })
  }, [obveznik])

  useEffect(() => {
    if (!nemaResenje) return
    setMesecniPorez('')
    setMesecniPio('')
    setMesecniZdravstvo('')
    setMesecniNezaposlenost('')
  }, [nemaResenje])

  const step1Ok = useMemo(() => {
    if (!datumRegistracije.trim()) return false
    const t = Date.parse(datumRegistracije)
    if (!Number.isFinite(t)) return false
    const pibDigits = pib.replace(/\D/g, '')
    if (pibDigits.length > 0 && pibDigits.length !== 9) return false
    return true
  }, [datumRegistracije, pib])

  const step2Ok = useMemo(() => {
    if (nemaResenje) return true
    const n = (s: string) => {
      const x = parseInt(String(s).replace(/\s/g, ''), 10)
      return Number.isFinite(x) && x >= 0
    }
    return n(mesecniPorez) && n(mesecniPio) && n(mesecniZdravstvo) && n(mesecniNezaposlenost)
  }, [nemaResenje, mesecniPorez, mesecniPio, mesecniZdravstvo, mesecniNezaposlenost])

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
        mesecniPorez: nemaResenje ? '' : mesecniPorez,
        mesecniPio: nemaResenje ? '' : mesecniPio,
        mesecniZdravstvo: nemaResenje ? '' : mesecniZdravstvo,
        mesecniNezaposlenost: nemaResenje ? '' : mesecniNezaposlenost,
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
      const porez = nemaResenje ? 0 : toInt(mesecniPorez)
      const pio = nemaResenje ? 0 : toInt(mesecniPio)
      const zdr = nemaResenje ? 0 : toInt(mesecniZdravstvo)
      const nez = nemaResenje ? 0 : toInt(mesecniNezaposlenost)
      const { error } = await supabase.from('profiles').upsert(
        {
          id: uid,
          company_data: merged,
          onboarding_completed: true,
          registration_date,
          porez_na_prihod: porez,
          pio_doprinos: pio,
          zdravstveno: zdr,
          nezaposleni: nez,
          ...identityColumnsPayload(merged as Record<string, unknown>),
        },
        { onConflict: 'id' }
      )
      if (error) {
        setErr(humanizeSaveErrorMessage(error.message || 'Greška pri čuvanju profila.'))
        return
      }

      setProfileMemory(uid, merged as Record<string, unknown>)
      setOnboardingMemory(true)
      markSessionOnboardingPersisted(uid)
      const offlineSnap = loadOfflineProfile(uid)
      saveOfflineProfile(uid, {
        company: merged as Record<string, unknown>,
        onboarding_completed: true,
        poresni_kalendar_placanja: offlineSnap?.data.poresni_kalendar_placanja ?? {},
        porez_na_prihod: porez,
        pio_doprinos: pio,
        zdravstveno: zdr,
        nezaposleni: nez,
        plan: offlineSnap?.data.plan ?? 'free',
        pro_until: offlineSnap?.data.pro_until ?? null,
      })
      notifyProfilUpdated()
      onDone()
    } catch (e) {
      if (e instanceof Error) {
        console.warn('[OnboardingWizard] finish:', e.message)
        setErr(humanizeSaveErrorMessage(e.message))
      } else {
        setErr('Greška pri čuvanju profila.')
      }
    } finally {
      setSaving(false)
    }
  }

  const goNext = () => {
    setErr(null)
    if (step === 1 && !step1Ok) {
      setErr('Unesi datum početka paušala. PIB je opcioni (ako ga uneseš, mora imati 9 cifara).')
      return
    }
    if (step === 2 && !step2Ok) {
      setErr('Unesi sve iznose iz rešenja (brojevi ≥ 0) ili preskoči ovaj korak.')
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
              Podaci za KPO i službene evidencije (isti kao u poreskom kartonu / APR).
            </p>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
              Datum početka paušalnog oporezivanja
            </label>
            <input
              type="date"
              value={datumRegistracije}
              onChange={e => setDatumRegistracije(e.target.value)}
              onFocus={() => setFocused('d')}
              onBlur={() => setFocused(null)}
              style={{ ...inpStyle(focused === 'd'), marginBottom: 14 }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '-6px 0 14px 0', lineHeight: 1.45 }}>
              Ako nisi siguran, uzmi datum sa rešenja (početak važenja) — ne mora da bude isti kao datum osnivanja u APR.
            </p>

            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
              PIB (9 cifara)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={pib}
              onChange={e => setPib(e.target.value)}
              onFocus={() => setFocused('pib')}
              onBlur={() => setFocused(null)}
              placeholder="123456789"
              style={{ ...inpStyle(focused === 'pib'), marginBottom: 14 }}
            />

            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
              Obveznik (ime i prezime)
            </label>
            <input
              type="text"
              value={obveznik}
              onChange={e => setObveznik(e.target.value)}
              onFocus={() => setFocused('obv')}
              onBlur={() => setFocused(null)}
              placeholder="npr. Marko Marković"
              style={{ ...inpStyle(focused === 'obv'), marginBottom: 14 }}
            />

            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
              Firma / radnja (naziv)
            </label>
            <input
              type="text"
              value={nazivFirme}
              onChange={e => setNazivFirme(e.target.value)}
              onFocus={() => setFocused('nz')}
              onBlur={() => setFocused(null)}
              placeholder="npr. Marko Marković PR Beograd"
              style={{ ...inpStyle(focused === 'nz'), marginBottom: 14 }}
            />

            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
              Sedište
            </label>
            <input
              type="text"
              value={sediste}
              onChange={e => setSediste(e.target.value)}
              onFocus={() => setFocused('sed')}
              onBlur={() => setFocused(null)}
              placeholder="npr. Beograd, Ulica br. 1"
              style={{ ...inpStyle(focused === 'sed'), marginBottom: 14 }}
            />

            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
              Šifra delatnosti
            </label>
            <input
              type="text"
              value={sifraDelatnosti}
              onChange={e => setSifraDelatnosti(e.target.value)}
              onFocus={() => setFocused('sd')}
              onBlur={() => setFocused(null)}
              placeholder="npr. 62.01"
              style={{ ...inpStyle(focused === 'sd'), marginBottom: 14 }}
            />

            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 600 }}>
              Šifra poreskog obveznika
            </label>
            <input
              type="text"
              value={sifraPoreskogObveznika}
              onChange={e => setSifraPoreskogObveznika(e.target.value)}
              onFocus={() => setFocused('spo')}
              onBlur={() => setFocused(null)}
              placeholder="Kod iz Poreskog upravnika"
              style={inpStyle(focused === 'spo')}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55, margin: '0 0 16px 0' }}>
              Mesečni iznosi iz rešenja Poreskog upravnika (akontacije i doprinosi). Ako nemaš rešenje pri ruci, možeš preskočiti i uneti kasnije u Podešavanjima.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={nemaResenje}
                onChange={e => setNemaResenje(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
              />
              <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Nemam rešenje pri ruci (unesiću kasnije)</span>
            </label>
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
                    disabled={nemaResenje}
                    style={{ ...inpStyle(focused === f.k), paddingRight: 48 }}
                  />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>
                    RSD
                  </span>
                </div>
              </div>
            ))}
            {nemaResenje && (
              <div
                style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--alert-info-bg)',
                  border: '1px solid var(--alert-info-border)',
                }}
              >
                <p style={{ margin: 0, color: 'var(--alert-info-text)', fontSize: 12, fontWeight: 700 }}>
                  Možeš kasnije uneti iznose u Podešavanjima profila.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55, margin: '0 0 16px 0' }}>
              Ako si već ostvario prihod u {tekucaGodina}. godini pre nego što koristiš aplikaciju, unesi zbir da bi limit i KPO bili tačni.
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
                  Ukupno prihoda od 1.1. ({tekucaGodina}.)
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
