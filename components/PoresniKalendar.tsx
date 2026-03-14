"use client";

import { useState, useEffect } from "react";
import {
  Calendar, CheckCircle, AlertTriangle, Clock, FileText, ChevronRight,
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
  const ppOpo = getTaxDeadlineForMonth(year, 2);
  if (ppOpo >= danas) godisnji.push({ id:`pp-opo-${year}`, naziv:"Poreska prijava (PP OPO)", opis:"Podnošenje prijave za promene u toku prethodne godine", datum:ppOpo, tip:"godisnji" });
  return godisnji.sort((a,b) => a.datum.getTime()-b.datum.getTime()).slice(0,3);
}

function StatusBadge({ status, daysLeft }: { status: Status; daysLeft: number }) {
  const config = {
    hitno: { bg:"rgba(255,60,60,0.15)", border:"rgba(255,60,60,0.4)", color:"#ff4444", label:daysLeft<=0?"Danas!":`Hitno · ${daysLeft}d`, icon:<AlertTriangle size={11}/> },
    na_cekanju: { bg:"rgba(255,180,0,0.1)", border:"rgba(255,180,0,0.3)", color:"#ffb400", label:`${daysLeft} dana`, icon:<Clock size={11}/> },
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
    <div style={{ background:isUrgent?"rgba(255,60,60,0.04)":"var(--bg-primary)", border:`1px solid ${isUrgent?"rgba(255,60,60,0.25)":"var(--border)"}`, borderRadius:"16px", padding:"18px 20px", display:"flex", flexDirection:"column", gap:"12px", position:"relative", overflow:"hidden" }}>
      {isUrgent && <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg, transparent, #ff4444, transparent)" }} />}
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
        {status!=="placeno" && rok.tip==="mesecni" && (
          <button onClick={onOznaciPlaceno} style={{ background:"var(--accent-dim)", border:"1px solid rgba(0,255,179,0.25)", color:"var(--accent)", fontSize:"11px", fontWeight:600, padding:"6px 12px", borderRadius:"8px", cursor:"pointer", display:"flex", alignItems:"center", gap:"5px" }}>
            <CheckCircle size={12} /> Označi kao plaćeno
          </button>
        )}
        {status==="placeno" && <span style={{ color:"var(--accent)", fontSize:"12px", fontWeight:600 }}>✓ Mirni ste do 15. sledećeg meseca!</span>}
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

export default function PoresniKalendar({ ukupnoRsd=0, limit=6000000 }: { ukupnoRsd?:number; limit?:number }) {
  const currentYear = new Date().getFullYear();
  const [rokovi] = useState<Rok[]>(() => generateRokovi(currentYear));
  const [placanja, setPlacanja] = useState<PlacanjaState>({});

  useEffect(() => {
    try { setPlacanja(JSON.parse(localStorage.getItem("pausalac_placanja")||"{}")); } catch {}
  }, []);

  const oznaciKaoPlaceno = (rokId: string) => {
    const now = new Date();
    const kljuc = `${now.getFullYear()}-${now.getMonth()}-${rokId}`;
    const novo = {...placanja,[kljuc]:true};
    setPlacanja(novo);
    localStorage.setItem("pausalac_placanja", JSON.stringify(novo));
  };
  const jeePlaceno = (rokId: string, datum: Date) => !!placanja[`${datum.getFullYear()}-${datum.getMonth()}-${rokId}`];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ flex: "1 1 340px", minWidth: "280px" }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {rokovi.map(rok => <RokCard key={rok.id} rok={rok} placeno={jeePlaceno(rok.id, rok.datum)} onOznaciPlaceno={() => oznaciKaoPlaceno(rok.id)} />)}
          </div>
        </div>
        {isPastDeadlineForCurrentMonth() && (
          <div style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.3)", borderRadius: "14px", padding: "12px 16px", marginBottom: 12 }}>
            <p style={{ color: "#ff4444", fontSize: 12, fontWeight: 600, margin: 0 }}>⚠️ Plaćanje kasni. Kamata je 0,0322% dnevno.</p>
          </div>
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