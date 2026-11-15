import { useMemo, useState } from "react";
import { rankInvestigations, reasonLabel, type SafetyRole } from "@flameatlas/engine";
import { useStore } from "../store";
import { dataset, runsFor, invById } from "../data";

const ROLES: { id: SafetyRole; label: string }[] = [
  { id: "prevention", label: "Prevention" }, { id: "detection", label: "Detection" },
  { id: "suppression", label: "Suppression" }, { id: "physics", label: "Flame physics" },
];

/** Atlas: search the investigations, ranked for the active environment. One search field, optional
 *  role filters, a count — and Save. Relevance, never fire risk. */
export function Atlas() {
  const { scenario: sc, isSaved, toggleSave } = useStore();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<SafetyRole | null>(null);

  const ranked = useMemo(() => {
    const inputs = dataset.investigations.map((inv) => ({ investigation: inv, runs: runsFor(inv.psiId), questionScore: 0 }));
    return rankInvestigations(inputs, sc);
  }, [sc]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ranked.filter((r) => {
      const inv = invById(r.psiId)!;
      if (role && inv.safetyRole !== role) return false;
      if (!needle) return true;
      const hay = `${inv.acronym} ${inv.name} ${r.psiId} ${runsFor(r.psiId).map((x) => x.material.value ?? "").join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [ranked, q, role]);

  return (
    <div className="page">
      <h1 className="title">Atlas</h1>

      <div className="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Investigations or materials" aria-label="Search" inputMode="search" />
        {q && (
          <button className="clear" aria-label="Clear" onClick={() => setQ("")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
      </div>

      <div className="chips">
        {ROLES.map((r) => (
          <button key={r.id} className={`chip${role === r.id ? " on" : ""}`} aria-pressed={role === r.id} onClick={() => setRole(role === r.id ? null : r.id)}>{r.label}</button>
        ))}
      </div>

      <div className="count" aria-live="polite">{results.length} of {ranked.length} · {sc.name.split(" (")[0]}</div>

      <div className="group">
        {results.length === 0 && <p className="caption" style={{ padding: 16, margin: 0 }}>No investigations match. Try a different word or clear the filter.</p>}
        {results.map((r) => {
          const inv = invById(r.psiId)!;
          const reasons = r.reasons.filter((x) => x !== "CANNOT_ASSESS_APPLICABILITY").slice(0, 2);
          const saved = isSaved(r.psiId);
          return (
            <div className="item" key={r.psiId}>
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="item-top">
                    <div className="item-name">{inv.acronym} <span className="item-id num">{r.psiId}</span></div>
                    <span className="item-score">{r.score === null ? "—" : r.score.toFixed(2)}</span>
                  </div>
                  <p className="item-sub">{inv.name}</p>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {r.cannotAssess ? <span className="tag">Cannot assess</span> : reasons.map((x) => <span className="tag" key={x}>{reasonLabel(x)}</span>)}
                  </div>
                </div>
              </div>
              <button className={`toggle${saved ? " on" : ""}`} aria-pressed={saved} onClick={() => toggleSave(r.psiId)} style={{ marginTop: 10 }}>{saved ? "Saved" : "Save"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
