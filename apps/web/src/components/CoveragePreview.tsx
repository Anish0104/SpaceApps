import { useMemo } from "react";
import { Link } from "react-router-dom";
import { rankInvestigations, type RankedResult, type Scenario } from "@flameatlas/engine";
import { coverage, dataset, releaseCoverage, runsFor } from "../lib/data";
import { useScenario } from "../lib/scenario";

/**
 * "Where the evidence ends": one segmented coverage bar for the active scenario.
 * One segment per condition: gravity, oxygen, pressure, flow, material.
 * Hatched means not covered in curated data for the active scenario.
 * Each hatched segment opens /missing-experiment.
 */
export interface Segment {
  id: string;
  label: string;
  count: number;
}

export function evidenceSegments(sc: Scenario, ranked: RankedResult[]): Segment[] {
  const n = (test: (r: RankedResult) => boolean) => ranked.filter(test).length;

  return [
    {
      id: "gravity",
      label: `Gravity ${sc.gravityG} g`,
      count: n((r) => !r.notDocumented.includes("gravityG") && !r.reasons.includes("GRAVITY_DIFFERS")),
    },
    {
      id: "oxygen",
      label: `Oxygen (${sc.o2MolPct}%)`,
      count: n((r) => r.reasons.includes("O2_WITHIN_5PCT") || r.reasons.includes("PO2_CLOSE")),
    },
    {
      id: "pressure",
      label: `Pressure (${sc.pressureKPa} kPa)`,
      count: n((r) => !r.notDocumented.includes("pressureKPa")),
    },
    {
      id: "flow",
      label: sc.flowCmS !== null ? `Flow (${sc.flowCmS} cm/s)` : "Flow",
      count: n((r) => !r.notDocumented.includes("flowCmS")),
    },
    {
      id: "material",
      label: sc.material ?? (sc.fuelPhase ? `Fuel (${sc.fuelPhase})` : "Material"),
      count: n((r) =>
        r.reasons.some(
          (x) => x === "SAME_MATERIAL" || /_FUEL_MATCH$/.test(x) || x.includes("FUEL")
        )
      ),
    },
  ];
}

/** The dashboard card: one tile per condition, how many curated investigations document it for this scenario. */
export function CoveragePreview() {
  const { scenario } = useScenario();
  const segments = useMemo(() => {
    const ranked = rankInvestigations(
      dataset.investigations.map((inv) => ({ investigation: inv, runs: runsFor(inv.psiId), questionScore: 0 })),
      scenario,
    );
    return evidenceSegments(scenario, ranked);
  }, [scenario]);

  const total = releaseCoverage?.investigations ?? coverage.investigations;

  return (
    <section aria-labelledby="coverage-heading" className="dash-card">
      <div className="dash-card-head">
        <div className="min-w-0">
          <h2 id="coverage-heading" className="panel-title">Where the evidence ends</h2>
          <p className="text-xs text-[var(--text-muted)]">Curated investigations documenting each condition, out of {total}</p>
        </div>
        <span className="hidden items-center gap-2 text-xs text-[var(--text-muted)] sm:flex">
          <span aria-hidden="true" className="hatch inline-block h-3 w-5 rounded border border-dashed border-[var(--border-strong)]" />
          Not in our data: select to see the missing experiment
        </span>
      </div>
      <ol aria-label={`Evidence conditions for ${scenario.name}`} className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
        {segments.map((s) => {
          const unknown = s.count === 0;
          const text = unknown ? `${s.label}: Unknown, not in our curated dataset` : `${s.label}: documented by ${s.count} of ${total} investigations`;
          const body = (
            <>
              <span className="block truncate text-xs text-[var(--text-muted)]">{s.label}</span>
              <span className="mt-1.5 flex h-8 items-baseline gap-1.5">
                {unknown ? (
                  <span className="text-lg font-semibold text-[var(--text)]">Unknown</span>
                ) : (
                  <>
                    <span className="text-2xl font-semibold leading-none tracking-tight text-[var(--text)]">{s.count}</span>
                    <span className="text-xs text-[var(--text-muted)]">/ {total}</span>
                  </>
                )}
              </span>
              <span aria-hidden="true" className={`mt-2 block h-1.5 overflow-hidden rounded-full ${unknown ? "hatch" : "bg-[var(--surface-2)]"}`}>
                {!unknown && (
                  <span className="block h-full rounded-full bg-[var(--accent)] transition-[width] duration-700" style={{ width: `${(s.count / Math.max(1, total)) * 100}%` }} />
                )}
              </span>
            </>
          );
          return (
            <li key={s.id} title={text} className="min-w-0">
              {unknown ? (
                <Link to="/missing-experiment" aria-label={`${text}. Open the missing experiment`} className="cov-tile is-unknown">
                  {body}
                </Link>
              ) : (
                <div role="img" aria-label={text} className="cov-tile">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
