import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  engineerReadout, generateRuleCandidates, gravityRegime, planExperiments,
  type Changeable, type EvidenceLabel, type PlannedExperiment, type ReadoutRow, type Run, type Tracked,
} from "@flameatlas/engine";
import { dataset, sourceById } from "../lib/data";
import { fieldLabel, humanizeField } from "../lib/labels";
import { useScenario } from "../lib/scenario";
import { EvidenceBadge, Tag, VerdictLight } from "../components/Badge";
import { RecordTag } from "../components/RecordTag";
import { ScenarioStrip } from "../components/ScenarioStrip";
import { ValueCell } from "../components/ValueCell";

const BUDGETS = [1, 2, 3, 4, 5] as const;
const UNIT: Record<Changeable, string> = { gravityG: "g", o2MolPct: "mol%", pressureKPa: "kPa", flowCmS: "cm/s", sizeMm: "mm", thicknessMm: "mm" };
const CELL_WORDS = {
  empty: "No curated run of any material at this gravity and pressure",
  other_material_only: "Only other materials have been run at this gravity and pressure",
  filled: "This material already has a run at this gravity and pressure",
} as const;

const lower = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => String(Number(x.toFixed(3)));

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sm:contents">
      <dt className="font-semibold">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Display rounding only: gravity to 3 places, pressures to 1. Stored values are never changed. */
const rounded = (x: number, c: ReadoutRow["condition"]) => String(Number(x.toFixed(c === "gravityG" ? 3 : c === "pressureKPa" ? 2 : 1)));
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const COVERAGE_WORDS: Record<EvidenceLabel, string> = {
  DIRECT_MATCH: "Covered by a verified run",
  PARTIAL_ANALOG: "A run matches, not yet verified or another material",
  CONFLICTING: "Covered, but verified runs disagree",
  MISSING_OBSERVATION: "No curated run covers it",
  UNKNOWN_METADATA: "Runs exist, never documented",
};

/** The scenario's own value: assumed inputs are dashed, the computed O2 partial pressure is a solid outline. */
function ScenarioValue({ row }: { row: ReadoutRow }) {
  const computed = row.targetType === "COMPUTED";
  const text = typeof row.target === "number" ? `${rounded(row.target, row.condition)}${row.unit ? ` ${row.unit}` : ""}` : row.target;
  return (
    <span className={`whitespace-nowrap ${computed ? "value value-computed" : "value value-assumed"}`} title={computed ? `Computed: ${row.formula}` : "Assumed scenario input, not evidence"}>
      {text}
    </span>
  );
}

/** The closest curated run on one side of the scenario value, with its receipt; hatch when that side is empty. */
function Side({ row, side }: { row: ReadoutRow; side: "below" | "above" }) {
  const near = row.sides?.[side];
  const run = near && dataset.runs.find((r) => r.id === near.runId);
  if (!near || !run || row.condition === "material") return <Tag variant="hatch">No curated run {side}</Tag>;
  return (
    <span className="flex flex-col items-start gap-1">
      {row.condition === "o2PartialKPa"
        // not a stored value: computed from this run's own oxygen and pressure
        ? <span className="inline-flex flex-wrap items-center gap-x-1.5"><span className="whitespace-nowrap">{rounded(near.value, row.condition)} kPa</span><EvidenceBadge type="COMPUTED" /></span>
        : <ValueCell v={run[row.condition]} />}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/70">
        <RecordTag id={run.id} />
        {run.status === "verified" ? "verified" : "imported, not yet cross-checked"}
      </span>
    </span>
  );
}

/** Material has no "sides": list what has been run instead. */
function OtherMaterials({ wanted }: { wanted: string }) {
  const all = [...new Set(dataset.runs.map((r) => r.material.value).filter((m): m is string => m !== null))];
  const has = all.filter((m) => m.toLowerCase().includes(wanted.toLowerCase()));
  if (has.length) return <span>In our curated data as: {has.join("; ")}.</span>;
  return (
    <span className="flex flex-col items-start gap-1">
      <Tag variant="hatch">No curated run of {wanted}</Tag>
      <span className="text-sm text-ink/70">Materials that were run: {all.join("; ") || "none documented"}.</span>
    </span>
  );
}

function Proposal({ p, anchor, rank }: { p: PlannedExperiment; anchor: Run; rank: number }) {
  const { candidate: c, check, score } = p;
  const changed = c.changes.map((x) => lower(fieldLabel(x.field))).join(" and ");
  const material = anchor.material.value ?? "the anchor material";
  const measures = c.measure.length ? c.measure.join(", ") : null;
  const toLunar = c.changes.some((x) => x.field === "gravityG" && gravityRegime(x.to) === "moon");
  const fm2 = sourceById("S-FM2");

  return (
    <section className="panel p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-2 font-semibold">Proposal {rank}</span>
        {p.badges.map((b) => <Tag key={b} variant={b.startsWith("Anchor") || b.startsWith("Factorial") ? "dashed" : "quiet"} wrap>{b}</Tag>)}
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
        <Row label="Research question">
          With everything else held at the anchor run's documented values, does changing only {changed} change how {material} burns?
        </Row>
        <Row label="Hypothesis / alternative">
          Hypothesis: {measures ?? "the measured outcome"} differs from the anchor run. Alternative: no measurable difference.
        </Row>
        <Row label="Variable changed">
          <ul className="space-y-1">
            {c.changes.map((x) => (
              <li key={x.field} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{fieldLabel(x.field)}:</span>
                <ValueCell v={anchor[x.field]} />
                <span aria-hidden="true">→</span><span className="sr-only">to</span>
                <span className="value value-assumed" title="Scenario value: an assumed input, not evidence">{num(x.to)} {UNIT[x.field]}</span>
              </li>
            ))}
          </ul>
        </Row>
        <Row label="Held fixed">
          <ul className="grid gap-x-6 gap-y-1 md:grid-cols-2">
            {check.held.map((f: Tracked) => (
              <li key={f} className="flex flex-wrap items-center gap-x-2">
                <span className="text-ink/70">{fieldLabel(f)}:</span> <ValueCell v={anchor[f]} />
              </li>
            ))}
          </ul>
        </Row>
        <Row label="Measure">
          {measures ?? <Tag variant="hatch">Not specified: the anchor run has no recorded outcome in our curated data</Tag>}
        </Row>
        <Row label="Motivating NASA runs"><RecordTag id={anchor.id} /></Row>
        <Row label="Control check">
          <ul className="space-y-1">
            {check.checks.map((k) => (
              <li key={k.id} className="flex items-start gap-2">
                <span className="mt-0.5"><VerdictLight light={k.pass ? "green" : k.required ? "red" : "yellow"} /></span>
                <span>{humanizeField(k.detail)}{!k.pass && !k.required ? " (noted, does not block)" : ""}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm text-ink/70">Feasibility: {check.feasibility}</p>
        </Row>
        <Row label="Why this one">
          <ul className="space-y-1">
            <li>{CELL_WORDS[score.cell]}.</li>
            <li>{score.discrimination ? `No curated pair of ${material} runs already isolates ${changed}.` : `Does not add a new one-variable comparison for ${changed}.`}</li>
            <li>Selected in {pct(p.robustShare)} of the weight settings tried{p.robust ? " (robust)" : ""}.</li>
            <li className="text-sm text-ink/70">Uncertainty and cost are counted as zero: no NASA source provides them.</li>
          </ul>
        </Row>
        <Row label="FM2 comparison">
          {toLunar ? (
            <>
              Lines up with FM2's design on the variable: FM2 is NASA's planned long-duration lunar-gravity flammability experiment
              {fm2 && <> (<a href={fm2.url} target="_blank" rel="noreferrer" className="link">NASA report</a>)</>}.
              {" "}FM2 is an outside comparison, never an input to this planner.
            </>
          ) : "No FM2 comparison: this proposal does not move gravity to lunar level."}
        </Row>
      </dl>
      <p className="mt-4 border-t border-rule pt-3 text-sm text-ink/70">{p.stamp}</p>
    </section>
  );
}

/**
 * The Missing Experiment. Built from the dataset only (no AI call): which scenario conditions no curated
 * run covers, the closest runs on each side, and the experiment that would close the gap.
 * Candidates are rule-generated here (an anchor run with one variable moved
 * to the scenario value); the engine's control check and scoring decide what is shown. AI-designed
 * candidates and the skeptic's objection arrive through /api/design and /api/skeptic.
 */
export default function MissingExperiment() {
  const { scenario: s } = useScenario();
  const [budget, setBudget] = useState<number>(1);
  const readout = engineerReadout(s, dataset.runs);
  const candidates = generateRuleCandidates(s, dataset.runs);
  const plan = planExperiments(candidates, dataset.runs, s, { budget });
  const run = (id: string) => dataset.runs.find((r) => r.id === id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl sm:text-3xl">The missing experiment</h1>
        <p className="measure mt-2">The experiment that would close the biggest evidence gap for the chosen crew environment.</p>
      </div>

      <ScenarioStrip scenario={s} />

      <section className="panel">
        <h2 className="border-b border-rule px-4 py-3 font-semibold sm:px-5">What no run covers</h2>
        <p className="px-4 pt-3 text-xs text-[var(--text-muted)] sm:hidden">Scroll sideways for the scenario value and the closest runs.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule text-sm text-ink/70">
                <th scope="col" className="px-4 py-2 font-normal sm:px-5">Condition</th>
                <th scope="col" className="px-3 py-2 font-normal">Scenario value</th>
                <th scope="col" className="px-3 py-2 font-normal">Closest run below</th>
                <th scope="col" className="px-3 py-2 font-normal">Closest run above</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {readout.rows.map((r) => {
                const missing = r.light === "red";
                return (
                  <tr key={r.condition} className="align-top">
                    <th scope="row" className="px-4 py-3 font-semibold sm:px-5">
                      <span className="flex items-center gap-3">
                        {/* Missing evidence is the hatch, never a fill colour */}
                        <VerdictLight light={missing ? "hatch" : r.light} />
                        <span>
                          {upperFirst(r.name)}
                          <span className="block text-sm font-normal text-ink/70">{COVERAGE_WORDS[r.label]}</span>
                        </span>
                      </span>
                    </th>
                    <td className="px-3 py-3"><ScenarioValue row={r} /></td>
                    {r.sides
                      ? <><td className="px-3 py-3"><Side row={r} side="below" /></td><td className="px-3 py-3"><Side row={r} side="above" /></td></>
                      : <td colSpan={2} className="px-3 py-3"><OtherMaterials wanted={String(r.target)} /></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-rule px-4 py-3 text-sm text-ink/70 sm:px-5">
          {readout.uncovered.length
            ? <>No curated run covers {readout.uncovered.map((r) => r.name).join(", ")} for this scenario. </>
            : <>Every condition of this scenario has at least one curated run nearby. </>}
          The closest runs are of the scenario's material where it has any. Lights rate evidence coverage, not safety.{" "}
          <Link to="/mission-lab" className="link">See the evidence for each condition in Mission lab</Link>.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-semibold" id="budget-label">Tests in the budget</span>
        <div role="group" aria-labelledby="budget-label" className="flex gap-1">
          {BUDGETS.map((n) => (
            <button key={n} type="button" className="btn btn-secondary btn-sm" aria-pressed={budget === n} onClick={() => setBudget(n)}>{n}</button>
          ))}
        </div>
        <span className="text-sm text-ink/70">
          {candidates.length} rule-generated candidates, {plan.rejected.length} refused by the control check, {plan.selected.length} selected.
        </span>
      </div>

      {plan.selected.length === 0 && (
        <section className="panel px-4 py-4 sm:px-5">
          <p className="measure">No candidate passed the control check for this scenario. The reasons are listed below.</p>
        </section>
      )}

      {plan.selected.map((p, i) => {
        const anchor = run(p.candidate.anchorRunId);
        return anchor ? <Proposal key={p.candidate.id} p={p} anchor={anchor} rank={i + 1} /> : null;
      })}

      {plan.rejected.length > 0 && (
        <details className="panel px-4 py-3 sm:px-5">
          <summary className="cursor-pointer font-semibold">Candidates the rules refused ({plan.rejected.length})</summary>
          <ul className="mt-3 divide-y divide-rule">
            {plan.rejected.map(({ candidate: c, check }) => (
              <li key={c.id} className="grid gap-x-6 gap-y-1 py-2 md:grid-cols-[18rem_minmax(0,1fr)]">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <RecordTag id={c.anchorRunId} />
                  <span>change {c.changes.map((x) => lower(fieldLabel(x.field))).join(" and ")}</span>
                </span>
                <span>{check.checks.filter((k) => !k.pass && k.required).map((k) => humanizeField(k.detail)).join(" ")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
