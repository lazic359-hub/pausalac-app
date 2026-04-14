"use client";

import { Alert } from "@/components/Alert";
import { useMemo, useState, useEffect } from "react";
import { BarChart3, Bell, Flame } from "lucide-react";
import { getKpoLimitRsdFromStorage, getPocetniPrihodZaGodinu } from "@/lib/profile";
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
  /** Sakrij naslov „SMART INSIGHTS“ (npr. kada je komponenta u sekciji sa sopstvenim naslovom) */
  hideOuterTitle?: boolean;
  /** Godišnji limit iz profila (KPO); podrazumevano iz localStorage */
  limitRsd?: number;
}

const FALLBACK_LIMIT = 6_000_000;
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

function BurnRatePanel({ prihodiTekucaGodina, limit6m }: { prihodiTekucaGodina?: PrihodZaGrafikon[]; limit6m: number }) {
  const tekucaY = new Date().getFullYear();
  const { ukupno, prosecniMesecni, dostizeMonth, prekoracio5M, prekoracio6M } = useMemo(() => {
    const podaci = prihodiTekucaGodina ?? [];
    const izBaze = podaci.reduce((s, f) => s + (f.iznos_rsd ?? 0), 0);
    const pocetni = getPocetniPrihodZaGodinu(tekucaY);
    const ukupno = izBaze + pocetni;
    const prosecniMesecni = ukupno / 12;
    let dostizeMonth = "—";
    if (prosecniMesecni > 0) {
      const preostalo = limit6m - ukupno;
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
      prekoracio5M: ukupno >= WARNING_THRESHOLD,
      prekoracio6M: ukupno >= limit6m,
    };
  }, [prihodiTekucaGodina, limit6m, tekucaY]);

  const progress = limit6m > 0 ? Math.min((ukupno / limit6m) * 100, 100) : 0;
  const bojaBar =
    progress > 90
      ? "var(--alert-danger-solid)"
      : progress >= 70
        ? "var(--alert-warning-solid)"
        : ACCENT;
  const remaining = Math.max(0, limit6m - ukupno);

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 16, padding: 20, marginBottom: 12,
    }}>
      <p style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
        <Flame size={14} strokeWidth={2} color="var(--icon-amber)" aria-hidden />
        BURN-RATE ANALIZA
      </p>
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
          <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 700, margin: 0 }}>{formatBroj(limit6m)}</p>
        </div>
      </div>
      <div style={{ background: "var(--bg-primary)", borderRadius: 8, height: 8, marginBottom: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: bojaBar, borderRadius: 8, boxShadow: `0 0 10px ${bojaBar}`, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
        <span>{progress.toFixed(1)}% od limita</span>
        <span>Još {formatBroj(remaining)} RSD do limita</span>
        <span>{formatBroj(limit6m)} RSD</span>
      </div>
      {prekoracio6M ? (
        <Alert variant="danger">
          Prekoračili ste godišnji limit od {formatBroj(limit6m)} RSD — obavezno konsultuj računovođu.
        </Alert>
      ) : prekoracio5M ? (
        <Alert variant="warning">
          Prešao si 5.000.000 RSD — vredi konsultovati računovođu pre daljeg rasta prihoda.
        </Alert>
      ) : prosecniMesecni > 0 ? (
        <Alert variant="info">
          Ako nastaviš ovim tempom, limit ćeš dostići u{" "}
          <span style={{ fontWeight: 700 }}>{dostizeMonth}</span>.
        </Alert>
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
  const boja = isLate
    ? "var(--alert-danger-solid)"
    : urgent
      ? "var(--alert-warning-solid)"
      : soon
        ? "var(--alert-warning-solid)"
        : ACCENT;
  const okvirBrojaca = isLate
    ? "var(--alert-danger-border)"
    : urgent || soon
      ? "var(--alert-warning-border)"
      : "var(--border)";

  return (
    <div style={{
      background: isLate ? "var(--alert-danger-bg)" : "var(--bg-card)",
      border: isLate
        ? "1px solid var(--alert-danger-border)"
        : urgent || soon
          ? "1px solid var(--alert-warning-border)"
          : "1px solid var(--border)",
      borderRadius: 16, padding: 20, marginBottom: 12,
    }}>
      <p style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
        <Bell size={14} strokeWidth={2} color="var(--icon-violet)" aria-hidden />
        PORESKI PODSETNIK
      </p>
      {isLate && (
        <Alert variant="danger" style={{ marginBottom: 14, fontWeight: 600 }}>
          Plaćanje kasni. Kamata je 0,0322% dnevno.
        </Alert>
      )}
      {!isLate && urgent && (
        <Alert variant="warning" style={{ marginBottom: 14 }}>
          Rok za uplatu je za {days} {days === 1 ? "dan" : "dana"} — pripremi uplatu na vreme.
        </Alert>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 12, background: "var(--bg-primary)", border: `1px solid ${okvirBrojaca}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: boja, lineHeight: 1, textShadow: isLate ? "0 0 14px rgba(220, 90, 90, 0.35)" : urgent || soon ? "0 0 14px rgba(234, 179, 8, 0.25)" : "0 0 12px rgba(0, 255, 179, 0.2)" }}>{isLate ? Math.abs(days) : days}</span>
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
      <p style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
        <BarChart3 size={14} strokeWidth={2} color="var(--icon-cyan)" aria-hidden />
        PRIHODI {year}.
      </p>
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
                  style={i === currentMonth ? { filter: "drop-shadow(0 0 6px #00C89660)" } : {}}
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

export default function SmartInsights({ onOpenQRModal, prihodi, prihodiTekucaGodina, godina, hideOuterTitle, limitRsd }: SmartInsightsProps) {
  const [limitSync, setLimitSync] = useState(() => limitRsd ?? getKpoLimitRsdFromStorage());
  useEffect(() => {
    if (limitRsd != null && limitRsd > 0) setLimitSync(limitRsd);
  }, [limitRsd]);
  useEffect(() => {
    const sync = () => setLimitSync(limitRsd ?? getKpoLimitRsdFromStorage());
    sync();
    window.addEventListener("pausalac-profil-updated", sync);
    return () => window.removeEventListener("pausalac-profil-updated", sync);
  }, [limitRsd]);
  const limit6m = limitSync > 0 ? limitSync : FALLBACK_LIMIT;

  return (
    <div style={{ marginTop: hideOuterTitle ? 0 : 16 }}>
      {!hideOuterTitle && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
          <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0, letterSpacing: 1 }}>SMART INSIGHTS</p>
        </div>
      )}
      <BurnRatePanel prihodiTekucaGodina={prihodiTekucaGodina ?? []} limit6m={limit6m} />
      <TaxCountdown onOpenQRModal={onOpenQRModal} />
      <MiniChart prihodi={prihodi ?? []} godina={godina} />
    </div>
  );
}