/**
 * The Missing Experiment planner.
 * Candidates (rule-generated or AI-designed) are checked and scored by deterministic rules.
 * Output is an illustrative research proposal, not an approved NASA protocol.
 *
 *   V = wC * CoverageGain + wD * Discrimination + wU * Uncertainty - wK * Cost
 */
import { z } from "zod";
import type { Investigation, Run, Scenario } from "./schema";
import { TRACKED, referee, sameValue, type Tracked } from "./referee";
import { materialMatches } from "./evidence";
import { missionMatch } from "./ranking";
import { O2_PARTIAL_FORMULA, gravityRegime, o2PartialKPa } from "./units";

/** Numeric conditions a candidate may move away from its anchor run. */
export const CHANGEABLE = ["gravityG", "o2MolPct", "pressureKPa", "flowCmS", "sizeMm", "thicknessMm"] as const;
export type Changeable = (typeof CHANGEABLE)[number];

/** A 0..1 estimate that only counts when a NASA source backs it. No source, no number. */
const Sourced = z.object({ value: z.number().min(0).max(1), sourceId: z.string().min(1) });

export const ExperimentCandidate = z.object({
  id: z.string(),
  origin: z.enum(["rule", "ai"]),
  anchorRunId: z.string(),
  changes: z.array(z.object({ field: z.enum(CHANGEABLE), to: z.number() })).min(1),
  measure: z.array(z.string()).default([]),
  rationale: z.string().optional(),
  uncertainty: Sourced.optional(),
  cost: Sourced.optional(),
});
export type ExperimentCandidate = z.infer<typeof ExperimentCandidate>;

export interface PlannerWeights { C: number; D: number; U: number; K: number }
/** Visible and adjustable; the robustness check shows which picks survive other settings. */
export const DEFAULT_PLANNER_WEIGHTS: PlannerWeights = { C: 0.5, D: 0.3, U: 0.1, K: 0.1 };
export const ROBUST_SHARE = 0.7;
export const PROPOSAL_STAMP = "Illustrative research proposal, not an approved NASA protocol.";

const SCENARIO_FIELDS = ["gravityG", "o2MolPct", "pressureKPa", "flowCmS"] as const;

// ---------- candidates ----------

/**
 * A documented anchor run with one variable moved to the scenario value.
 * Imported (not yet cross-checked) anchors are allowed by default and carry a badge saying so;
 * pass verifiedOnly to restrict to verified anchors.
 */
export function generateRuleCandidates(sc: Scenario, runs: Run[], opts: { verifiedOnly?: boolean } = {}): ExperimentCandidate[] {
  const verifiedOnly = opts.verifiedOnly ?? false;
  const anchors = runs.filter((r) => materialMatches(r, sc.material) && (!verifiedOnly || r.status === "verified"));
  const out: ExperimentCandidate[] = [];
  for (const a of anchors) {
    const measure = a.outcomes.map((o) => o.label);
    const moved: { field: Changeable; to: number }[] = [];
    for (const field of SCENARIO_FIELDS) {
      const to = sc[field];
      const from = a[field].value;
      if (to === null || from === null || sameValue(field, from, to)) continue;
      moved.push({ field, to });
      out.push({ id: `rule-${a.id}-${field}`, origin: "rule", anchorRunId: a.id, changes: [{ field, to }], measure });
    }
    // Factorial: the whole atmosphere at once. Allowed, but flagged as not a one-variable comparison.
    const atmosphere = moved.filter((m) => m.field === "o2MolPct" || m.field === "pressureKPa");
    if (atmosphere.length === 2) {
      out.push({ id: `rule-${a.id}-atmosphere`, origin: "rule", anchorRunId: a.id, changes: atmosphere, measure });
    }
  }
  return out;
}

/** The run the candidate describes: the anchor with the changed values (ASSUMED) and recomputed O2 partial pressure. */
export function projectRun(c: ExperimentCandidate, anchor: Run): Run {
  const run: Run = { ...anchor, id: `PLAN-${c.id}`, status: "imported", outcomes: [] };
  for (const { field, to } of c.changes) {
    run[field] = { value: to, unit: anchor[field].unit, type: "ASSUMED" };
  }
  const o2 = run.o2MolPct.value, p = run.pressureKPa.value;
  // COMPUTED only when both inputs are supported; otherwise UNKNOWN, with no formula and no
  // computed-value claim. A projected run never presents a partial pressure it cannot compute.
  run.o2PartialKPa = o2 !== null && p !== null
    ? { value: o2PartialKPa(o2, p), unit: "kPa", type: "COMPUTED", formula: O2_PARTIAL_FORMULA }
    : { value: null, unit: "kPa", type: "UNKNOWN", missingReason: "not_documented" };
  return run;
}

// ---------- control check ----------

export type CheckId = "ANCHOR_EXISTS" | "ANCHOR_VERIFIED" | "CHANGE_IS_REAL" | "ONE_VARIABLE" | "HELD_DOCUMENTED" | "FILLS_GAP";
export interface Check { id: CheckId; pass: boolean; required: boolean; detail: string }

export interface ControlCheck {
  candidateId: string;
  /** every required check passed */
  pass: boolean;
  /** more than one variable changed: allowed, but never presented as a one-variable comparison */
  factorial: boolean;
  checks: Check[];
  changed: Changeable[];
  /** tracked fields held at the anchor's documented values */
  held: Tracked[];
  /** not assessed unless a NASA source provides it */
  feasibility: string;
}

/**
 * Does an existing run already cover the projected conditions? Returns:
 *  - "duplicate" with the run, when the same material and every scenario field is documented and equal
 *    on both (a confirmed overlap);
 *  - "insufficient_metadata", when a run matches every documented field but a needed field is undocumented
 *    on one side (cannot confirm the overlap, and absence of data is not treated as a match);
 *  - "gap", when no run comes close.
 * Missing conditions never count as a match: absence of data is never evidence an experiment was run.
 */
type DuplicateCheck = { kind: "duplicate"; run: Run } | { kind: "insufficient_metadata"; run: Run } | { kind: "gap" };
function alreadyTested(projected: Run, runs: Run[]): DuplicateCheck {
  const mat = projected.material.value;
  let partial: Run | undefined;
  for (const r of runs) {
    if (r.id === projected.id) continue;
    if (mat !== null && !materialMatches(r, mat)) continue;
    let allDocumentedEqual = true, anyUnknown = false;
    for (const f of SCENARIO_FIELDS) {
      const a = projected[f].value, b = r[f].value;
      if (a === null || b === null) { anyUnknown = true; continue; } // undocumented on a side: cannot confirm
      if (!sameValue(f, a, b)) { allDocumentedEqual = false; break; }
    }
    if (!allDocumentedEqual) continue;
    if (!anyUnknown) return { kind: "duplicate", run: r };
    partial = partial ?? r;
  }
  return partial ? { kind: "insufficient_metadata", run: partial } : { kind: "gap" };
}

export function controlCheck(c: ExperimentCandidate, runs: Run[]): ControlCheck {
  const anchor = runs.find((r) => r.id === c.anchorRunId);
  const changed = [...new Set(c.changes.map((x) => x.field))];
  const base = { candidateId: c.id, factorial: changed.length > 1, changed, feasibility: "Not assessed: no NASA source provided." };
  if (!anchor) {
    const checks: Check[] = [{ id: "ANCHOR_EXISTS", pass: false, required: true, detail: `Anchor run ${c.anchorRunId} is not in the dataset.` }];
    return { ...base, pass: false, checks, held: [] };
  }

  const checks: Check[] = [{ id: "ANCHOR_EXISTS", pass: true, required: true, detail: `Anchor run ${anchor.id}.` }];
  checks.push({
    id: "ANCHOR_VERIFIED", required: false, pass: anchor.status === "verified",
    detail: anchor.status === "verified" ? "Anchor run is verified." : "Anchor run is imported, not yet cross-checked.",
  });

  const unreal = c.changes.filter(({ field, to }) => {
    const from = anchor[field].value;
    return from === null || sameValue(field, from, to);
  });
  checks.push({
    id: "CHANGE_IS_REAL", required: true, pass: unreal.length === 0 && changed.length === c.changes.length,
    detail: unreal.length
      ? `${unreal.map((x) => x.field).join(", ")}: undocumented on the anchor or already at that value.`
      : `Changes ${c.changes.map((x) => `${x.field} ${anchor[x.field].value} -> ${x.to}`).join("; ")}.`,
  });

  checks.push({
    id: "ONE_VARIABLE", required: false, pass: changed.length === 1,
    detail: changed.length === 1
      ? `Only ${changed[0]} changes; O2 partial pressure is recomputed, not set.`
      : `Factorial design: ${changed.join(", ")} change together. Not a one-variable comparison.`,
  });

  const others = TRACKED.filter((f) => !(changed as readonly string[]).includes(f));
  const missing = others.filter((f) => anchor[f].value === null);
  checks.push({
    id: "HELD_DOCUMENTED", required: true, pass: missing.length === 0,
    detail: missing.length ? `Held values not documented on the anchor: ${missing.join(", ")}.` : "Every held condition is documented on the anchor.",
  });

  const dup = alreadyTested(projectRun(c, anchor), runs);
  checks.push({
    id: "FILLS_GAP", required: dup.kind !== "insufficient_metadata",
    pass: dup.kind === "gap",
    detail: dup.kind === "duplicate" ? `Already covered by ${dup.run.id} in our curated data.`
      : dup.kind === "insufficient_metadata"
        ? `Possible overlap with ${dup.run.id}, but a needed condition is undocumented on one side, so neither a confirmed duplicate nor a confirmed gap.`
        : "No curated run of this material at these conditions.",
  });

  return {
    ...base,
    pass: checks.every((k) => k.pass || !k.required),
    checks,
    held: others.filter((f) => anchor[f].value !== null),
  };
}

// ---------- scoring ----------

/**
 * The material x gravity regime x pressure cell the candidate lands in:
 * empty (no curated run of any material), other_material_only (analogs exist), or filled.
 */
export type CellState = "empty" | "other_material_only" | "filled";
export const CELL_GAIN: Record<CellState, number> = { empty: 1, other_material_only: 0.5, filled: 0 };

export interface CandidateScore {
  V: number;
  coverageGain: number;
  cell: CellState;
  matchGain: number;
  discrimination: 0 | 1;
  uncertainty: number;
  cost: number;
}

/** Scenario match of a single run across the five conditions (O2, pressure, O2 partial pressure, flow, gravity). */
function runMatch(run: Run, sc: Scenario): number {
  // missionMatch only reads ranges/name from the investigation; a run-level match needs neither
  const noInvestigation = { acronym: "", name: "" } as Investigation;
  return missionMatch(noInvestigation, [run], sc).M;
}

/**
 * Who already occupies the candidate's gravity regime x pressure cell? A cell that only holds
 * other materials is a smaller gap than one nobody has tested (same idea as PARTIAL_ANALOG vs MISSING_OBSERVATION).
 */
function cellState(projected: Run, runs: Run[]): CellState {
  const mat = projected.material.value, g = projected.gravityG.value, p = projected.pressureKPa.value;
  if (g === null || p === null) return "filled"; // cannot place it, so claim no coverage
  const inCell = runs.filter((r) => {
    const rg = r.gravityG.value, rp = r.pressureKPa.value;
    return r.id !== projected.id && rg !== null && rp !== null
      && gravityRegime(rg) === gravityRegime(g) && sameValue("pressureKPa", rp, p);
  });
  if (!inCell.length) return "empty";
  return inCell.some((r) => mat === null || materialMatches(r, mat)) ? "filled" : "other_material_only";
}

/** Does any curated pair of this material already isolate the variable? Memoized per run list. */
const isolatedMemo = new WeakMap<Run[], Map<string, boolean>>();
function alreadyIsolated(field: Changeable, material: string | null, runs: Run[]): boolean {
  let memo = isolatedMemo.get(runs);
  if (!memo) isolatedMemo.set(runs, (memo = new Map()));
  const key = `${field}|${material?.toLowerCase() ?? ""}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const pool = runs.filter((r) => material === null || materialMatches(r, material));
  let found = false;
  outer: for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      if (referee(pool[i], pool[j], field).verdict === "CAN_ISOLATE") { found = true; break outer; }
    }
  }
  memo.set(key, found);
  return found;
}

export function scoreCandidate(
  c: ExperimentCandidate, runs: Run[], sc: Scenario, w: PlannerWeights = DEFAULT_PLANNER_WEIGHTS,
): CandidateScore | null {
  const anchor = runs.find((r) => r.id === c.anchorRunId);
  if (!anchor) return null;
  const projected = projectRun(c, anchor);
  const cell = cellState(projected, runs);
  const matchGain = Math.max(0, runMatch(projected, sc) - runMatch(anchor, sc));
  const coverageGain = 0.5 * CELL_GAIN[cell] + 0.5 * matchGain;
  // a factorial design cannot isolate anything, so it earns no discrimination credit
  const discrimination = c.changes.length === 1 && !alreadyIsolated(c.changes[0].field, anchor.material.value, runs) ? 1 : 0;
  const uncertainty = c.uncertainty?.value ?? 0; // 0 unless a NASA source provides it
  const cost = c.cost?.value ?? 0;
  const V = w.C * coverageGain + w.D * discrimination + w.U * uncertainty - w.K * cost;
  return { V, coverageGain, cell, matchGain, discrimination, uncertainty, cost };
}

// ---------- selection ----------

export interface Pick { candidate: ExperimentCandidate; check: ControlCheck; score: CandidateScore }

const EPS = 1e-9;
const anchorVerified = (p: Pick) => p.check.checks.some((k) => k.id === "ANCHOR_VERIFIED" && k.pass);
/** Higher V wins; ties go to a one-variable design, then a verified anchor, then the id (so the order is stable). */
function beats(a: Pick, b: Pick): boolean {
  if (Math.abs(a.score.V - b.score.V) > EPS) return a.score.V > b.score.V;
  if (a.check.factorial !== b.check.factorial) return !a.check.factorial;
  if (anchorVerified(a) !== anchorVerified(b)) return anchorVerified(a);
  return a.candidate.id < b.candidate.id;
}

/** Greedy up to the budget. Each pick is added to the pool so the next pick must add something new. */
export function selectGreedy(
  candidates: ExperimentCandidate[], runs: Run[], sc: Scenario, budget: number, w: PlannerWeights = DEFAULT_PLANNER_WEIGHTS,
): Pick[] {
  const n = Math.max(1, Math.min(5, Math.floor(budget)));
  let pool = runs;
  let remaining = [...candidates];
  const picks: Pick[] = [];
  while (picks.length < n && remaining.length) {
    let best: Pick | null = null;
    for (const candidate of remaining) {
      const check = controlCheck(candidate, pool);
      if (!check.pass) continue;
      const score = scoreCandidate(candidate, pool, sc, w);
      if (!score || score.V <= 0) continue;
      if (!best || beats({ candidate, check, score }, best)) best = { candidate, check, score };
    }
    if (!best) break;
    const chosen = best;
    picks.push(chosen);
    const anchor = pool.find((r) => r.id === chosen.candidate.anchorRunId) as Run;
    pool = [...pool, projectRun(chosen.candidate, anchor)];
    remaining = remaining.filter((x) => x.id !== chosen.candidate.id);
  }
  return picks;
}

export interface PlannedExperiment extends Pick {
  /** share of weight settings in which this candidate is still selected */
  robustShare: number;
  robust: boolean;
  badges: string[];
  stamp: string;
}

export interface Plan {
  scenarioId: string;
  budget: number;
  weights: PlannerWeights;
  selected: PlannedExperiment[];
  /** candidates that failed a required control check, with the reason */
  rejected: { candidate: ExperimentCandidate; check: ControlCheck }[];
}

export function planExperiments(
  candidates: ExperimentCandidate[], runs: Run[], sc: Scenario,
  opts: { budget?: number; weights?: PlannerWeights; steps?: number[] } = {},
): Plan {
  const budget = opts.budget ?? 1;
  const weights = opts.weights ?? DEFAULT_PLANNER_WEIGHTS;
  const steps = opts.steps ?? [0.5, 1, 1.5];

  const counts = new Map<string, number>();
  let total = 0;
  for (const a of steps) for (const b of steps) {
    const raw = { C: weights.C * a, D: weights.D * b, U: weights.U, K: weights.K };
    const sum = raw.C + raw.D + raw.U + raw.K;
    const w = { C: raw.C / sum, D: raw.D / sum, U: raw.U / sum, K: raw.K / sum };
    for (const p of selectGreedy(candidates, runs, sc, budget, w)) counts.set(p.candidate.id, (counts.get(p.candidate.id) ?? 0) + 1);
    total++;
  }

  const selected = selectGreedy(candidates, runs, sc, budget, weights).map((p): PlannedExperiment => {
    const robustShare = (counts.get(p.candidate.id) ?? 0) / total;
    const robust = robustShare >= ROBUST_SHARE;
    const badges = [
      p.candidate.origin === "ai" ? "AI-proposed" : "Rule-generated",
      "Control checks passed (feasibility and safety not assessed)",
      ...(robust ? ["Robust"] : []),
      ...(anchorVerified(p) ? [] : ["Anchor not yet cross-checked"]),
      ...(p.check.factorial ? ["Factorial: not a one-variable comparison"] : []),
    ];
    return { ...p, robustShare, robust, badges, stamp: PROPOSAL_STAMP };
  });

  const rejected = candidates
    .map((candidate) => ({ candidate, check: controlCheck(candidate, runs) }))
    .filter((x) => !x.check.pass);

  return { scenarioId: sc.id, budget, weights, selected, rejected };
}
