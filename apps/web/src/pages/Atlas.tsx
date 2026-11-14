import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { rankInvestigations, type SafetyRole } from "@flameatlas/engine";
import { dataset, runsFor } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { Tag } from "../components/Badge";

const ROLES: (SafetyRole | null)[] = [null, "prevention", "detection", "suppression", "physics"];
const BAR = { M: "bg-measured", F: "bg-computed", Q: "bg-assumed", D: "bg-match", C: "bg-ink/40" } as const;

export default function Atlas() {
  const { scenario } = useScenario();
  const [role, setRole] = useState<SafetyRole | null>(null);
  const [q, setQ] = useState("");

  // In-browser ranking (keyword relevance is a simple contains-check here;
  // swap for api.search() once the worker is running).
  const ranked = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const inputs = dataset.investigations.map((inv) => ({
      investigation: inv,
      runs: runsFor(inv.psiId),
      questionScore: needle && `${inv.acronym} ${inv.name} ${inv.objectives}`.toLowerCase().includes(needle) ? 1 : 0,
    }));
    return rankInvestigations(inputs, scenario, role);
  }, [scenario, role, q]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Research Atlas</h1>
      <p className="text-sm text-ink/70">Ranked for <b>{scenario.name}</b>. Relevance to your question and scenario, never a fire-risk score.</p>
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search investigations…"
          className="w-64 rounded border border-line bg-white px-2 py-1 text-sm" />
        {ROLES.map((r) => (
          <button key={r ?? "all"} onClick={() => setRole(r)}
            className={`rounded border px-2 py-1 text-xs ${role === r ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
            {r ?? "all"}
          </button>
        ))}
      </div>

      <div className="divide-y divide-line rounded border border-line bg-white">
        {ranked.map((r, i) => {
          const inv = dataset.investigations.find((x) => x.psiId === r.psiId)!;
          return (
            <div key={r.psiId} className="flex flex-wrap items-center gap-3 p-3">
              <span className="w-6 font-mono text-xs text-ink/50">{i + 1}</span>
              <Link to={`/investigation/${inv.psiId}`} className="w-56 font-semibold hover:underline">
                {inv.acronym} <span className="font-mono text-xs text-ink/50">{inv.psiId}</span>
              </Link>
              <Tag>{inv.safetyRole}</Tag>
              {r.cannotAssess ? (
                <span className="text-xs text-gap">cannot assess applicability</span>
              ) : (
                <div className="flex h-3 w-48 overflow-hidden rounded bg-line" title={JSON.stringify(r.contributions)}>
                  {(Object.keys(BAR) as (keyof typeof BAR)[]).map((k) => (
                    <div key={k} className={BAR[k]} style={{ width: `${r.contributions[k] * 100}%` }} />
                  ))}
                </div>
              )}
              <span className="font-mono text-xs">{r.score === null ? "—" : r.score.toFixed(2)}</span>
              <div className="flex flex-wrap gap-1">
                {r.reasons.map((x) => <Tag key={x} tone={x.includes("DIFFERS") || x.includes("CANNOT") ? "gap" : "measured"}>{x}</Tag>)}
                {r.notDocumented.map((x) => <Tag key={x} tone="gap">{x}: not documented</Tag>)}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink/60">Bar: M mission match · F fuel · Q question · D safety domain · C completeness.</p>
    </div>
  );
}
