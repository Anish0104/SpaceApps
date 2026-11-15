import { useMemo } from "react";
import { rankInvestigations, reasonLabel } from "@flameatlas/engine";
import { useStore } from "../store";
import { dataset, runsFor, invById } from "../data";

/** Research Atlas: every investigation ranked for the active environment. Score is relevance, never
 *  fire risk. Save adds a record to the on-device Saved tab. */
export function Atlas({ onOpenAsk }: { onOpenAsk: () => void }) {
  const { scenario: sc, isSaved, toggleSave } = useStore();

  const ranked = useMemo(() => {
    const inputs = dataset.investigations.map((inv) => ({ investigation: inv, runs: runsFor(inv.psiId), questionScore: 0 }));
    return rankInvestigations(inputs, sc);
  }, [sc]);

  return (
    <>
      <div className="eyebrow">Research Atlas · {sc.name.split(" (")[0]}</div>
      <h1 className="h-xl">Ranked investigations</h1>
      <p className="small">Relevance to the chosen environment, from the rules engine. Score is relevance, never fire risk.</p>

      <div className="card" style={{ marginTop: 10 }}>
        {ranked.map((r, n) => {
          const inv = invById(r.psiId)!;
          const reasons = r.reasons.filter((x) => x !== "CANNOT_ASSESS_APPLICABILITY").slice(0, 3);
          const saved = isSaved(r.psiId);
          return (
            <div className="item" key={r.psiId}>
              <span className="rank">{n + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <div style={{ fontWeight: 700 }}>{inv.acronym} <span className="faint small mono">{r.psiId}</span></div>
                  <span className="score mono">{r.score === null ? "—" : r.score.toFixed(2)}</span>
                </div>
                <p className="small" style={{ margin: "2px 0 0" }}>{inv.name}</p>
                <div className="tags">
                  {r.cannotAssess
                    ? <span className="tag">cannot assess applicability</span>
                    : reasons.map((x) => <span className="tag" key={x}>{reasonLabel(x)}</span>)}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className={saved ? "btn ice" : "btn ghost"} style={{ width: "auto", minHeight: 36, padding: "0 12px", fontSize: 13 }} onClick={() => toggleSave(r.psiId)} aria-pressed={saved}>
                    {saved ? "✓ Saved" : "Save to brief"}
                  </button>
                  <a className="src" href={inv.url} target="_blank" rel="noreferrer">PSI ↗</a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="small faint" style={{ marginTop: 12 }}>
        "Cannot assess" means oxygen and pressure are both undocumented, so no score — the card is still placed by what is documented.
      </p>
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={onOpenAsk}>Ask a question instead</button>
    </>
  );
}
