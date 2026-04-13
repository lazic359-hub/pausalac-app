"use client";

import { Alert } from "@/components/Alert";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useState, useEffect, useRef } from "react";
import {
  Calendar, Check, CheckCircle, AlertTriangle, Clock, FileText, ChevronRight,
} from "lucide-react";
import { getTaxDeadlineForMonth, isPastDeadlineForCurrentMonth } from "@/lib/tax-deadline";

interface Rok {
  id: string;
  naziv: string;
  opis: string;
  datum: Date;
  tip: "mesecni" | "kvartal" | "godisnji";
}

type Status = "hitno" | "na_cekanju" | "placeno";
interface PlacanjaState { [key: string]: boolean; }

const STORAGE_KEY = "pausalac_poresni_kalendar_placanja_v1";

function getDaysLeft(datum: Date): number {
  const danas = new Date(); danas.setHours(0,0,0,0);
  const target = new Date(datum); target.setHours(0,0,0,0);
  return Math.ceil((target.getTime() - danas.getTime()) / (1000*60*60*24));
}
function formatDatum(datum: Date): string {
  return datum.toLocaleDateString("sr-RS", { day:"numeric", month:"long", year:"numeric" });
}
function getStatus(daysLeft: number, placeno: boolean): Status {
  if (placeno) return "placeno";
  if (daysLeft <= 3) return "hitno";
  return "na_cekanju";
}

function generateRokovi(year: number): Rok[] {
  const danas = new Date();
  danas.setHours(0, 0, 0, 0);
  const godisnji: Rok[] = [];
  for (let m = 0; m < 12; m++) {
    const datum = getTaxDeadlineForMonth(year, m);
    if (datum >= danas) godisnji.push({ id: `mesecni-${year}-${m}`, naziv: `Porez za ${datum.toLocaleDateString("sr-RS",{month:"long"})}`, opis: "Uplata doprinosa i poreza na prihod paušalca", datum, tip: "mesecni" });
  }
  const ekoTaksa = new Date(year, 3, 30);
  if (ekoTaksa >= danas) godisnji.push({ id:`eko-taksa-${year}`, naziv:"Eko-taksa", opis:"Rok za uplatu naknade za zaštitu životne sredine", datum:ekoTaksa, tip:"godisnji" });
  const godisnjaPpOpo = new Date(year, 4, 15);
  if (godisnjaPpOpo >= danas) godisnji.push({ id:`godisnja-pp-opo-${year}`, naziv:"Godišnja poreska prijava (PP OPO)", opis:"Podnošenje godišnje poreske prijave za prihode ostvarene u prethodnoj godini", datum:godisnjaPpOpo, tip:"godisnji" });
  return godisnji.sort((a,b) => a.datum.getTime()-b.datum.getTime()).slice(0,3);
}

function StatusBadge({ status, daysLeft }: { status: Status; daysLeft: number }) {
  const config = {
    hitno: { bg:"var(--alert-warning-bg)", border:"var(--alert-warning-border)", color:"var(--alert-warning-text)", label:daysLeft<=0?"Danas!":`Hitno · ${daysLeft}d`, icon:<AlertTriangle size={11}/> },
    na_cekanju: { bg:"var(--alert-info-bg)", border:"var(--alert-info-border)", color:"var(--alert-info-text)", label:`${daysLeft} dana`, icon:<Clock size={11}/> },
    placeno: { bg:"rgba(0,255,179,0.1)", border:"rgba(0,255,179,0.3)", color:"var(--accent)", label:"Plaćeno", icon:<CheckCircle size={11}/> },
  }[status];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:config.bg, border:`1px solid ${config.border}`, color:config.color, fontSize:"11px", fontWeight:700, padding:"4px 10px", borderRadius:"20px", whiteSpace:"nowrap" }}>
      {config.icon}{config.label}
    </span>
  );
}

function RokCard({ rok, placeno, onOznaciPlaceno }: { rok: Rok; placeno: boolean; onOznaciPlaceno: () => void }) {
  const daysLeft = getDaysLeft(rok.datum);
  const status = getStatus(daysLeft, placeno);
  const tipConfig = { mesecni:{color:"#6677ff",label:"Mesečno"}, kvartal:{color:"#ff9944",label:"Kvartalno"}, godisnji:{color:"#cc88ff",label:"Godišnje"} }[rok.tip];
  const isUrgent = status === "hitno";
  return (
    <div style={{ background:isUrgent?"var(--alert-warning-bg)":"var(--bg-primary)", border:`1px solid ${isUrgent?"var(--alert-warning-border)":"var(--border)"}`, borderRadius:"16px", padding:"18px 20px", display:"flex", flexDirection:"column", gap:"12px", position:"relative", overflow:"hidden" }}>
      {isUrgent && <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg, transparent, var(--alert-warning-solid), transparent)" }} />}
      {status==="placeno" && <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg, transparent, var(--accent), transparent)" }} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:"10px", fontWeight:700, color:tipConfig.color, textTransform:"uppercase", letterSpacing:"1.5px" }}>{tipConfig.label}</span>
          <h3 style={{ color:status==="placeno"?"var(--text-muted)":"var(--text-primary)", fontSize:"15px", fontWeight:600, margin:"4px 0", textDecoration:status==="placeno"?"line-through":"none" }}>{rok.naziv}</h3>
          <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:0, lineHeight:"1.5" }}>{rok.opis}</p>
        </div>
        <StatusBadge status={status} daysLeft={daysLeft} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <Calendar size={13} color="var(--text-muted)" />
          <span style={{ color:"var(--text-muted)", fontSize:"12px" }}>{formatDatum(rok.datum)}</span>
        </div>
        {status!=="placeno" && (
          <button onClick={onOznaciPlaceno} style={{ background:"var(--accent-dim)", border:"1px solid rgba(0,255,179,0.25)", color:"var(--accent)", fontSize:"11px", fontWeight:600, padding:"6px 12px", borderRadius:"8px", cursor:"pointer", display:"flex", alignItems:"center", gap:"5px" }}>
            <CheckCircle size={12} /> Označi kao plaćeno
          </button>
        )}
        {status==="placeno" && (
          <span style={{ display:"inline-flex", alignItems:"center", gap:6, color:"var(--accent)", fontSize:"12px", fontWeight:600 }}>
            <Check size={14} strokeWidth={2.5} aria-hidden />
            Mirni ste do 15. sledećeg meseca!
          </span>
        )}
      </div>
    </div>
  );
}

function QuickActionBtn({ icon, label, sublabel, accent, onClick }: { icon:React.ReactNode; label:string; sublabel:string; accent:string; onClick:()=>void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{ flex:"1 1 0", minWidth:"140px", background:hovered?"var(--bg-card-hover)":"var(--bg-primary)", border:`1px solid ${hovered?accent+"55":"var(--border)"}`, borderRadius:"16px", padding:"20px 16px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:"12px", transition:"all 0.25s", transform:hovered?"translateY(-2px)":"none", textAlign:"left" }}>
      <div style={{ width:"42px", height:"42px", background:`${accent}15`, border:`1px solid ${accent}30`, borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", color:accent }}>{icon}</div>
      <div>
        <p style={{ color:"var(--text-primary)", fontWeight:600, fontSize:"14px", margin:"0 0 3px 0" }}>{label}</p>
        <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:0, lineHeight:"1.4" }}>{sublabel}</p>
      </div>
      <ChevronRight size={14} color={hovered?accent:"var(--text-muted)"} style={{ alignSelf:"flex-end" }} />
    </button>
  );
}

const supabase = getSupabaseBrowser();

export default function PoresniKalendar({
  ukupnoRsd = 0,
  limit = 6000000,
  embedded,
  userId,
}: {
  ukupnoRsd?: number;
  limit?: number;
  embedded?: boolean;
  userId?: string | null;
}) {
  const currentYear = new Date().getFullYear();
  const [rokovi] = useState<Rok[]>(() => generateRokovi(currentYear));
  const [placanja, setPlacanja] = useState<PlacanjaState>({});
  const loadedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setPlacanja(parsed as PlacanjaState);
      } catch {
        /* noop */
      }
      return;
    }
    let cancelled = false;
    loadedForUser.current = null;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("poresni_kalendar_placanja")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      const p = data?.poresni_kalendar_placanja as PlacanjaState | null;
      if (p && typeof p === "object") {
        setPlacanja(p);
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as PlacanjaState;
            if (parsed && typeof parsed === "object") setPlacanja(parsed);
          }
        } catch {
          /* noop */
        }
      }
      loadedForUser.current = userId;
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(placanja));
      } catch {
        /* noop */
      }
      return;
    }
    if (loadedForUser.current !== userId) return;
    const t = setTimeout(() => {
      void supabase
        .from("profiles")
        .upsert({ id: userId, poresni_kalendar_placanja: placanja }, { onConflict: "id" });
    }, 500);
    return () => clearTimeout(t);
  }, [placanja, userId]);

  const oznaciKaoPlaceno = (rok: Rok) => {
    setPlacanja((prev) => ({ ...prev, [rok.id]: true }));
  };
  const jePlaceno = (rok: Rok) => !!placanja[rok.id];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: embedded ? 10 : 16 }}>
        <div style={{ flex: "1 1 340px", minWidth: "280px" }}>
          {!embedded && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "32px", height: "32px", background: "var(--accent-dim)", border: "1px solid rgba(0,255,179,0.25)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar size={16} color="var(--accent)" />
              </div>
              <div>
                <h3 style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: 700, margin: 0 }}>Sledeći rokovi</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: 0 }}>3 najbitnija predstojeća datuma</p>
              </div>
              <span style={{ marginLeft: "auto", background: "var(--accent-dim)", border: "1px solid rgba(0,255,179,0.2)", color: "var(--accent)", fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px" }}>{currentYear}</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: embedded ? 8 : "12px" }}>
            {rokovi.map((rok) => (
              <RokCard
                key={rok.id}
                rok={rok}
                placeno={jePlaceno(rok)}
                onOznaciPlaceno={() => oznaciKaoPlaceno(rok)}
              />
            ))}
          </div>
        </div>
        {isPastDeadlineForCurrentMonth() && (
          <Alert variant="danger" style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, borderRadius: 14, padding: "12px 16px" }}>
            Plaćanje kasni. Kamata je 0,0322% dnevno.
          </Alert>
        )}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <FileText size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: "1.6", margin: 0 }}>
            Rok plaćanja: <strong style={{ color: "var(--text-primary)" }}>do {rokovi[0]?.tip === "mesecni" ? formatDatum(rokovi[0].datum) : "15. u mesecu"}</strong> (ako je 15. vikend ili praznik, pomera se na naredni radni dan). Kasno plaćanje povlači kamatu od 0,0322% dnevno.
          </p>
        </div>
      </div>
    </div>
  );
}