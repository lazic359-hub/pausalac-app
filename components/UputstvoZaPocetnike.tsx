"use client";

import { BookOpen, X } from "lucide-react";

const TACKE = [
  { br: "01", naslov: "Ko je paušalac?", tekst: "Paušalni preduzetnik plaća porez na osnovu rešenja Poreske uprave — ne na osnovu stvarnog prihoda. Iznos je fiksiran i isti svaki mesec." },
  { br: "02", naslov: "Kada i šta plaćaš?", tekst: "Do 15. u mesecu plaćaš doprinose (PIO, zdravstvo, nezaposlenost) i porez na prihod." },
  { br: "03", naslov: "KPO knjiga", tekst: "Obavezan si da vodiš Knjigu prihoda (KPO). Svaka faktura mora biti upisana." },
  { br: "04", naslov: "Limit prihoda", tekst: "Za 2026. godinu limit za paušalno oporezivanje je 6.000.000 RSD godišnje." },
  { br: "05", naslov: "Eko-taksa", tekst: "Jednom godišnje (april) plaćaš ekološku naknadu. Iznos zavisi od opštine i delatnosti." },
  { br: "06", naslov: "Fakture i PDV", tekst: "Paušalci NISU u sistemu PDV-a. Ne naplaćuješ PDV i ne možeš da ga odbijaš." },
];

export function UputstvoModal({ onClose }: { onClose: () => void }) {
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
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          maxWidth: "620px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "32px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <BookOpen size={20} color="var(--accent)" />
              <span style={{ color: "var(--accent)", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
                Vodič
              </span>
            </div>
            <h2 style={{ color: "var(--text-primary)", fontSize: "22px", fontWeight: 700, margin: 0 }}>
              Uputstvo za početnike
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {TACKE.map((t) => (
            <div
              key={t.br}
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "18px 20px",
                display: "flex",
                gap: "16px",
              }}
            >
              <span style={{ color: "var(--accent)", fontSize: "11px", fontWeight: 800, fontFamily: "monospace", minWidth: "24px" }}>
                {t.br}
              </span>
              <div>
                <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "14px", margin: "0 0 4px 0" }}>{t.naslov}</p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{t.tekst}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "12px", textAlign: "center", marginTop: "24px", marginBottom: 0 }}>
          Za detaljnija pitanja konsultuj svog računovođu ili Poresku upravu.
        </p>
      </div>
    </div>
  );
}
