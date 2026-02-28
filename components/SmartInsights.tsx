"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KPOFaktura {
  id: string;
  datum: string; // ISO date string
  iznos_rsd: number;
  klijent?: string;
}

interface SmartInsightsProps {
  /** Callback to open the MonthlyObligations / QR modal */
  onOpenQRModal?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT_6M = 6_000_000;
const WARNING_THRESHOLD = 5_000_000;
const ACCENT = "#4ade80"; // neon-green (tailwind green-400)

const MONTHS_SR = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Avg", "Sep", "Okt", "Nov", "Dec",
];

const MONTHS_SR_FULL = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "November", "Decembar",
];

const TEST_PITANJA = [
  {
    pitanje: "Radiš isključivo za jednog klijenta?",
    objasnjenje:
      "Ako sav prihod dolazi od jednog klijenta, poreski organ može smatrati da si zapravo radnik, ne preduzetnik.",
  },
  {
    pitanje: "Klijent ti određuje radno vreme?",
    objasnjenje:
      "Kontrola radnog vremena je ključni indikator radnog odnosa, što može dovesti do reklasifikacije.",
  },
  {
    pitanje: "Klijent ti obezbeđuje opremu i alate?",
    objasnjenje:
      "Korišćenje klijentove opreme smanjuje tvoju poslovnu samostalnost.",
  },
  {
    pitanje: "Nemaš sopstvenu poslovnu adresu?",
    objasnjenje:
      "Odsustvo poslovne adrese odvojene od klijenta može biti rizik.",
  },
  {
    pitanje: "Ne možeš slobodno birati metode rada?",
    objasnjenje:
      "Preduzetnik sam odlučuje kako će posao izvršiti — ako ne možeš, to je rizik.",
  },
  {
    pitanje: "Klijent ima pravo da raskine saradnju bez otkaznog roka?",
    objasnjenje:
      "Ovakve klauzule su karakteristika radnog, a ne poslovnog odnosa.",
  },
  {
    pitanje: "Primaš fiksnu mesečnu naknadu bez veze sa obimom posla?",
    objasnjenje:
      "Fiksna plata bez projektne osnove liči na platu radnika.",
  },
  {
    pitanje: "Ne možeš angažovati podizvođače bez odobrenja?",
    objasnjenje:
      "Pravi preduzetnik slobodno angažuje saradnike.",
  },
  {
    pitanje: "Klijent ti plaća godišnji odmor ili bolovanje?",
    objasnjenje:
      "Ovo su prava radnika — ako ih primaš kao preduzetnik, to je ozbiljan rizik.",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntilNext15(): number {
  const now = new Date();
  const next15 = new Date(now.getFullYear(), now.getMonth(), 15);
  if (now.getDate() >= 15) {
    next15.setMonth(next15.getMonth() + 1);
  }
  const diff = next15.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatBroj(n: number): string {
  return new Intl.NumberFormat("sr-RS").format(Math.round(n));
}

function loadKPO(): KPOFaktura[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("kpo_knjiga");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-green-400/70 font-semibold mb-1">
      {children}
    </p>
  );
}

// ─── Burn-rate Panel ─────────────────────────────────────────────────────────

function BurnRatePanel({ fakture }: { fakture: KPOFaktura[] }) {
  const { ukupno, prosecniMesecni, dostizeMonth, prekoracio } = useMemo(() => {
    const ukupno = fakture.reduce((s, f) => s + (f.iznos_rsd || 0), 0);

    // Group by month
    const byMonth: Record<string, number> = {};
    fakture.forEach((f) => {
      const key = f.datum?.slice(0, 7); // "YYYY-MM"
      if (key) byMonth[key] = (byMonth[key] || 0) + (f.iznos_rsd || 0);
    });
    const months = Object.keys(byMonth).length || 1;
    const prosecniMesecni = ukupno / months;

    let dostizeMonth = "—";
    if (prosecniMesecni > 0) {
      const preostalo = LIMIT_6M - ukupno;
      if (preostalo > 0) {
        const mesecaPreostalo = Math.ceil(preostalo / prosecniMesecni);
        const target = new Date();
        target.setMonth(target.getMonth() + mesecaPreostalo);
        dostizeMonth = `${MONTHS_SR_FULL[target.getMonth()]} ${target.getFullYear()}`;
      } else {
        dostizeMonth = "već prešen";
      }
    }

    return {
      ukupno,
      prosecniMesecni,
      dostizeMonth,
      prekoracio: ukupno >= WARNING_THRESHOLD,
    };
  }, [fakture]);

  const progress = Math.min((ukupno / LIMIT_6M) * 100, 100);

  return (
    <SectionCard
      className={prekoracio ? "border-red-500/40 bg-red-950/20" : ""}
    >
      <Label>Burn-rate analiza</Label>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-2xl font-bold text-white">
            {formatBroj(ukupno)}{" "}
            <span className="text-sm font-normal text-white/50">RSD</span>
          </p>
          <p className="text-xs text-white/50 mt-0.5">
            Prosek:{" "}
            <span className="text-green-400">{formatBroj(prosecniMesecni)} RSD/mes</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Limit 6M</p>
          <p className="text-lg font-semibold text-white/70">
            {formatBroj(LIMIT_6M)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-white/10 overflow-hidden mb-3">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: prekoracio
              ? "linear-gradient(90deg, #ef4444, #f87171)"
              : `linear-gradient(90deg, #4ade80, #86efac)`,
            boxShadow: prekoracio
              ? "0 0 12px rgba(239,68,68,0.5)"
              : "0 0 12px rgba(74,222,128,0.4)",
          }}
        />
      </div>

      <p
        className={`text-xs ${prekoracio ? "text-red-400" : "text-white/60"}`}
      >
        {prekoracio ? (
          <span className="font-semibold text-red-400">
            ⚠️ Prešao si {formatBroj(WARNING_THRESHOLD)} RSD — konsultuj
            računovođu!
          </span>
        ) : prosecniMesecni > 0 ? (
          <>
            Ako nastaviš ovim tempom, limit od 6M ćeš dostići u{" "}
            <span className="text-green-400 font-semibold">{dostizeMonth}</span>
            .
          </>
        ) : (
          "Dodaj fakture da vidiš projekciju."
        )}
      </p>
    </SectionCard>
  );
}

// ─── Tax Countdown ────────────────────────────────────────────────────────────

function TaxCountdown({ onOpenQRModal }: { onOpenQRModal?: () => void }) {
  const days = daysUntilNext15();
  const urgent = days <= 3;
  const soon = days <= 7;

  return (
    <SectionCard
      className={
        urgent
          ? "border-red-500/40 bg-red-950/20"
          : soon
          ? "border-yellow-500/30 bg-yellow-950/10"
          : ""
      }
    >
      <Label>Poreski podsetnik</Label>
      <div className="flex items-center gap-4">
        <div
          className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
          style={{
            background: urgent
              ? "rgba(239,68,68,0.15)"
              : soon
              ? "rgba(234,179,8,0.15)"
              : "rgba(74,222,128,0.1)",
            border: `1px solid ${urgent ? "rgba(239,68,68,0.4)" : soon ? "rgba(234,179,8,0.3)" : "rgba(74,222,128,0.2)"}`,
          }}
        >
          <span
            className="text-2xl font-black leading-none"
            style={{ color: urgent ? "#f87171" : soon ? "#fbbf24" : ACCENT }}
          >
            {days}
          </span>
          <span className="text-[9px] text-white/40 uppercase tracking-wide">
            dana
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white leading-snug">
            Preostalo{" "}
            <span
              style={{ color: urgent ? "#f87171" : soon ? "#fbbf24" : ACCENT }}
              className="font-semibold"
            >
              {days} {days === 1 ? "dan" : "dana"}
            </span>{" "}
            za uplatu poreza i doprinosa.
          </p>
          <p className="text-xs text-white/40 mt-0.5">Rok: 15. u mesecu</p>
        </div>
      </div>
      {onOpenQRModal && (
        <button
          onClick={onOpenQRModal}
          className="mt-3 w-full py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            background: "rgba(74,222,128,0.12)",
            border: "1px solid rgba(74,222,128,0.3)",
            color: ACCENT,
          }}
        >
          Otvori QR kodove za plaćanje →
        </button>
      )}
    </SectionCard>
  );
}

// ─── Mini Chart ───────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-gray-900 border border-white/10 px-3 py-2 text-xs">
        <p className="text-white/60 mb-1">{label}</p>
        <p className="text-green-400 font-semibold">
          {formatBroj(payload[0].value)} RSD
        </p>
      </div>
    );
  }
  return null;
};

function MiniChart({ fakture }: { fakture: KPOFaktura[] }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const data = useMemo(() => {
    return MONTHS_SR.map((mes, i) => {
      const iznos = fakture
        .filter((f) => {
          if (!f.datum) return false;
          const d = new Date(f.datum);
          return d.getFullYear() === currentYear && d.getMonth() === i;
        })
        .reduce((s, f) => s + (f.iznos_rsd || 0), 0);
      return { mes, iznos };
    });
  }, [fakture, currentYear]);

  return (
    <SectionCard>
      <Label>Prihodi {currentYear}</Label>
      <div className="h-36 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={16} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="mes"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="iznos" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={
                    i === currentMonth
                      ? ACCENT
                      : i < currentMonth
                      ? "rgba(74,222,128,0.35)"
                      : "rgba(255,255,255,0.07)"
                  }
                  style={
                    i === currentMonth
                      ? { filter: "drop-shadow(0 0 6px rgba(74,222,128,0.6))" }
                      : {}
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-white/30 mt-1 text-center">
        Svetlo zeleno = tekući mesec
      </p>
    </SectionCard>
  );
}

// ─── Test Samostalnosti ───────────────────────────────────────────────────────

function TestSamostalnosti() {
  const [open, setOpen] = useState(false);
  const [odgovori, setOdgovori] = useState<Record<number, boolean | null>>({});

  const daCount = Object.values(odgovori).filter((v) => v === true).length;
  const rizican = daCount >= 3;

  function toggle(i: number, val: boolean) {
    setOdgovori((prev) => ({
      ...prev,
      [i]: prev[i] === val ? null : val,
    }));
  }

  return (
    <SectionCard>
      <div className="flex items-center justify-between">
        <div>
          <Label>Test samostalnosti</Label>
          <p className="text-sm text-white font-medium">Proveri rizik</p>
          {Object.keys(odgovori).length > 0 && (
            <p
              className={`text-xs mt-0.5 font-semibold ${
                rizican ? "text-red-400" : "text-green-400"
              }`}
            >
              {rizican
                ? `⚠️ Visok rizik (${daCount}/9 DA odgovora)`
                : `✓ Nizak rizik (${daCount}/9 DA odgovora)`}
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            background: "rgba(74,222,128,0.12)",
            border: "1px solid rgba(74,222,128,0.3)",
            color: ACCENT,
          }}
        >
          {open ? "Zatvori" : "Pokreni test"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {TEST_PITANJA.map((p, i) => (
            <div
              key={i}
              className="rounded-xl p-3 border border-white/5 bg-white/3"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <p className="text-xs text-white/90 font-medium mb-2 leading-snug">
                {i + 1}. {p.pitanje}
              </p>
              <div className="flex gap-2 mb-2">
                {(["DA", "NE"] as const).map((label) => {
                  const val = label === "DA";
                  const active = odgovori[i] === val;
                  return (
                    <button
                      key={label}
                      onClick={() => toggle(i, val)}
                      className="px-4 py-1 rounded-lg text-xs font-bold transition-all duration-150"
                      style={
                        active
                          ? {
                              background:
                                val
                                  ? "rgba(239,68,68,0.25)"
                                  : "rgba(74,222,128,0.2)",
                              border: `1px solid ${val ? "rgba(239,68,68,0.5)" : "rgba(74,222,128,0.4)"}`,
                              color: val ? "#f87171" : ACCENT,
                            }
                          : {
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              color: "rgba(255,255,255,0.4)",
                            }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {odgovori[i] === true && (
                <p className="text-[11px] text-red-300/80 leading-snug">
                  ⚠️ {p.objasnjenje}
                </p>
              )}
            </div>
          ))}

          {Object.keys(odgovori).length === 9 && (
            <div
              className={`rounded-xl p-4 text-center text-sm font-semibold ${
                rizican
                  ? "bg-red-950/40 border border-red-500/30 text-red-300"
                  : "bg-green-950/30 border border-green-500/20 text-green-400"
              }`}
            >
              {rizican
                ? `⚠️ Visok rizik! ${daCount} od 9 faktora ukazuju na prikriveni radni odnos. Konsultuj pravnog savetnika.`
                : `✓ Nizak rizik. Tvoja poslovna samostalnost izgleda dobro.`}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartInsights({ onOpenQRModal }: SmartInsightsProps) {
  const [fakture, setFakture] = useState<KPOFaktura[]>([]);

  // Load on mount + listen for storage changes (reaktivnost)
  useEffect(() => {
    const load = () => setFakture(loadKPO());
    load();

    window.addEventListener("storage", load);
    // Also poll for same-tab changes (localStorage doesn't fire "storage" in same tab)
    const interval = setInterval(load, 2000);
    return () => {
      window.removeEventListener("storage", load);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <div
          className="w-1.5 h-5 rounded-full"
          style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }}
        />
        <h2 className="text-sm font-bold text-white tracking-wide uppercase">
          Smart Insights
        </h2>
      </div>

      <BurnRatePanel fakture={fakture} />
      <TaxCountdown onOpenQRModal={onOpenQRModal} />
      <MiniChart fakture={fakture} />
      <TestSamostalnosti />
    </div>
  );
}