'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Animate on scroll hook ───────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, inView }
}

// ─── Animated section wrapper ─────────────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0px)' : 'translateY(40px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Ticker / marquee ─────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  '📊 Praćenje limita u realnom vremenu',
  '🧾 PDF fakture za manje od minute',
  '📒 Automatska KPO knjiga',
  '🔒 Podaci samo u vašem browseru',
  '⚡ Besplatno zauvek',
  '📅 Poreski kalendar',
]

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div style={{ overflow: 'hidden', borderTop: '1px solid #1a2535', borderBottom: '1px solid #1a2535', padding: '14px 0', background: '#080b10' }}>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          gap: 60px;
          animation: ticker 28s linear infinite;
          width: max-content;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="ticker-track">
        {items.map((item, i) => (
          <span key={i} style={{ color: '#3a5a48', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent, delay }: { icon: string; title: string; desc: string; accent: string; delay: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? '#0f1620' : '#0a0f18',
          border: `1px solid ${hovered ? accent + '50' : '#1a2535'}`,
          borderRadius: '20px',
          padding: '32px 28px',
          cursor: 'default',
          transition: 'all 0.3s ease',
          transform: hovered ? 'translateY(-6px)' : 'none',
          boxShadow: hovered ? `0 20px 60px ${accent}18` : 'none',
          position: 'relative',
          overflow: 'hidden',
          flex: '1 1 260px',
        }}
      >
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 180, height: 180,
          background: accent,
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: hovered ? 0.12 : 0.05,
          transition: 'opacity 0.3s',
        }} />
        <div style={{
          width: 52, height: 52,
          background: accent + '18',
          border: `1px solid ${accent}35`,
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
          marginBottom: 20,
        }}>
          {icon}
        </div>
        <h3 style={{ color: '#e8f0f8', fontSize: '19px', fontWeight: 700, margin: '0 0 10px 0', letterSpacing: '-0.3px' }}>
          {title}
        </h3>
        <p style={{ color: '#4a5a6a', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
          {desc}
        </p>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }} />
      </div>
    </Reveal>
  )
}

// ─── Stat ─────────────────────────────────────────────────────────────────────
function Stat({ number, label, delay }: { number: string; label: string; delay: number }) {
  return (
    <Reveal delay={delay} style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '42px', fontWeight: 800, color: '#00ffb3', margin: '0 0 6px 0', letterSpacing: '-2px', fontFamily: "'DM Mono', monospace" }}>
        {number}
      </p>
      <p style={{ color: '#3a4a5a', fontSize: '13px', margin: 0, letterSpacing: '0.5px' }}>
        {label}
      </p>
    </Reveal>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [ctaHovered, setCtaHovered] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <div style={{ background: '#060910', color: 'white', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px #00ffb330, 0 0 60px #00ffb315; }
          50% { box-shadow: 0 0 50px #00ffb355, 0 0 100px #00ffb320; }
        }
        @keyframes grid-fade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes hero-line {
          0% { width: 0; }
          100% { width: 100%; }
        }
        .cta-btn {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .cta-btn:hover {
          animation: none !important;
        }
        ::selection { background: #00ffb340; color: #00ffb3; }
      `}</style>

      {/* Cursor glow */}
      <div style={{
        position: 'fixed',
        left: mousePos.x - 200,
        top: mousePos.y - 200,
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(0,255,179,0.04) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'left 0.1s, top 0.1s',
      }} />

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(0,255,179,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,179,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)',
      }} />

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px',
        background: 'rgba(6,9,16,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>💼</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#00ffb3', letterSpacing: '-0.5px' }}>Paušalac</span>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'transparent',
            border: '1px solid #00ffb340',
            color: '#00ffb3',
            fontSize: '13px',
            fontWeight: 600,
            padding: '8px 20px',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.3px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#00ffb318'
            e.currentTarget.style.borderColor = '#00ffb380'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = '#00ffb340'
          }}
        >
          Prijavi se →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px',
        position: 'relative', zIndex: 1,
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,255,179,0.08)',
          border: '1px solid rgba(0,255,179,0.2)',
          borderRadius: '20px', padding: '6px 16px',
          marginBottom: 36,
          animation: 'grid-fade 0.8s ease forwards',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ffb3', display: 'inline-block', boxShadow: '0 0 8px #00ffb3' }} />
          <span style={{ color: '#00ffb3', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>BESPLATNO ZA SVE PAUŠALCE</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(42px, 8vw, 86px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-2px',
          margin: '0 0 24px 0',
          maxWidth: 900,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <span style={{ color: '#f0f4f8' }}>Administracija</span>
          <br />
          <span style={{
            color: '#00ffb3',
            textShadow: '0 0 60px #00ffb350',
            position: 'relative',
          }}>
            koja ne boli.
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 19px)',
          color: '#4a5a6a',
          lineHeight: 1.7,
          maxWidth: 560,
          margin: '0 0 48px 0',
          fontWeight: 400,
        }}>
          Vodi svoju paušalnu firmu pametnije. Fakture, KPO knjiga i praćenje limita na jednom mestu.{' '}
          <span style={{ color: '#6a8a78' }}>Besplatno i sigurno.</span>
        </p>

        {/* CTA */}
        <button
          className="cta-btn"
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => setCtaHovered(false)}
          onClick={() => router.push('/dashboard')}
          style={{
            background: ctaHovered ? '#00ffb3' : '#00e8a2',
            color: '#000',
            fontSize: '16px',
            fontWeight: 800,
            padding: '18px 40px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '-0.3px',
            transform: ctaHovered ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 0.2s, background 0.2s',
          }}
        >
          Započni odmah — Besplatno je ⚡
        </button>

        <p style={{ color: '#1e2e3a', fontSize: '12px', marginTop: 16 }}>
          Bez kreditne kartice · Bez instalacije · Radi odmah
        </p>

        {/* Floating mockup */}
        <div style={{
          marginTop: 72,
          width: '100%', maxWidth: 680,
          background: 'linear-gradient(135deg, #0d1520 0%, #0a1018 100%)',
          border: '1px solid #1a2535',
          borderRadius: '20px',
          padding: '24px',
          animation: 'float 6s ease-in-out infinite',
          boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,179,0.05)',
          position: 'relative',
        }}>
          {/* Fake browser bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1a2535' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            <div style={{ flex: 1, background: '#0f1820', borderRadius: 6, padding: '4px 12px', marginLeft: 8 }}>
              <span style={{ color: '#2a3a4a', fontSize: 11 }}>pausalac.vercel.app</span>
            </div>
          </div>

          {/* Fake dashboard preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'UKUPNI PRIHOD', value: '1.240.000', color: '#00ffb3' },
              { label: 'NETO', value: '884.880', color: '#a855f7' },
              { label: 'FAKTURE', value: '8', color: '#3b82f6' },
            ].map(item => (
              <div key={item.label} style={{ background: '#0a1018', border: '1px solid #1a2535', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ color: '#2a3a4a', fontSize: 9, margin: '0 0 6px 0', letterSpacing: 1 }}>{item.label}</p>
                <p style={{ color: item.color, fontWeight: 700, fontSize: 16, margin: 0, fontFamily: "'DM Mono', monospace" }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#0a1018', border: '1px solid #1a2535', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#2a3a4a', fontSize: 10 }}>Godišnji limit</span>
              <span style={{ color: '#00ffb3', fontSize: 10, fontFamily: "'DM Mono', monospace" }}>20.7%</span>
            </div>
            <div style={{ background: '#111820', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ width: '20.7%', height: '100%', background: '#00ffb3', borderRadius: 4, boxShadow: '0 0 8px #00ffb3' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── FEATURES ── */}
      <section style={{ padding: 'clamp(60px, 8vw, 120px) 24px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#00ffb3', fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 14 }}>
              Sve što ti treba
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, color: '#e8f0f8', margin: 0, letterSpacing: '-1px' }}>
              Tri alatke. Jedan cilj.
            </h2>
          </div>
        </Reveal>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <FeatureCard
            icon="⚡"
            title="Munjevite fakture"
            desc="Kreiraj profesionalnu PDF fakturu sa QR kodom za uplatu za manje od minute. Pošalji klijentu direktno iz aplikacije."
            accent="#00ffb3"
            delay={0}
          />
          <FeatureCard
            icon="📊"
            title="Zaboravi na limit"
            desc="Vizuelno praćenje godišnjeg limita od 6.000.000 RSD u realnom vremenu. Uvek znaš koliko ti je ostalo pre nego što prelomIš."
            accent="#6677ff"
            delay={100}
          />
          <FeatureCard
            icon="📒"
            title="Automatska KPO"
            desc="Tvoja knjiga prihoda i potraživanja popunjava se sama dok ti radiš. Export u PDF jednim klikom kad zatreba inspekcija."
            accent="#ff9944"
            delay={200}
          />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) 24px', borderTop: '1px solid #1a2535', borderBottom: '1px solid #1a2535', background: '#080b10', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40 }}>
          <Stat number="6M" label="RSD godišnji limit" delay={0} />
          <Stat number="<1min" label="za kreiranje fakture" delay={100} />
          <Stat number="100%" label="besplatno zauvek" delay={200} />
          <Stat number="0" label="instalacija potrebno" delay={300} />
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section style={{ padding: 'clamp(60px, 8vw, 120px) 24px', maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={{
            background: 'linear-gradient(135deg, #0a1020 0%, #060e18 100%)',
            border: '1px solid #1a2535',
            borderRadius: '24px',
            padding: 'clamp(32px, 5vw, 56px)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -80, right: -80,
              width: 300, height: 300,
              background: '#00ffb3',
              borderRadius: '50%',
              filter: 'blur(120px)',
              opacity: 0.06,
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              <div style={{
                width: 64, height: 64, flexShrink: 0,
                background: 'rgba(0,255,179,0.1)',
                border: '1px solid rgba(0,255,179,0.25)',
                borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
              }}>
                🔒
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <p style={{ color: '#00ffb3', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>
                  Bezbednost pre svega
                </p>
                <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 800, color: '#e8f0f8', margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>
                  Tvoji podaci ostaju tvoji.
                </h2>
                <p style={{ color: '#4a5a6a', fontSize: '15px', lineHeight: 1.8, margin: '0 0 24px 0' }}>
                  Svi finansijski podaci — fakture, prihodi, klijenti — čuvaju se{' '}
                  <span style={{ color: '#7a9a8a', fontWeight: 600 }}>isključivo u tvom browseru</span>{' '}
                  (localStorage). Mi nemamo server koji čuva tvoje finansije. Niko drugi{' '}
                  — ni Paušalac tim, ni hakeri, ni treće strane — nema pristup tvojim podacima.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    '✓ Nema servera sa tvojim finansijama',
                    '✓ Nema deljenja podataka',
                    '✓ Radi i offline',
                    '✓ Možeš da exportuješ sve u PDF',
                  ].map(item => (
                    <span key={item} style={{
                      background: 'rgba(0,255,179,0.06)',
                      border: '1px solid rgba(0,255,179,0.15)',
                      color: '#5a8a70',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '6px 14px',
                      borderRadius: '20px',
                    }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: 'clamp(60px, 8vw, 100px) 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 300,
          background: 'radial-gradient(ellipse, rgba(0,255,179,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Reveal>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, color: '#e8f0f8', margin: '0 0 16px 0', letterSpacing: '-1px' }}>
            Spreman/na da počneš?
          </h2>
          <p style={{ color: '#3a4a5a', fontSize: '16px', marginBottom: 40 }}>
            Registracija traje 30 sekundi. Kreditna kartica nije potrebna.
          </p>
          <button
            className="cta-btn"
            onClick={() => router.push('/dashboard')}
            style={{
              background: '#00e8a2',
              color: '#000',
              fontSize: '17px',
              fontWeight: 800,
              padding: '20px 48px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.3px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.transition = 'transform 0.2s' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            Započni odmah — Besplatno je ⚡
          </button>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid #1a2535',
        background: '#060910',
        padding: 'clamp(32px, 4vw, 56px) 40px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>💼</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#00ffb3' }}>Paušalac</span>
              </div>
              <p style={{ color: '#2a3a4a', fontSize: '13px', maxWidth: 220, lineHeight: 1.6, margin: 0 }}>
                Digitalna administracija za srpske paušalne preduzetnike.
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#1a2535', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14 }}>Aplikacija</p>
                {[
                  { label: 'Dashboard', href: '/dashboard' },
                  { label: 'Fakture', href: '/faktura' },
                  { label: 'KPO knjiga', href: '/kpo' },
                  { label: 'Podešavanja', href: '/settings' },
                ].map(link => (
                  <a key={link.label} href={link.href} style={{ display: 'block', color: '#2a3a4a', fontSize: '13px', textDecoration: 'none', marginBottom: 8, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#00ffb3')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#2a3a4a')}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div>
                <p style={{ color: '#1a2535', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14 }}>Kontakt</p>
                {[
                  { label: '📧 Email podrška', href: 'mailto:podrska@pausalac.rs' },
                  { label: '💬 GitHub Issues', href: 'https://github.com' },
                ].map(link => (
                  <a key={link.label} href={link.href} style={{ display: 'block', color: '#2a3a4a', fontSize: '13px', textDecoration: 'none', marginBottom: 8, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#00ffb3')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#2a3a4a')}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            background: '#0a0d14',
            border: '1px solid #1a2535',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <p style={{ color: '#1e2e3e', fontSize: '11px', lineHeight: 1.7, margin: 0 }}>
              <span style={{ color: '#2a3a4a', fontWeight: 700 }}>⚠️ Disclaimer:</span>{' '}
              Paušalac je aplikacija informativnog karaktera i ne predstavlja poresko, pravno niti finansijsko savetovanje.
              Sve informacije o poreskim stopama, rokovima i limitima su okvirne i podložne promenama.
              Za tačne i ažurne informacije konsultujte Poresku upravu Republike Srbije ili ovlašćenog računovođu.
              Autori aplikacije ne snose odgovornost za eventualne greške ili propuste.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: '#1a2535', fontSize: '12px', margin: 0 }}>
              © {new Date().getFullYear()} Paušalac · Napravljeno sa ☕ za srpske preduzetnike
            </p>
            <p style={{ color: '#1a2535', fontSize: '11px', fontFamily: "'DM Mono', monospace", margin: 0 }}>
              v2.0 · MIT License
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
