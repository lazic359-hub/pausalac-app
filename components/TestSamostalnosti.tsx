"use client";

import { useMemo, useState } from "react";

type PrihodZaGrafikon = {
  datum: string;
  iznos_rsd: number;
  klijent?: string;
};

const ACCENT = "var(--accent)";

const labelStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  margin: "0 0 12px 0",
  letterSpacing: 1,
};

const TEST_PITANJA = [
  { pitanje: "Radiš isključivo za jednog klijenta?", objasnjenje: "Ako sav prihod dolazi od jednog klijenta, poreski organ može smatrati da si zapravo radnik, ne preduzetnik." },
  { pitanje: "Klijent ti određuje radno vreme?", objasnjenje: "Kontrola radnog vremena je ključni indikator radnog odnosa, što može dovesti do reklasifikacije." },
  { pitanje: "Klijent ti obezbeđuje opremu i alate?", objasnjenje: "Korišćenje klijentove opreme smanjuje tvoju poslovnu samostalnost." },
  { pitanje: "Nemaš sopstvenu poslovnu adresu?", objasnjenje: "Odsustvo poslovne adrese odvojene od klijenta može biti rizik." },
  { pitanje: "Ne možeš slobodno birati metode rada?", objasnjenje: "Preduzetnik sam odlučuje kako će posao izvršiti — ako ne možeš, to je rizik." },
  { pitanje: "Klijent ima pravo da raskine saradnju bez otkaznog roka?", objasnjenje: "Ovakve klauzule su karakteristika radnog, a ne poslovnog odnosa." },
  { pitanje: "Primaš fiksnu mesečnu naknadu bez veze sa obimom posla?", objasnjenje: "Fiksna plata bez projektne osnove liči na platu radnika." },
  { pitanje: "Ne možeš angažovati podizvođače bez odobrenja?", objasnjenje: "Pravi preduzetnik slobodno angažuje saradnike." },
  { pitanje: "Klijent ti plaća godišnji odmor ili bolovanje?", objasnjenje: "Ovo su prava radnika — ako ih primaš kao preduzetnik, to je ozbiljan rizik." },
];

export default function TestSamostalnosti({ prihodiTekucaGodina }: { prihodiTekucaGodina?: PrihodZaGrafikon[] }) {
  const [open, setOpen] = useState(false);
  const [odgovori, setOdgovori] = useState<Record<number, boolean | null>>({});

  const clientShare = useMemo(() => {
    const list = prihodiTekucaGodina ?? [];
    const total = list.reduce((s, f) => s + (f.iznos_rsd ?? 0), 0);
    if (total <= 0) return null;
    const byClient: Record<string, number> = {};
    list.forEach(f => {
      const name = (f.klijent || "").trim() || "Bez naziva";
      byClient[name] = (byClient[name] ?? 0) + (f.iznos_rsd ?? 0);
    });
    const entries = Object.entries(byClient).map(([name, sum]) => ({ name, sum, pct: (sum / total) * 100 }));
    const over70 = entries.find(e => e.pct > 70);
    return { total, entries, over70 };
  }, [prihodiTekucaGodina]);

  const daCount = Object.values(odgovori).filter(v => v === true).length;
  const rizican = daCount >= 3;
  const answered = Object.keys(odgovori).length;

  function toggle(i: number, val: boolean) {
    setOdgovori(prev => ({ ...prev, [i]: prev[i] === val ? null : val }));
  }

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 240 }}>
          <p style={labelStyle}>⚖️ TEST SAMOSTALNOSTI</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0" }}>Proveri rizik</p>
          {clientShare?.over70 && (
            <p style={{ fontSize: 12, color: "#ff6b6b", margin: "4px 0 0 0", fontWeight: 600 }}>
              Rizik: Klijent <strong>{clientShare.over70.name}</strong> čini više od 70% vaših prihoda (Tačka 1 testa samostalnosti).
            </p>
          )}
          {answered > 0 && (
            <p style={{ fontSize: 12, color: rizican ? "#ff6b6b" : ACCENT, margin: 0, fontWeight: 700 }}>
              {rizican ? `⚠️ Visok rizik (${daCount}/9)` : `✓ Nizak rizik (${daCount}/9)`}
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen(p => !p)}
          style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: 10, padding: "10px 16px", color: ACCENT, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {open ? "Zatvori" : "Pokreni test"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          {TEST_PITANJA.map((p, i) => (
            <div key={i} style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: "0 0 10px 0", fontWeight: 500 }}>
                {i + 1}. {p.pitanje}
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: odgovori[i] === true ? 8 : 0 }}>
                {(["DA", "NE"] as const).map(labelBtn => {
                  const val = labelBtn === "DA";
                  const active = odgovori[i] === val;
                  return (
                    <button
                      key={labelBtn}
                      onClick={() => toggle(i, val)}
                      style={{
                        padding: "6px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: active ? (val ? "#2a0a0a" : "var(--accent-dim)") : "var(--bg-card)",
                        border: active ? `1px solid ${val ? "#ff4d4d60" : "#00ffb340"}` : "1px solid var(--border)",
                        color: active ? (val ? "#ff6b6b" : ACCENT) : "var(--text-muted)",
                      }}
                    >
                      {labelBtn}
                    </button>
                  );
                })}
              </div>
              {odgovori[i] === true && (
                <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  ⚠️ {p.objasnjenje}
                </p>
              )}
            </div>
          ))}
          {answered === 9 && (
            <div style={{
              borderRadius: 12, padding: "16px", textAlign: "center", fontSize: 13, fontWeight: 700,
              background: rizican ? "#2a0a0a" : "var(--accent-dim)",
              border: `1px solid ${rizican ? "#ff4d4d40" : "#00ffb330"}`,
              color: rizican ? "#ff6b6b" : ACCENT,
            }}>
              {rizican
                ? `⚠️ Visok rizik! ${daCount}/9 faktora ukazuju na prikriveni radni odnos. Konsultuj pravnog savetnika.`
                : `✓ Nizak rizik. Tvoja poslovna samostalnost izgleda dobro.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

