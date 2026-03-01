"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  BookOpen,
  Plus,
  Archive,
  X,
  ChevronRight,
  Zap,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rok {
  id: string;
  naziv: string;
  opis: string;
  datum: Date;
  tip: "mesecni" | "kvartal" | "godisnji";
}

type Status = "hitno" | "na_cekanju" | "placeno";

interface PlacanjaState {
  [key: string]: boolean; // key = "YYYY-MM-rokId"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysLeft(datum: Date): number {
  const danas = new Date();
  danas.setHours(0, 0, 0, 0);
  const target = new Date(datum);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - danas.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDatum(datum: Date): string {
  return datum.toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getStatus(daysLeft: number, placeno: boolean): Status {
  if (placeno) return "placeno";
  if (daysLeft <= 3) return "hitno";
  return "na_cekanju";
}

function generateRokovi2026(): Rok[] {
  const danas = new Date();
  const godisnji: Rok[] = [];

  // Mesečni porezi — 15. u mesecu za svaki mesec od danas
  for (let m = 0; m < 12; m++) {
    const datum = new Date(2026, m, 15);
    if (datum >= danas) {
      godisnji.push({
        id: `mesecni-2026-${m}`,
        naziv: `Porez za ${datum.toLocaleDateString("sr-RS", { month: "long" })}`,
        opis: "Uplata doprinosa i poreza na prihod paušalca",
        datum,
        tip: "mesecni",
      });
    }
  }

  // Eko-taksa — 30. april 2026.
  const ekoTaksa = new Date(2026, 3, 30);
  if (ekoTaksa >= danas) {
    godisnji.push({
      id: "eko-taksa-2026",
      naziv: "Eko-taksa",
      opis: "Rok za uplatu naknade za zaštitu i unapređenje životne sredine",
      datum: ekoTaksa,
      tip: "godisnji",
    });
  }

  // Poreska prijava (PP OPO) — 15. mart 2026.
  const ppOpo = new Date(2026, 2, 15);
  if (ppOpo >= danas) {
    godisnji.push({
      id: "pp-opo-2026",
      naziv: "Poreska prijava (PP OPO)",
      opis: "Podnošenje prijave za promene u toku prethodne godine",
      datum: ppOpo,
      tip: "godisnji",
    });
  }

  // Sortiramo i uzimamo 3 najbliža
  return godisnji
    .sort((a, b) => a.datum.getTime() - b.datum.getTime())
    .slice(0, 3);
}

// ─── Uputstvo za početnike modal ──────────────────────────────────────────────

function UputstvoModal({ onClose }: { onClose: () => void }) {
  const tacke = [
    {
      br: "01",
      naslov: "Ko je paušalac?",
      tekst:
        "Paušalni preduzetnik plaća porez na osnovu rešenja Poreske uprave — ne na osnovu stvarnog prihoda. Iznos je fiksiran i isti svaki mesec.",
    },
    {
      br: "02",
      naslov: "Kada i šta plaćaš?",
      tekst:
        "Do 15. u mesecu plaćaš doprinose (PIO, zdravstvo, nezaposlenost) i porez na prihod. Sve uplatnice dobijaš od svog računovođe ili generišeš u ePorezi portalu.",
    },
    {
      br: "03",
      naslov: "KPO knjiga",
      tekst:
        "Obavezan si da vodiš Knjigu prihoda (KPO). Svaka faktura mora biti upisana. Ova aplikacija vodi KPO automatski na osnovu tvojih faktura.",
    },
    {
      br: "04",
      naslov: "Limit prihoda",
      tekst:
        "Za 2026. godinu limit za paušalno oporezivanje je 6.000.000 RSD godišnje. Ako pređeš limit, moraš da pređeš na realni sistem.",
    },
    {
      br: "05",
      naslov: "Eko-taksa",
      tekst:
        "Jednom godišnje (april) plaćaš ekološku naknadu. Iznos zavisi od opštine i delatnosti — obično između 500 i 5.000 RSD.",
    },
    {
      br: "06",
      naslov: "Fakture i PDV",
      tekst:
        "Paušalci NISU u sistemu PDV-a (osim ako se dobrovoljno prijave). Ne naplaćuješ PDV i ne možeš da ga odbijaš.",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f1318",
          border: "1px solid #1e2530",
          borderRadius: "20px",
          maxWidth: "620px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "32px",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <BookOpen size={20} color="#00ffb3" />
              <span style={{ color: "#00ffb3", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
                Vodič
              </span>
            </div>
            <h2 style={{ color: "#f0f4f8", fontSize: "22px", fontWeight: 700, margin: 0 }}>
              Uputstvo za početnike
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#1a2030",
              border: "1px solid #2a3040",
              borderRadius: "10px",
              color: "#8899aa",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              transition: "all 0.2s",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tačke */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {tacke.map((t) => (
            <div
              key={t.br}
              style={{
                background: "#141920",
                border: "1px solid #1e2530",
                borderRadius: "14px",
                padding: "18px 20px",
                display: "flex",
                gap: "16px",
              }}
            >
              <span
                style={{
                  color: "#00ffb3",
                  fontSize: "11px",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  minWidth: "24px",
                  paddingTop: "2px",
                }}
              >
                {t.br}
              </span>
              <div>
                <p style={{ color: "#f0f4f8", fontWeight: 600, fontSize: "14px", margin: "0 0 4px 0" }}>
                  {t.naslov}
                </p>
                <p style={{ color: "#6b7d8f", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>
                  {t.tekst}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: "#3a4a5a", fontSize: "12px", textAlign: "center", marginTop: "24px", marginBottom: 0 }}>
          Za detaljnija pitanja konsultuj svog računovođu ili Poresku upravu.
        </p>
      </div>
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, daysLeft }: { status: Status; daysLeft: number }) {
  const config = {
    hitno: {
      bg: "rgba(255, 60, 60, 0.15)",
      border: "rgba(255, 60, 60, 0.4)",
      color: "#ff4444",
      label: daysLeft <= 0 ? "Danas!" : `Hitno · ${daysLeft}d`,
      icon: <AlertTriangle size={11} />,
    },
    na_cekanju: {
      bg: "rgba(255, 180, 0, 0.1)",
      border: "rgba(255, 180, 0, 0.3)",
      color: "#ffb400",
      label: `${daysLeft} dana`,
      icon: <Clock size={11} />,
    },
    placeno: {
      bg: "rgba(0, 255, 179, 0.1)",
      border: "rgba(0, 255, 179, 0.3)",
      color: "#00ffb3",
      label: "Plaćeno",
      icon: <CheckCircle size={11} />,
    },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: "11px",
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: "20px",
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// ─── Rok Card ─────────────────────────────────────────────────────────────────

function RokCard({
  rok,
  placeno,
  onOznaciPlaceno,
}: {
  rok: Rok;
  placeno: boolean;
  onOznaciPlaceno: () => void;
}) {
  const daysLeft = getDaysLeft(rok.datum);
  const status = getStatus(daysLeft, placeno);

  const tipConfig = {
    mesecni: { color: "#6677ff", label: "Mesečno" },
    kvartal: { color: "#ff9944", label: "Kvartalno" },
    godisnji: { color: "#cc88ff", label: "Godišnje" },
  }[rok.tip];

  const isUrgent = status === "hitno";

  return (
    <div
      style={{
        background: isUrgent ? "rgba(255,60,60,0.04)" : "#111620",
        border: `1px solid ${isUrgent ? "rgba(255,60,60,0.25)" : "#1e2530"}`,
        borderRadius: "16px",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "border-color 0.3s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Urgent glow line */}
      {isUrgent && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, #ff4444, transparent)",
          }}
        />
      )}
      {status === "placeno" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, #00ffb3, transparent)",
          }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: tipConfig.color,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}
            >
              {tipConfig.label}
            </span>
          </div>
          <h3
            style={{
              color: status === "placeno" ? "#4a6055" : "#e8f0f8",
              fontSize: "15px",
              fontWeight: 600,
              margin: "0 0 4px 0",
              textDecoration: status === "placeno" ? "line-through" : "none",
            }}
          >
            {rok.naziv}
          </h3>
          <p style={{ color: "#4a5a6a", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>
            {rok.opis}
          </p>
        </div>
        <StatusBadge status={status} daysLeft={daysLeft} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Calendar size={13} color="#3a4a5a" />
          <span style={{ color: "#3a4a5a", fontSize: "12px" }}>{formatDatum(rok.datum)}</span>
        </div>

        {status !== "placeno" && rok.tip === "mesecni" && (
          <button
            onClick={onOznaciPlaceno}
            style={{
              background: "rgba(0,255,179,0.08)",
              border: "1px solid rgba(0,255,179,0.25)",
              color: "#00ffb3",
              fontSize: "11px",
              fontWeight: 600,
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,179,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,179,0.08)";
            }}
          >
            <CheckCircle size={12} />
            Označi kao plaćeno
          </button>
        )}

        {status === "placeno" && (
          <span style={{ color: "#00ffb3", fontSize: "12px", fontWeight: 600 }}>
            ✓ Mirni ste do 15. sledećeg meseca!
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Quick Action Button ───────────────────────────────────────────────────────

function QuickActionBtn({
  icon,
  label,
  sublabel,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  accent: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 0",
        minWidth: "140px",
        background: hovered ? "#161c26" : "#111620",
        border: `1px solid ${hovered ? accent + "55" : "#1e2530"}`,
        borderRadius: "16px",
        padding: "20px 16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "12px",
        transition: "all 0.25s",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? `0 8px 24px ${accent}18` : "none",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          background: `${accent}15`,
          border: `1px solid ${accent}30`,
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          transition: "all 0.25s",
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ color: "#e8f0f8", fontWeight: 600, fontSize: "14px", margin: "0 0 3px 0" }}>
          {label}
        </p>
        <p style={{ color: "#4a5a6a", fontSize: "11px", margin: 0, lineHeight: "1.4" }}>
          {sublabel}
        </p>
      </div>
      <ChevronRight
        size={14}
        color={hovered ? accent : "#2a3545"}
        style={{ alignSelf: "flex-end", transition: "color 0.2s" }}
      />
    </button>
  );
}

// ─── Personalizovani Pozdrav ──────────────────────────────────────────────────

function PersonalizovaniPozdrav({ ukupnoRsd, limit }: { ukupnoRsd: number; limit: number }) {
  const [imeFirme, setImeFirme] = useState("Firmo");

  useEffect(() => {
    try {
      const profil = JSON.parse(localStorage.getItem("pausalac_profil") || "{}");
      if (profil.naziv) setImeFirme(profil.naziv);
    } catch {}
  }, []);

  const danas = new Date().toLocaleDateString("sr-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const procenat = limit > 0 ? (ukupnoRsd / limit) * 100 : 0;
  const stanje = procenat >= 80 ? "kritično" : "stabilno";
  const stanjeColor = procenat >= 80 ? "#ff4444" : "#00ffb3";
  const stanjeIcon = procenat >= 80 ? <AlertTriangle size={14} /> : <Shield size={14} />;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f1520 0%, #111820 100%)",
        border: "1px solid #1e2530",
        borderRadius: "20px",
        padding: "24px 28px",
        marginBottom: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Bg decoration */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          background: "radial-gradient(circle, rgba(0,255,179,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p style={{ color: "#4a5a6a", fontSize: "12px", margin: "0 0 6px 0", letterSpacing: "0.5px" }}>
            {danas.charAt(0).toUpperCase() + danas.slice(1)}
          </p>
          <h2 style={{ color: "#f0f4f8", fontSize: "22px", fontWeight: 700, margin: "0 0 4px 0" }}>
            Zdravo,{" "}
            <span style={{ color: "#00ffb3" }}>{imeFirme}</span>!
          </h2>
          <p style={{ color: "#5a6a7a", fontSize: "13px", margin: 0 }}>
            Pregled tvojih obaveza i aktivnosti.
          </p>
        </div>

        <div
          style={{
            background: `${stanjeColor}10`,
            border: `1px solid ${stanjeColor}30`,
            borderRadius: "14px",
            padding: "14px 18px",
            textAlign: "center",
            minWidth: "160px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              color: stanjeColor,
              marginBottom: "4px",
            }}
          >
            {stanjeIcon}
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>
              {stanje}
            </span>
          </div>
          <p style={{ color: "#3a4a5a", fontSize: "11px", margin: 0, lineHeight: "1.4" }}>
            u odnosu na godišnji limit
          </p>
          <div
            style={{
              marginTop: "8px",
              height: "4px",
              background: "#1a2030",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(procenat, 100)}%`,
                background: stanjeColor,
                borderRadius: "2px",
                transition: "width 0.8s ease",
              }}
            />
          </div>
          <p style={{ color: "#3a4a5a", fontSize: "10px", margin: "4px 0 0 0" }}>
            {procenat.toFixed(1)}% od 6.000.000 RSD
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Glavna komponenta ────────────────────────────────────────────────────────

interface PoresniKalendarProps {
  ukupnoRsd?: number;
  limit?: number;
}

export default function PoresniKalendar({
  ukupnoRsd = 0,
  limit = 6000000,
}: PoresniKalendarProps) {
  const router = useRouter();
  const [rokovi] = useState<Rok[]>(generateRokovi2026);
  const [placanja, setPlacanja] = useState<PlacanjaState>({});
  const [showUputstvo, setShowUputstvo] = useState(false);

  // Load iz localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pausalac_placanja") || "{}");
      setPlacanja(saved);
    } catch {}
  }, []);

  const oznaciKaoPlaceno = (rokId: string) => {
    const now = new Date();
    const kljuc = `${now.getFullYear()}-${now.getMonth()}-${rokId}`;
    const novo = { ...placanja, [kljuc]: true };
    setPlacanja(novo);
    localStorage.setItem("pausalac_placanja", JSON.stringify(novo));
  };

  const jeePlaceno = (rokId: string, datum: Date): boolean => {
    const kljuc = `${datum.getFullYear()}-${datum.getMonth()}-${rokId}`;
    return !!placanja[kljuc];
  };

  return (
    <>
      {showUputstvo && <UputstvoModal onClose={() => setShowUputstvo(false)} />}

      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
        {/* Pozdrav */}
        <PersonalizovaniPozdrav ukupnoRsd={ukupnoRsd} limit={limit} />

        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* ── Leva kolona: Rokovi ── */}
          <div style={{ flex: "1 1 340px", minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  background: "rgba(0,255,179,0.1)",
                  border: "1px solid rgba(0,255,179,0.25)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={16} color="#00ffb3" />
              </div>
              <div>
                <h3 style={{ color: "#e8f0f8", fontSize: "15px", fontWeight: 700, margin: 0 }}>
                  Sledeći rokovi
                </h3>
                <p style={{ color: "#3a4a5a", fontSize: "11px", margin: 0 }}>
                  3 najbitnija predstojeća datuma
                </p>
              </div>
              <span
                style={{
                  marginLeft: "auto",
                  background: "rgba(0,255,179,0.08)",
                  border: "1px solid rgba(0,255,179,0.2)",
                  color: "#00ffb3",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "20px",
                  letterSpacing: "0.5px",
                }}
              >
                2026
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {rokovi.map((rok) => (
                <RokCard
                  key={rok.id}
                  rok={rok}
                  placeno={jeePlaceno(rok.id, rok.datum)}
                  onOznaciPlaceno={() => oznaciKaoPlaceno(rok.id)}
                />
              ))}
            </div>
          </div>

          {/* ── Desna kolona: Brze akcije ── */}
          <div style={{ flex: "1 1 280px", minWidth: "240px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  background: "rgba(102,119,255,0.1)",
                  border: "1px solid rgba(102,119,255,0.25)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={16} color="#6677ff" />
              </div>
              <div>
                <h3 style={{ color: "#e8f0f8", fontSize: "15px", fontWeight: 700, margin: 0 }}>
                  Brze akcije
                </h3>
                <p style={{ color: "#3a4a5a", fontSize: "11px", margin: 0 }}>
                  Najčešće korišćene opcije
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <QuickActionBtn
                icon={<Plus size={18} />}
                label="Nova Faktura"
                sublabel="Kreiranje i PDF export"
                accent="#00ffb3"
                onClick={() => router.push("/faktura")}
              />
              <QuickActionBtn
                icon={<Archive size={18} />}
                label="Generiši KPO"
                sublabel="Pregled i export knjige"
                accent="#6677ff"
                onClick={() => router.push("/kpo")}
              />
              <QuickActionBtn
                icon={<BookOpen size={18} />}
                label="Uputstvo za početnike"
                sublabel="Osnovna pravila paušala"
                accent="#ff9944"
                onClick={() => setShowUputstvo(true)}
              />
            </div>

            {/* Mini info box */}
            <div
              style={{
                marginTop: "16px",
                background: "#0d1118",
                border: "1px solid #1a2030",
                borderRadius: "14px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <FileText size={14} color="#3a4a5a" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p style={{ color: "#3a4a5a", fontSize: "11px", lineHeight: "1.6", margin: 0 }}>
                Porez se plaća <strong style={{ color: "#4a5a6a" }}>do 15. u mesecu</strong> za tekući mesec. 
                Kasno plaćanje povlači kamatu od 0,0322% dnevno.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}