"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface PrihodZaGrafikon {
  datum: string;
  iznos_rsd: number;
  klijent?: string;
}

interface SmartInsightsProps {
  onOpenQRModal?: () => void;
  /** Prihodi iz Supabase tabele 'prihodi' za grafikon (iznos_rsd po datumu), za izabranu godinu */
  prihodi?: PrihodZaGrafikon[];
  /** Prihodi tekuće godine iz Supabase za burn-rate (prosek mesečnih) */
  prihodiTekucaGodina?: PrihodZaGrafikon[];
  /** Godina za naslov grafika (npr. "2025") */
  godina?: string;
}

const LIMIT_6M = 6_000_000;
const WARNING_THRESHOLD = 5_000_000;
const ACCENT = "var(--accent)";

const MONTHS_SR = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Avg","Sep","Okt","Nov","Dec"];
const MONTHS_SR_FULL = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","November","Decembar"];

import { daysUntilTaxDeadline, getNextTaxDeadline, isPastDeadlineForCurrentMonth } from "@/lib/tax-deadline";

function formatBroj(n: number): string {
  return new Intl.NumberFormat("sr-RS").format(Math.round(n));
}

const labelStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  margin: "0 0 12px 0",
  letterSpacing: 1,
};

// ─── Burn Rate (iz Supabase tabele 'prihodi', tekuća godina) ───────────────────

function BurnRatePanel({ prihodiTekucaGodina }: { prihodiTekucaGodina?: PrihodZaGrafikon[] }) {
  const { ukupno, prosecniMesecni, dostizeMonth, prekoracio } = useMemo(() => {
    const podaci = prihodiTekucaGodina ?? [];
    const ukupno = podaci.reduce((s, f) => s + (f.iznos_rsd ?? 0), 0);
    const prosecniMesecni = ukupno / 12;
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
    return { ukupno, prosecniMesecni, dostizeMonth, prekoracio: ukupno >= WARNING_THRESHOLD };
  }, [prihodiTekucaGodina]);

  const progress = Math.min((ukupno / LIMIT_6M) * 100, 100);
  const bojaBar = progress > 90 ? "#ff4d4d" : progress >= 70 ? "#ffcc00" : ACCENT;
  const remaining = Math.max(0, LIMIT_6M - ukupno);

  return (
    <div style={{
      background: prekoracio ? "#1a0a0a" : "var(--bg-card)",
      border: prekoracio ? "1px solid #ff4d4d40" : "1px solid var(--border)",
      borderRadius: 16, padding: 20, marginBottom: 12,
    }}>
      <p style={labelStyle}>🔥 BURN-RATE ANALIZA</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 28, fontWeight: 800, color: ACCENT, margin: "0 0 4px 0", textShadow: `0 0 20px ${ACCENT}40` }}>
            {formatBroj(ukupno)} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>RSD</span>
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
            Prosek: <span style={{ color: ACCENT }}>{formatBroj(prosecniMesecni)} RSD/mes</span>
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "0 0 2px 0" }}>Limit</p>
          <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 700, margin: 0 }}>6.000.000</p>
        </div>
      </div>
      <div style={{ background: "var(--bg-primary)", borderRadius: 8, height: 8, marginBottom: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: bojaBar, borderRadius: 8, boxShadow: `0 0 10px ${bojaBar}`, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
        <span>{progress.toFixed(1)}% od limita</span>
        <span>Još {formatBroj(remaining)} RSD do limita</span>
        <span>6.000.000 RSD</span>
      </div>
      {prekoracio ? (
        <div style={{ background: "#2a0a0a", border: "1px solid #ff4d4d40", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ color: "#ff6b6b", fontSize: 13, margin: 0 }}>⚠️ Prešao si 5M RSD — konsultuj računovođu!</p>
        </div>
      ) : prosecniMesecni > 0 ? (
        <div style={{ background: "var(--accent-dim)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ color: "#7affd4", fontSize: 13, margin: 0, fontWeight: 500 }}>
            Ako nastaviš ovim tempom, limit ćeš dostići u{" "}
            <span style={{ color: "#7affd4", fontWeight: 700 }}>{dostizeMonth}</span>.
          </p>
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Dodaj prihode u evidenciju da vidiš projekciju.</p>
      )}
    </div>
  );
}

// ─── Tax Countdown ────────────────────────────────────────────────────────────

function formatDeadlineDate(d: Date): string {
  return d.toLocaleDateString("sr-RS", { day: "numeric", month: "long", year: "numeric" });
}

function TaxCountdown({ onOpenQRModal }: { onOpenQRModal?: () => void }) {
  const days = daysUntilTaxDeadline();
  const deadline = getNextTaxDeadline();
  const isLate = isPastDeadlineForCurrentMonth();
  const urgent = !isLate && days <= 3;
  const soon = !isLate && days <= 7;
  const boja = isLate ? "#ff4d4d" : urgent ? "#ff4d4d" : soon ? "#ffcc00" : ACCENT;

  return (
    <div style={{
      background: isLate || urgent ? "#1a0a0a" : "var(--bg-card)",
      border: isLate || urgent ? "1px solid #ff4d4d40" : soon ? "1px solid #ffcc0060" : "1px solid var(--border)",
      borderRadius: 16, padding: 20, marginBottom: 12,
    }}>
      <p style={labelStyle}>⏰ PORESKI PODSETNIK</p>
      {isLate && (
        <div style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <p style={{ color: "#ff6b6b", fontSize: 13, fontWeight: 600, margin: 0 }}>Plaćanje kasni. Kamata je 0,0322% dnevno.</p>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 12, background: "var(--bg-primary)", border: `1px solid ${boja}30`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: boja, lineHeight: 1, textShadow: `0 0 15px ${boja}60` }}>{isLate ? Math.abs(days) : days}</span>
          <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>{isLate ? "dana kasno" : "dana"}</span>
        </div>
        <div>
          <p style={{ fontSize: 14, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
            {isLate ? (
              <>Plaćanje je <span style={{ color: boja, fontWeight: 700 }}>{Math.abs(days)} {Math.abs(days) === 1 ? "dan" : "dana"}</span> u zaostatku.</>
            ) : (
              <>Preostalo <span style={{ color: boja, fontWeight: 700 }}>{days} {days === 1 ? "dan" : "dana"}</span> za uplatu poreza i doprinosa.</>
            )}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Rok plaćanja: {formatDeadlineDate(deadline)}</p>
        </div>
      </div>
      {onOpenQRModal && (
        <button
          onClick={onOpenQRModal}
          style={{ width: "100%", background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: 10, padding: "11px", color: ACCENT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Otvori QR kodove za plaćanje →
        </button>
      )}
    </div>
  );
}

// ─── Mini Chart (mesečni prihodi iz Supabase prihodi, iznos_rsd) ───────────────

const LIGHT_GREEN = "var(--accent)";   // tekući mesec
const DARK_GREEN = "#008c6b";    // ostali meseci

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "0 0 4px 0" }}>{item.mesecPun}</p>
        <p style={{ color: LIGHT_GREEN, fontWeight: 700, fontSize: 13, margin: 0 }}>{formatBroj(payload[0].value)} RSD</p>
      </div>
    );
  }
  return null;
};

function formatYAxisRSD(value: number): string {
  return new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 }).format(value);
}

function MiniChart({ prihodi, godina }: { prihodi: PrihodZaGrafikon[]; godina?: string }) {
  const year = godina ? parseInt(godina, 10) : new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const data = useMemo(() => {
    return MONTHS_SR.map((mes, i) => {
      const iznos = prihodi
        .filter(f => {
          if (!f.datum) return false;
          const d = new Date(f.datum);
          return d.getFullYear() === year && d.getMonth() === i;
        })
        .reduce((s, f) => s + (f.iznos_rsd ?? 0), 0);
      return {
        mes,
        mesecPun: MONTHS_SR_FULL[i],
        iznos,
      };
    });
  }, [prihodi, year]);

  const maxIznos = useMemo(() => Math.max(...data.map(d => d.iznos), 0), [data]);
  const domainMax = maxIznos <= 0 ? 100000 : Math.ceil((maxIznos * 1.1) / 100000) * 100000;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 12 }}>
      <p style={labelStyle}>📊 PRIHODI {year}.</p>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={14} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxisRSD}
              domain={[0, domainMax]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="iznos" radius={[4, 4, 0, 0]} unit=" RSD">
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === currentMonth ? LIGHT_GREEN : DARK_GREEN}
                  style={i === currentMonth ? { filter: "drop-shadow(0 0 6px #00ffb360)" } : {}}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "8px 0 0 0", textAlign: "center" }}>
        Svetlo zeleno = tekući mesec
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SmartInsights({ onOpenQRModal, prihodi, prihodiTekucaGodina, godina }: SmartInsightsProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
        <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0, letterSpacing: 1 }}>SMART INSIGHTS</p>
      </div>
      <BurnRatePanel prihodiTekucaGodina={prihodiTekucaGodina ?? []} />
      <TaxCountdown onOpenQRModal={onOpenQRModal} />
      <MiniChart prihodi={prihodi ?? []} godina={godina} />
    </div>
  );
}