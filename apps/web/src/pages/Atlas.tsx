import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { rankInvestigations, type FuelPhase, type RankedResult, type SafetyRole } from "@flameatlas/engine";
import { dataset, isPsiRecord, releaseCoverage, runsFor } from "../lib/data";
import { fieldLabel, hasAcronym, investigationLabel, reasonLabel, sentenceCase } from "../lib/labels";
import { useScenario } from "../lib/scenario";
import { Tag } from "../components/Badge";

const ROLES: (SafetyRole | null)[] = [null, "prevention", "detection", "suppression", "physics"];
const PHASES: (FuelPhase | null)[] = [null, "solid", "liquid", "gas", "aerosol"];


export default function Atlas() {
  const { scenario } = useScenario();
  const [role, setRole] = useState<SafetyRole | null>(null);
  const [phase, setPhase] = useState<FuelPhase | null>(null);
  const [q, setQ] = useState("");

  const ranked = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const inputs = dataset.investigations
      .filter((inv) => !phase || inv.fuelPhase === phase || runsFor(inv.psiId).some((r) => r.fuelPhase === phase))
      .map((inv) => ({
        investigation: inv,
        runs: runsFor(inv.psiId),
        questionScore: needle && `${inv.acronym} ${inv.name} ${inv.objectives}`.toLowerCase().includes(needle) ? 1 : 0,
      }));
    return rankInvestigations(inputs, scenario, role);
  }, [scenario, role, phase, q]);

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div>
        <p className="eyebrow">Investigations</p>
        <h1 className="page-title">
          Research atlas
        </h1>
        <p className="page-lede">
          Ranked for <span className="font-medium text-[var(--text)]">{scenario.name}</span>. The score rates relevance to this scenario, never fire safety.
        </p>
        {releaseCoverage && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Data {dataset.version}: {releaseCoverage.investigations} investigations indexed, {releaseCoverage.runsImported} runs imported, {releaseCoverage.runsVerified} runs verified.
          </p>
        )}
      </div>

      {/* Top Filter Row: Search, Safety role, Fuel phase */}
      <div className="sticky top-[4.5rem] z-20 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-3 shadow-[var(--shadow)] backdrop-blur-xl">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="atlas-search" className="sr-only">Search investigations</label>
          <input
            id="atlas-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search investigations, acronyms, materials…"
            className="field w-full text-sm text-[var(--text)]"
          />
        </div>

        {/* Safety Role Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="role-filter" className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            Safety role:
          </label>
          <select
            id="role-filter"
            value={role ?? ""}
            onChange={(e) => setRole((e.target.value as SafetyRole) || null)}
            className="field field-sm text-xs text-[var(--text)]"
          >
            <option value="">All roles</option>
            {ROLES.filter(Boolean).map((r) => (
              <option key={r} value={r!}>
                {sentenceCase(r!)}
              </option>
            ))}
          </select>
        </div>

        {/* Fuel Phase Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="phase-filter" className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            Fuel phase:
          </label>
          <select
            id="phase-filter"
            value={phase ?? ""}
            onChange={(e) => setPhase((e.target.value as FuelPhase) || null)}
            className="field field-sm text-xs text-[var(--text)]"
          >
            <option value="">All phases</option>
            {PHASES.filter(Boolean).map((p) => (
              <option key={p} value={p!}>
                {sentenceCase(p!)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Responsive Grid: 3 cols desktop, 2 cols tablet, 1 col mobile */}
      <p className="-mt-4 text-sm text-[var(--text-muted)]" aria-live="polite">
        {ranked.length} {ranked.length === 1 ? "investigation" : "investigations"}
        {q.trim() || role || phase ? " match your filters" : ""}
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {ranked.map((r, i) => {
          const inv = dataset.investigations.find((x) => x.psiId === r.psiId)!;
          const runs = runsFor(inv.psiId);
          const reasons = r.reasons.filter((x) => x !== "CANNOT_ASSESS_APPLICABILITY").slice(0, 3);

          // Summarize 2x2 data grid
          const gravities = runs.map((run) => run.gravityG.value).filter((v): v is number => v !== null);
          const gravText = gravities.length > 0
            ? Math.min(...gravities) === Math.max(...gravities)
              ? `${Math.min(...gravities)} g`
              : `${Math.min(...gravities)}–${Math.max(...gravities)} g`
            : inv.ranges?.gravityG
            ? `${inv.ranges.gravityG[0]}–${inv.ranges.gravityG[1]} g`
            : null;

          const o2s = runs.map((run) => run.o2MolPct.value).filter((v): v is number => v !== null);
          const o2Text = o2s.length > 0
            ? Math.min(...o2s) === Math.max(...o2s)
              ? `${Math.min(...o2s)}%`
              : `${Math.min(...o2s)}–${Math.max(...o2s)}%`
            : inv.ranges?.o2MolPct
            ? `${inv.ranges.o2MolPct[0]}–${inv.ranges.o2MolPct[1]}%`
            : null;

          const pressures = runs.map((run) => run.pressureKPa.value).filter((v): v is number => v !== null);
          const pText = pressures.length > 0
            ? Math.min(...pressures) === Math.max(...pressures)
              ? `${Math.min(...pressures)} kPa`
              : `${Math.min(...pressures)}–${Math.max(...pressures)} kPa`
            : inv.ranges?.pressureKPa
            ? `${inv.ranges.pressureKPa[0]}–${inv.ranges.pressureKPa[1]} kPa`
            : null;

          const flows = runs.map((run) => run.flowCmS.value).filter((v): v is number => v !== null);
          const flowText = flows.length > 0
            ? Math.min(...flows) === Math.max(...flows)
              ? `${Math.min(...flows)} cm/s`
              : `${Math.min(...flows)}–${Math.max(...flows)} cm/s`
            : inv.ranges?.flowCmS
            ? `${inv.ranges.flowCmS[0]}–${inv.ranges.flowCmS[1]} cm/s`
            : null;

          const materials = Array.from(new Set(runs.map((run) => run.material.value).filter(Boolean)));
          const primaryMaterial = materials.length > 0 ? materials[0] : (inv.fuelPhase ? sentenceCase(inv.fuelPhase) : "Unspecified");

          return (
            <article
              key={r.psiId}
              className="panel panel-hover group relative flex h-full flex-col justify-between p-6"
            >
              <div className="space-y-4">
                {/* Title & metadata */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      #{i + 1} • {isPsiRecord(inv) ? inv.psiId : "NASA report"}
                    </span>
                    <span className="rounded-[4px] bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                      {sentenceCase(inv.safetyRole)}
                    </span>
                  </div>

                  <h2 className="mt-2 font-semibold tracking-tight text-xl leading-snug text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
                    <Link
                      to={`/investigation/${inv.psiId}`}
                      className="after:absolute after:inset-0 after:rounded-[12px] after:content-['']"
                    >
                      {investigationLabel(inv)}
                    </Link>
                  </h2>

                  {hasAcronym(inv) && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                      {inv.name}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                    <span>Phase: <b className="font-medium text-[var(--text)]">{sentenceCase(inv.fuelPhase ?? runs[0]?.fuelPhase ?? "Unknown")}</b></span>
                    <span>•</span>
                    <span>Fuel: <b className="font-medium text-[var(--text)]">{primaryMaterial}</b></span>
                  </div>
                </div>

                {/* Match score bar or hatched cannot assess */}
                <div>
                  {r.cannotAssess || r.score === null ? (
                    <div
                      title="No oxygen or pressure range is documented for this investigation"
                      className="hatch flex h-7 w-full items-center justify-center rounded-[6px] border border-[var(--border)]"
                    >
                      <span className="rounded-[2px] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                        Cannot assess
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Relevance match</span>
                        <span className="font-mono font-medium text-[var(--text)]">
                          {(r.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={Math.round(r.score * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Match score ${(r.score * 100).toFixed(0)}%`}
                        className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(4, r.score * 100)}%`,
                            backgroundColor: "var(--accent)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2x2 Data Grid with tabular numbers and hatch for unknowns */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)]">Gravity: </span>
                    {gravText ? (
                      <span className="font-mono font-medium text-[var(--text)]">{gravText}</span>
                    ) : (
                      <span className="hatch inline-block rounded px-1 text-[var(--text-muted)]">Unknown</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Oxygen: </span>
                    {o2Text ? (
                      <span className="font-mono font-medium text-[var(--text)]">{o2Text}</span>
                    ) : (
                      <span className="hatch inline-block rounded px-1 text-[var(--text-muted)]">Unknown</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Pressure: </span>
                    {pText ? (
                      <span className="font-mono font-medium text-[var(--text)]">{pText}</span>
                    ) : (
                      <span className="hatch inline-block rounded px-1 text-[var(--text-muted)]">Unknown</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Flow: </span>
                    {flowText ? (
                      <span className="font-mono font-medium text-[var(--text)]">{flowText}</span>
                    ) : (
                      <span className="hatch inline-block rounded px-1 text-[var(--text-muted)]">Unknown</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Up to 3 reason tags */}
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                {reasons.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {reasons.map((x) => (
                      <Tag key={x}>{reasonLabel(x)}</Tag>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">
                    No specific condition deviations noted.
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {ranked.length === 0 && (
        <div className="panel p-10 text-center">
          <p className="font-semibold tracking-tight text-xl text-[var(--text)]">No investigations match</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Try a different search term, or clear the role and phase filters.</p>
          <button type="button" className="btn btn-secondary btn-sm mt-5" onClick={() => { setQ(""); setRole(null); setPhase(null); }}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
