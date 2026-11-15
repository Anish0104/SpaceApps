import { useMemo, useState } from "react";
import { rankInvestigations, reasonLabel, type Scenario } from "@flameatlas/engine";
import { dataset, scenarios, runsFor } from "../data";

/** Ranked investigations for a scenario, no question (question relevance = 0), computed by the engine. */
export function Atlas() {
  const [sc, setSc] = useState<Scenario>(scenarios.find((s) => s.id === "moon-challenge")!);

  const ranked = useMemo(() => {
    const inputs = dataset.investigations.map((inv) => ({ investigation: inv, runs: runsFor(inv.psiId), questionScore: 0 }));
    return rankInvestigations(inputs, sc);
  }, [sc]);

  return (
    <>
      <h1>Research Atlas</h1>
      <p className="small">Every NASA investigation, ranked for the chosen crew environment. Score is relevance, never fire risk.</p>

      <div className="presets" role="group" aria-label="Crew environment">
        {scenarios.map((s) => (
          <button key={s.id} className="pill" aria-pressed={sc.id === s.id} onClick={() => setSc(s)}>{s.name.split(" (")[0]}</button>
        ))}
      </div>

      <div className="card">
        {ranked.map((r, i) => {
          const inv = dataset.investigations.find((x) => x.psiId === r.psiId)!;
          const reasons = r.reasons.filter((x) => x !== "CANNOT_ASSESS_APPLICABILITY").slice(0, 3);
          return (
            <div className="item" key={r.psiId} style={{ alignItems: "flex-start" }}>
              <span className="rank">{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <h3 style={{ fontSize: 15 }}>{inv.acronym} <span className="faint small">{r.psiId}</span></h3>
                  <span className="score">{r.score === null ? "—" : r.score.toFixed(2)}</span>
                </div>
                <p className="small" style={{ margin: "2px 0 0" }}>{inv.name}</p>
                <div className="tags">
                  {r.cannotAssess
                    ? <span className="tag">cannot assess applicability</span>
                    : reasons.map((x) => <span className="tag" key={x}>{reasonLabel(x)}</span>)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="small faint" style={{ marginTop: 12 }}>
        "Cannot assess" means oxygen and pressure are both undocumented, so no score is shown — the card is still
        placed by what is documented.
      </p>
    </>
  );
}
