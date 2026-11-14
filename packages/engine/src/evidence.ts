/**
 * Evidence labels: for one scenario condition, how well does the curated data cover it?
 * Labels rate evidence coverage. They are NEVER a safety rating.
 */
import type { Run, Scenario } from "./schema";
import { TRACKED, referee, sameValue } from "./referee";
import { o2PartialKPa } from "./units";

export type EvidenceLabel =
  | "DIRECT_MATCH"        // a verified run of the same material matches within tolerance
  | "PARTIAL_ANALOG"      // a related run or material matches; context, never the answer
  | "CONFLICTING"         // verified runs at the same conditions disagree; both shown
  | "MISSING_OBSERVATION" // no curated run covers it ("not in our curated data")
  | "UNKNOWN_METADATA";   // a run exists but the field was never documented

export const CONDITIONS = ["gravityG", "o2MolPct", "o2PartialKPa", "pressureKPa", "flowCmS", "material"] as const;
export type Condition = (typeof CONDITIONS)[number];

/**
 * Matching heuristic for O2 partial pressure (kPa). Not in data/tolerances.json yet:
 * 2 mol% O2 at sea-level pressure is about 2 kPa. Not a safety limit.
 */
export const PO2_TOLERANCE_KPA = 2;
/** Two runs at the same documented conditions "disagree" when an outcome differs by more than this share. */
export const OUTCOME_REL_TOL = 0.2;

export interface NearestRun {
  runId: string;
  psiId: string;
  value: number;
  delta: number; // value - target
  verified: boolean;
}

export interface ConditionEvidence {
  condition: Condition;
  target: number | string;
  label: EvidenceLabel;
  /** runs that support the label (matching runs, or the disagreeing pair for CONFLICTING) */
  runIds: string[];
  /**
   * Why a PARTIAL_ANALOG is only partial: the right material but not yet cross-checked
   * (fixable by verification), or a different material (context only).
   */
  analogKind?: AnalogKind;
  /** closest documented run to the target (a verified run wins a tie); null for material or when nothing is documented */
  nearest: NearestRun | null;
  /** closest documented run below and above the target; null for material (it has no sides) */
  sides: Sides | null;
  conflicts: OutcomeConflict[];
}

/** The closest documented runs on each side of a target. A side is null when no curated run lies there. */
export interface Sides { below: NearestRun | null; above: NearestRun | null }

export type AnalogKind = "same_material_unverified" | "other_material";

export interface OutcomeConflict {
  runIds: [string, string];
  outcome: string;
  values: [number, number];
}

/** O2 partial pressure of a run, computed from its own O2 and pressure when both are documented. */
export function runPO2(run: Run): number | null {
  const o2 = run.o2MolPct.value;
  const p = run.pressureKPa.value;
  if (o2 !== null && p !== null) return o2PartialKPa(o2, p);
  return run.o2PartialKPa.value;
}

export function conditionValue(run: Run, c: Condition): number | string | null {
  return c === "o2PartialKPa" ? runPO2(run) : run[c].value;
}

export function scenarioTarget(sc: Scenario, c: Condition): number | string | null {
  if (c === "o2PartialKPa") return o2PartialKPa(sc.o2MolPct, sc.pressureKPa);
  return sc[c];
}

/** Conditions the scenario actually specifies (flow and material are optional). */
export function scenarioConditions(sc: Scenario): Condition[] {
  return CONDITIONS.filter((c) => scenarioTarget(sc, c) !== null);
}

export function materialMatches(run: Run, material: string | null): boolean {
  if (!material) return true;
  return run.material.value?.toLowerCase().includes(material.toLowerCase()) ?? false;
}

export function matchesTarget(c: Condition, value: number | string, target: number | string): boolean {
  if (c === "material") return String(value).toLowerCase().includes(String(target).toLowerCase());
  if (c === "o2PartialKPa") return Math.abs(Number(value) - Number(target)) <= PO2_TOLERANCE_KPA;
  return sameValue(c, value, target);
}

/** Verified runs with identical documented conditions whose shared outcomes disagree. */
export function findConflicts(runs: Run[]): OutcomeConflict[] {
  const out: OutcomeConflict[] = [];
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i], b = runs[j];
      if (a.fuelPhase !== b.fuelPhase) continue;
      // every tracked field documented and the same on both runs
      const r = referee(a, b, TRACKED[0]);
      if (r.verdict !== "NO_CONTRAST") continue;
      for (const oa of a.outcomes) {
        const ob = b.outcomes.find((o) => o.label === oa.label);
        const va = oa.value.value, vb = ob?.value.value ?? null;
        if (va === null || vb === null) continue;
        if (Math.abs(va - vb) > OUTCOME_REL_TOL * Math.max(Math.abs(va), Math.abs(vb), 1e-9)) {
          out.push({ runIds: [a.id, b.id], outcome: oa.label, values: [va, vb] });
        }
      }
    }
  }
  return out;
}

function nearestRun(c: Condition, target: number, runs: Run[]): NearestRun | null {
  // The closest documented run wins. Verification only breaks a tie: a verified run far from the
  // target must never hide an unverified run that sits right next to it.
  let best: NearestRun | null = null;
  for (const r of runs) {
    const value = conditionValue(r, c);
    if (typeof value !== "number") continue;
    const delta = value - target;
    const verified = r.status === "verified";
    const gap = best ? Math.abs(delta) - Math.abs(best.delta) : -1;
    if (!best || gap < -1e-9 || (Math.abs(gap) <= 1e-9 && verified && !best.verified)) {
      best = { runId: r.id, psiId: r.psiId, value, delta, verified };
    }
  }
  return best;
}

/**
 * The closest documented run strictly below and strictly above a numeric target, among the given runs.
 * Shows how a condition is bracketed: both sides tested, one side only, or neither.
 */
export function closestOnEachSide(c: Exclude<Condition, "material">, target: number, runs: Run[]): Sides {
  const sides: Sides = { below: null, above: null };
  for (const r of runs) {
    const value = conditionValue(r, c);
    if (typeof value !== "number" || value === target) continue;
    const side = value < target ? "below" : "above";
    const delta = value - target;
    const best = sides[side];
    if (!best || Math.abs(delta) < Math.abs(best.delta)) {
      sides[side] = { runId: r.id, psiId: r.psiId, value, delta, verified: r.status === "verified" };
    }
  }
  return sides;
}

/** Label one scenario condition against the curated runs. */
export function labelCondition(c: Condition, sc: Scenario, runs: Run[]): ConditionEvidence | null {
  const target = scenarioTarget(sc, c);
  if (target === null) return null;
  const base = { condition: c, target, conflicts: [] as OutcomeConflict[], sides: null as Sides | null };

  if (c === "material") {
    const same = runs.filter((r) => materialMatches(r, sc.material));
    const verified = same.filter((r) => r.status === "verified");
    if (verified.length) return { ...base, label: "DIRECT_MATCH", runIds: verified.map((r) => r.id), nearest: null };
    if (same.length) {
      return { ...base, label: "PARTIAL_ANALOG", analogKind: "same_material_unverified", runIds: same.map((r) => r.id), nearest: null };
    }
    const samePhase = runs.filter((r) => sc.fuelPhase !== null && r.fuelPhase === sc.fuelPhase && r.material.value !== null);
    if (samePhase.length) {
      return { ...base, label: "PARTIAL_ANALOG", analogKind: "other_material", runIds: samePhase.map((r) => r.id), nearest: null };
    }
    const unknown = runs.some((r) => r.material.value === null);
    return { ...base, label: unknown ? "UNKNOWN_METADATA" : "MISSING_OBSERVATION", runIds: [], nearest: null };
  }

  const sameMaterial = runs.filter((r) => materialMatches(r, sc.material));
  const pool = sameMaterial.length ? sameMaterial : runs;
  const nearest = nearestRun(c, target as number, pool);
  base.sides = closestOnEachSide(c, target as number, pool);
  const matching = runs.filter((r) => {
    const v = conditionValue(r, c);
    return v !== null && matchesTarget(c, v, target);
  });
  const direct = matching.filter((r) => r.status === "verified" && materialMatches(r, sc.material));

  if (direct.length) {
    const conflicts = findConflicts(direct);
    if (conflicts.length) {
      const ids = [...new Set(conflicts.flatMap((x) => x.runIds))];
      return { ...base, label: "CONFLICTING", runIds: ids, nearest, conflicts };
    }
    return { ...base, label: "DIRECT_MATCH", runIds: direct.map((r) => r.id), nearest };
  }
  if (matching.length) {
    // prefer the runs of the right material that only lack the cross-check; other materials are weaker context
    const unverified = matching.filter((r) => materialMatches(r, sc.material));
    const best = unverified.length ? unverified : matching;
    return {
      ...base, label: "PARTIAL_ANALOG", nearest,
      analogKind: unverified.length ? "same_material_unverified" : "other_material",
      runIds: best.map((r) => r.id),
    };
  }
  const undocumented = sameMaterial.filter((r) => conditionValue(r, c) === null);
  if (undocumented.length) return { ...base, label: "UNKNOWN_METADATA", runIds: undocumented.map((r) => r.id), nearest };
  return { ...base, label: "MISSING_OBSERVATION", runIds: [], nearest };
}

export function labelScenario(sc: Scenario, runs: Run[]): ConditionEvidence[] {
  return scenarioConditions(sc)
    .map((c) => labelCondition(c, sc, runs))
    .filter((x): x is ConditionEvidence => x !== null);
}

export interface NearestTested {
  byMolPct: NearestRun | null;
  byPartialPressure: NearestRun | null;
  /** true when the two ways of matching oxygen point at different runs */
  disagree: boolean;
}

/**
 * "Nearest tested condition" matched two ways: on O2 mole fraction and on O2 partial pressure.
 * A higher O2 percentage does not mean more oxygen, so the two can give different answers.
 */
export function nearestTested(sc: Scenario, runs: Run[]): NearestTested {
  const sameMaterial = runs.filter((r) => materialMatches(r, sc.material));
  const pool = sameMaterial.length ? sameMaterial : runs;
  const byMolPct = nearestRun("o2MolPct", sc.o2MolPct, pool);
  const byPartialPressure = nearestRun("o2PartialKPa", o2PartialKPa(sc.o2MolPct, sc.pressureKPa), pool);
  const disagree = !!byMolPct && !!byPartialPressure && byMolPct.runId !== byPartialPressure.runId;
  return { byMolPct, byPartialPressure, disagree };
}
