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

export function CoveragePreview() {
  const { scenario } = useScenario();
  const segments = useMemo(() => {
    const ranked = rankInvestigations(
      dataset.investigations.map((inv) => ({
        investigation: inv,
        runs: runsFor(inv.psiId),
        questionScore: 0,
      })),
      scenario
    );
    return evidenceSegments(scenario, ranked);
  }, [scenario]);

  const total = releaseCoverage?.investigations ?? coverage.investigations;

  return (
    <section aria-labelledby="coverage-heading" className="relative z-10 border-y border-[var(--border)] bg-[var(--bg-elev)]">
      <div className="content-container grid gap-8 py-10 sm:py-12 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-center">
        <div>
          <p className="eyebrow">Coverage</p>
          <h2 id="coverage-heading" className="section-title mt-2">
            Where the evidence ends
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            How many of {total} curated investigations document each condition for{" "}
            <span className="text-[var(--text)]">{scenario.name}</span>.
          </p>
        </div>

        <div>
          <ol aria-label={`Evidence conditions for ${scenario.name}`} className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {segments.map((s) => {
              const unknown = s.count === 0;
              const text = unknown
                ? `${s.label}: Unknown, not in our curated dataset`
                : `${s.label}: documented by ${s.count} of ${total} investigations`;
              const body = (
                <>
                  <span className={`block truncate text-xs text-[var(--text-muted)] ${unknown ? "w-fit max-w-full rounded bg-[var(--surface)] px-1" : ""}`}>{s.label}</span>
                  <span className="mt-1 flex items-baseline gap-1.5">
                    {unknown ? (
                      <span className="rounded bg-[var(--surface)] px-1 text-sm font-medium text-[var(--text)]">Unknown</span>
                    ) : (
                      <>
                        <span className="font-semibold tracking-tight text-3xl leading-none text-[var(--text)]">{s.count}</span>
                        <span className="text-xs text-[var(--text-muted)]">/ {total}</span>
                      </>
                    )}
                  </span>
                  <span aria-hidden="true" className="mt-3 block h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <span
                      className="block h-full rounded-full bg-[var(--accent)] transition-[width] duration-700 ease-[var(--ease-out)]"
                      style={{ width: `${(s.count / Math.max(1, total)) * 100}%` }}
                    />
                  </span>
                </>
              );
              return (
                <li key={s.id} title={text} className="min-w-0">
                  {unknown ? (
                    <Link
                      to="/missing-experiment"
                      aria-label={`${text}. Open the missing experiment`}
                      className="hatch block h-full rounded-xl border border-dashed border-[var(--border-strong)] p-3.5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div role="img" aria-label={text} className="h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span aria-hidden="true" className="hatch inline-block h-3.5 w-5 rounded border border-[var(--border-strong)]" />
            Hatched: not in our curated dataset. Select it to see the experiment that would close the gap.
          </p>
        </div>
      </div>
    </section>
  );
}
