import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { rankInvestigations, type RankedResult, type SafetyRole } from "@flameatlas/engine";
import { dataset, runsFor } from "../lib/data";
import { fieldLabel, reasonLabel, sentenceCase } from "../lib/labels";
import { useScenario } from "../lib/scenario";
import { Tag } from "../components/Badge";

const ROLES: (SafetyRole | null)[] = [null, "prevention", "detection", "suppression", "physics"];

/**
 * Score parts, in bar order. Shades of ink, not hues: colour is reserved for gravity regime and
 * verdict lights. Position, the key under the list and the tooltip identify each part.
 */
const PARTS = [
  { key: "M", label: "Mission match", ink: 100 },
  { key: "F", label: "Fuel", ink: 76 },
  { key: "Q", label: "Question", ink: 56 },
  { key: "D", label: "Safety domain", ink: 40 },
  { key: "C", label: "Completeness", ink: 26 },
] as const;

const shade = (ink: number) => `color-mix(in srgb, var(--ink) ${ink}%, var(--panel))`;

function ContributionBar({ r }: { r: RankedResult }) {
  if (r.cannotAssess || r.score === null) return <Tag variant="hatch">Cannot assess applicability</Tag>;
  const summary = PARTS.map((p) => `${p.label} ${r.contributions[p.key].toFixed(2)}`).join(", ");
  return (
    <div className="flex items-center gap-3">
      <div role="img" aria-label={`Relevance ${r.score.toFixed(2)} of 1. ${summary}.`} className="flex h-3 w-40 gap-[2px] bg-module">
        {PARTS.map((p) => r.contributions[p.key] > 0 && (
          <span key={p.key} title={`${p.label}: ${r.contributions[p.key].toFixed(2)}`}
            style={{ width: `${r.contributions[p.key] * 100}%`, background: shade(p.ink) }} />
        ))}
      </div>
      <span aria-hidden="true" className="dense font-semibold">{r.score.toFixed(2)}</span>
    </div>
  );
}

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
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl sm:text-3xl">Research atlas</h1>
        <p className="measure mt-2">
          Ranked for <b className="font-semibold">{scenario.name}</b>. The score is relevance to your question and scenario, never a fire-risk score.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/70">Search investigations</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="field w-72 max-w-full text-base" />
        </label>
        <div role="group" aria-label="Safety role" className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button key={r ?? "all"} type="button" onClick={() => setRole(r)} aria-pressed={role === r} className="btn btn-secondary btn-sm">
              {r ? sentenceCase(r) : "All roles"}
            </button>
          ))}
        </div>
      </div>

      <ol className="panel divide-y divide-rule">
        {ranked.map((r, i) => {
          const inv = dataset.investigations.find((x) => x.psiId === r.psiId)!;
          const reasons = r.reasons.filter((x) => x !== "CANNOT_ASSESS_APPLICABILITY"); // already said in the bar's place
          return (
            <li key={r.psiId}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-module/60 lg:grid-cols-[1.5rem_minmax(0,18rem)_6rem_14rem_minmax(0,1fr)]">
              <span className="dense text-ink/70">{i + 1}</span>
              <div className="min-w-0">
                <Link to={`/investigation/${inv.psiId}`} className="font-semibold hover:underline">{inv.acronym}</Link>
                <span className="dense ml-2 text-sm text-ink/70">{inv.psiId}</span>
                <p className="truncate text-sm text-ink/70">{inv.name}</p>
              </div>
              <span className="col-start-2 text-sm lg:col-start-auto">{sentenceCase(inv.safetyRole)}</span>
              <div className="col-start-2 lg:col-start-auto"><ContributionBar r={r} /></div>
              {(reasons.length > 0 || r.notDocumented.length > 0) && (
                <div className="col-start-2 flex flex-wrap gap-1 lg:col-start-auto">
                  {reasons.map((x) => <Tag key={x}>{reasonLabel(x)}</Tag>)}
                  {r.notDocumented.map((x) => <Tag key={x} variant="hatch">{fieldLabel(x)} not documented</Tag>)}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/70">
        <span>Bar, left to right:</span>
        {PARTS.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-4" style={{ background: shade(p.ink) }} />
            {p.label}
          </span>
        ))}
        <span>The number is the total, from 0 to 1.</span>
      </div>
    </div>
  );
}
