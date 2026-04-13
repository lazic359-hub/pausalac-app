'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'
import {
  BarChart3,
  Bell,
  BookMarked,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  FileText,
  Landmark,
  Minus,
  Plus,
  Receipt,
  TrendingUp,
} from 'lucide-react'

const ACCENT = '#00C896'
const BG = '#0a0a0a'

const faqItems = [
  {
    q: 'Da li je aplikacija legalna zamena za računovođu?',
    a: 'Nije zamena, ali je odličan alat za praćenje. Za složenije situacije preporučujemo konsultaciju sa računovođom.',
  },
  {
    q: 'Kako se računa limit od 6.000.000 RSD?',
    a: 'Limit se odnosi na ukupan promet u kalendarskoj godini. App automatski prati svaku naplaćenu fakturu.',
  },
  {
    q: 'Da li mogu da koristim app ako fakturišem u EUR?',
    a: 'Da. App automatski konvertuje u RSD po NBS kursu za datum naplate.',
  },
  {
    q: 'Šta je KPO knjiga i zašto je važna?',
    a: 'Knjiga poslovnih promena je zakonska obaveza svakog paušalca. App je vodi automatski kada označiš fakturu kao plaćenu.',
  },
  {
    q: 'Mogu li da otkažem pretplatu?',
    a: 'Da, u svakom trenutku. Tvoji podaci ostaju sačuvani na nalogu.',
  },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div style={{ background: BG, color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #1f1f1f',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff' }}
          >
            <Briefcase size={22} strokeWidth={2} color={ACCENT} aria-hidden />
            <span style={{ fontWeight: 800, color: ACCENT, letterSpacing: 0.2, fontSize: 18 }}>Paušo</span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => scrollToId('funkcije')}
              style={navBtn}
            >
              Funkcije
            </button>
            <button
              type="button"
              onClick={() => scrollToId('cena')}
              style={navBtn}
            >
              Cena
            </button>
            <Link
              href="/login"
              style={{
                ...navBtn,
                border: `1px solid ${ACCENT}55`,
                color: ACCENT,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Prijavi se
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '48px 20px 56px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 5vw, 2.65rem)',
              lineHeight: 1.12,
              fontWeight: 900,
              margin: '0 0 16px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Paušo — džepni knjigovođa za paušalce
          </h1>
          <p
            style={{
              maxWidth: 520,
              margin: '0 auto 28px',
              color: '#888',
              fontSize: 'clamp(1rem, 2.8vw, 1.125rem)',
              lineHeight: 1.65,
            }}
          >
            Paušo prati tvoje prihode, rokove i poreze — bez računovođe i bez Excel tabela.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <Link
              href="/register"
              style={{
                background: ACCENT,
                color: '#000',
                fontWeight: 800,
                padding: '14px 22px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: 15,
                boxShadow: `0 0 24px ${ACCENT}35`,
              }}
            >
              Registruj se
            </Link>
            <Link
              href="/login"
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                color: '#fff',
                fontWeight: 700,
                padding: '14px 22px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: 15,
              }}
            >
              Prijavi se
            </Link>
          </div>
          <button
            type="button"
            aria-label="Skroluj nadole"
            onClick={() => scrollToId('problem')}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              fontSize: 24,
              lineHeight: 1,
              padding: 8,
            }}
          >
            ↓
          </button>
        </section>

        {/* PROBLEM */}
        <section
          id="problem"
          style={{ padding: '56px 20px', borderTop: '1px solid #1f1f1f', background: '#080808' }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 20,
              }}
            >
              {([
                {
                  Icon: Calendar,
                  title: 'Zaboravljaš rokove za porez?',
                  text: 'Svaki 15. u mesecu, plus eko-taksa, plus PP OPO. Lako se izgubi.',
                },
                {
                  Icon: BarChart3,
                  title: 'Ne znaš koliko si zaradio ove godine?',
                  text: 'Limit od 6.000.000 RSD se puni brže nego što misliš.',
                },
                {
                  Icon: FileText,
                  title: 'KPO knjiga ti oduzima vreme?',
                  text: 'Svaka naplaćena faktura mora biti upisana ručno. Ili ne mora.',
                },
              ] as const).map((item) => {
                const CardIcon = item.Icon
                return (
                <div
                  key={item.title}
                  style={{
                    background: '#111',
                    border: '1px solid #1f1f1f',
                    borderRadius: 16,
                    padding: 22,
                  }}
                >
                  <div style={{ marginBottom: 12, color: ACCENT }}>
                    <CardIcon size={28} strokeWidth={2} aria-hidden />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px 0', color: '#fff' }}>{item.title}</h3>
                  <p style={{ margin: 0, color: '#888', fontSize: 14, lineHeight: 1.55 }}>{item.text}</p>
                </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="funkcije" style={{ padding: '56px 20px', borderTop: '1px solid #1f1f1f' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, margin: '0 0 28px 0', textAlign: 'center' }}>
              Sve na jednom mestu
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              {([
                { Icon: TrendingUp, t: 'Praćenje prihoda', d: 'Vidi koliko si zaradio i koliko ti ostaje do limita' },
                { Icon: Bell, t: 'Rokovi i podsetnici', d: 'Push notifikacije pre svakog roka plaćanja' },
                { Icon: Receipt, t: 'Fakturisanje', d: 'Kreiraj i šalji fakture u EUR, USD ili RSD' },
                { Icon: BookMarked, t: 'KPO automatski', d: 'Faktura plaćena = KPO upis automatski' },
                { Icon: Landmark, t: 'Porez kalkulator', d: 'Tačno znaš šta duguješ svaki mesec' },
                { Icon: Building2, t: 'DOO kalkulator', d: 'Saznaj kada ti se isplati preći u DOO' },
              ] as const).map((f) => {
                const FeatureIcon = f.Icon
                return (
                <div
                  key={f.t}
                  style={{
                    background: '#111',
                    border: '1px solid #1f1f1f',
                    borderRadius: 14,
                    padding: 18,
                    minHeight: 140,
                  }}
                >
                  <div style={{ marginBottom: 10, color: ACCENT }}>
                    <FeatureIcon size={26} strokeWidth={2} aria-hidden />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8, color: ACCENT }}>{f.t}</div>
                  <p style={{ margin: 0, color: '#888', fontSize: 13, lineHeight: 1.5 }}>{f.d}</p>
                </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section style={{ padding: '56px 20px', borderTop: '1px solid #1f1f1f', background: '#080808' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, margin: '0 0 8px 0', textAlign: 'center' }}>
              Koriste paušalci širom Srbije
            </h2>
            {/* TODO: replace with real testimonials */}
            <p style={{ textAlign: 'center', color: '#666', fontSize: 12, margin: '0 0 24px 0' }}>
              TODO: replace with real testimonials
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {[
                {
                  quote: 'Konačno ne moram da pamtim datume. App me podseti dan pre roka.',
                  who: 'Marko T., web developer, Beograd',
                },
                {
                  quote: 'KPO knjiga se popunjava sama. Uštedi mi sat vremena mesečno.',
                  who: 'Jovana M., grafički dizajner, Novi Sad',
                },
                {
                  quote: 'DOO kalkulator me ubedio da ostanem paušalac još godinu dana.',
                  who: 'Stefan R., konsultant, Niš',
                },
              ].map((t) => (
                <blockquote
                  key={t.who}
                  style={{
                    margin: 0,
                    background: '#111',
                    border: '1px solid #1f1f1f',
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <p style={{ margin: '0 0 14px 0', fontSize: 15, lineHeight: 1.55, color: '#e5e5e5' }}>&ldquo;{t.quote}&rdquo;</p>
                  <footer style={{ color: '#666', fontSize: 13 }}>— {t.who}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="cena" style={{ padding: '56px 20px', borderTop: '1px solid #1f1f1f', scrollMarginTop: 72 }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, margin: '0 0 28px 0', textAlign: 'center' }}>
              Jedna cena
            </h2>
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(0,200,150,0.08) 0%, #111 40%)',
                border: `2px solid ${ACCENT}`,
                borderRadius: 18,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, color: ACCENT, letterSpacing: '0.08em', marginBottom: 8 }}>
                PAUŠO
              </div>
              <ul style={{ margin: '0 0 20px 0', paddingLeft: 18, color: '#aaa', fontSize: 14, lineHeight: 1.7, flex: 1 }}>
                <li>Praćenje prihoda, limita i KPO knjige</li>
                <li>Fakture i viševalutno fakturisanje (EUR, USD)</li>
                <li>PDF izvoz KPO knjige</li>
                <li>DOO kalkulator</li>
                <li>Rokovi i podsetnici</li>
              </ul>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 900 }}>4,99 €</span>
                <span style={{ fontSize: 15, color: '#888', fontWeight: 600 }}> / mesec</span>
              </div>
              <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 13 }}>Mesečna pretplata</p>
              <Link
                href="/register"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: ACCENT,
                  color: '#000',
                  fontWeight: 800,
                  padding: '14px 18px',
                  borderRadius: 12,
                  textDecoration: 'none',
                }}
              >
                Registruj se
              </Link>
            </div>
            <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: 20 }}>
              Bez kreditne kartice. Otkaži kada hoćeš.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: '56px 20px 80px', borderTop: '1px solid #1f1f1f', background: '#080808' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, margin: '0 0 24px 0', textAlign: 'center' }}>
              Česta pitanja
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {faqItems.map((item, i) => {
                const open = openFaq === i
                return (
                  <div
                    key={item.q}
                    style={{
                      border: '1px solid #1f1f1f',
                      borderRadius: 12,
                      background: '#111',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '16px 18px',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span>{item.q}</span>
                      <span style={{ color: ACCENT, flexShrink: 0, display: 'inline-flex' }} aria-hidden>
                        {open ? <Minus size={18} strokeWidth={2} /> : <Plus size={18} strokeWidth={2} />}
                      </span>
                    </button>
                    {open && (
                      <div
                        style={{
                          padding: '0 18px 16px',
                          color: '#888',
                          fontSize: 14,
                          lineHeight: 1.6,
                        }}
                      >
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #1f1f1f', padding: '40px 20px', background: '#050505' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Briefcase size={18} strokeWidth={2} color={ACCENT} aria-hidden />
                <span style={{ fontWeight: 800, color: ACCENT }}>Paušo</span>
              </div>
              <p style={{ margin: 0, color: '#666', fontSize: 14 }}>Džepni knjigovođa za paušalce</p>
            </div>
            <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <Link href="/login" style={{ color: '#aaa', textDecoration: 'none', fontSize: 14 }}>
                Prijavi se
              </Link>
              <Link href="/register" style={{ color: '#aaa', textDecoration: 'none', fontSize: 14 }}>
                Registruj se
              </Link>
              <a href="mailto:kontakt@pausalac.app" style={{ color: '#aaa', textDecoration: 'none', fontSize: 14 }}>
                Kontakt
              </a>
            </nav>
          </div>
          <p style={{ margin: '0 0 12px 0', color: '#555', fontSize: 12, lineHeight: 1.55, maxWidth: 560 }}>
            Paušo nije licencirani finansijski savetnik. Aplikacija služi kao pomoćni alat.
          </p>
          <p style={{ margin: 0, color: '#444', fontSize: 12 }}>© 2026 Paušo</p>
        </div>
      </footer>
    </div>
  )
}

const navBtn: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#aaa',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  padding: '8px 10px',
}
