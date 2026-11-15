import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { rankInvestigations } from "@flameatlas/engine";
import { coverage, dataset, isPsiRecord, releaseCoverage, runsFor } from "../lib/data";
import { investigationLabel, sentenceCase } from "../lib/labels";
import { useScenario } from "../lib/scenario";
import { sceneFor } from "../lib/scenes";
import { ScenarioStrip } from "../components/ScenarioStrip";
import { CoveragePreview } from "../components/CoveragePreview";
import { AskComposer } from "../components/AskComposer";
import { IconArrowRight } from "../components/Icons";

/** Dashboard overview: the active scenario, a quick question, where the evidence ends, and the closest investigations. */
export default function Dashboard() {
  const { scenario } = useScenario();
  const scene = sceneFor(scenario);
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const top = useMemo(
    () =>
      rankInvestigations(
        dataset.investigations.map((inv) => ({ investigation: inv, runs: runsFor(inv.psiId), questionScore: 0 })),
        scenario,
      ).slice(0, 5),
    [scenario],
  );
  const counts = releaseCoverage ?? coverage;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="mt-1.5 text-[var(--text-muted)]">What the curated NASA evidence covers for the selected crew environment.</p>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ScenarioStrip scenario={scenario} />

        <section aria-labelledby="snapshot" className="dash-card flex flex-col">
          <div className="dash-card-head">
            <h2 id="snapshot" className="panel-title">Evidence snapshot</h2>
          </div>
          <dl className="grid flex-1 grid-cols-2 content-center gap-x-4 gap-y-5 p-5">
            {[
              ["Investigations", counts.investigations],
              ["Runs", counts.runsImported],
              ["Verified runs", counts.runsVerified],
              ["NASA sources", coverage.documents],
            ].map(([label, n]) => (
              <div key={label}>
                <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
                <dd className="mt-0.5 text-3xl font-semibold tracking-tight text-[var(--text)]">{n}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section aria-label="Ask a question">
        <AskComposer
          value={q}
          onChange={setQ}
          onSubmit={(v) => navigate("/ask", { state: { q: v } })}
          scenarioLabel={scene.pickerLabel ?? scene.label}
          accent={scene.accent}
        />
      </section>

      <CoveragePreview />

      <section aria-labelledby="top-matches" className="dash-card overflow-hidden">
        <div className="dash-card-head">
          <h2 id="top-matches" className="panel-title">Closest investigations</h2>
          <Link to="/atlas" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
            Full atlas <IconArrowRight size={13} />
          </Link>
        </div>
        <ol className="divide-y divide-[var(--border)]">
          {top.map((r, i) => {
            const inv = dataset.investigations.find((x) => x.psiId === r.psiId)!;
            return (
              <li key={r.psiId}>
                <Link
                  to={`/investigation/${inv.psiId}`}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--text)_4%,transparent)]"
                >
                  <span className="font-mono text-xs text-[var(--text-faint)]">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--text)]">{investigationLabel(inv)}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {isPsiRecord(inv) ? inv.psiId : "NASA report"} · {sentenceCase(inv.safetyRole)}
                    </span>
                  </span>
                  {r.cannotAssess || r.score === null ? (
                    <span className="chip chip-hatch"><span>Cannot assess</span></span>
                  ) : (
                    <span className="flex items-center gap-2.5" title="Relevance to this scenario, never fire safety">
                      <span aria-hidden="true" className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface-2)] sm:block">
                        <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(4, r.score * 100)}%` }} />
                      </span>
                      <span className="w-9 text-right font-mono text-xs text-[var(--text)]">{Math.round(r.score * 100)}%</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="border-t border-[var(--border)] px-5 py-2.5 text-xs text-[var(--text-muted)]">Relevance to this scenario, never fire safety.</p>
      </section>
    </div>
  );
}
