/**
 * Referee: can a difference between two runs be attributed to ONE target variable?
 * Checks documented metadata only. Never claims causal proof.
 */
import type { Run } from "./schema";

export const TRACKED = [
  "material", "geometry", "thicknessMm", "sizeMm", "flowCmS", "flowDirection",
  "pressureKPa", "o2MolPct", "gravityG", "ductSize", "apparatus", "method",
] as const;
export type Tracked = (typeof TRACKED)[number];

export type Verdict = "CAN_ISOLATE" | "CANNOT_ISOLATE" | "CANT_CONFIRM" | "NO_CONTRAST";

export interface RefereeResult {
  verdict: Verdict;
  target: Tracked;
  confounds: Tracked[];      // documented and different (besides target)
  undocumented: Tracked[];   // missing on either run
  /** Differences outside the tracked fields that also block attribution (e.g. liquid vs solid fuel). */
  notes: string[];
  explanation: string;
}

/** Numeric tolerances for "same" (matching heuristics, not safety limits). */
export const TOLERANCE: Partial<Record<Tracked, number>> = {
  pressureKPa: 5, o2MolPct: 2, gravityG: 0.02, thicknessMm: 0.05, sizeMm: 1,
};
/** 10%: Saffire I-1 (20 cm/s) vs III-1 (25 cm/s) is a real flow contrast, not "the same". */
export const FLOW_REL_TOL = 0.1;

/** "Same within tolerance" for one tracked field. Shared by evidence labels and the planner. */
export function sameValue(field: Tracked, a: number | string, b: number | string): boolean {
  return same(field, a, b);
}

function same(field: Tracked, a: number | string, b: number | string): boolean {
  if (typeof a === "number" && typeof b === "number") {
    if (field === "flowCmS") return Math.abs(a - b) <= FLOW_REL_TOL * Math.max(Math.abs(a), Math.abs(b), 1e-9);
    return Math.abs(a - b) <= (TOLERANCE[field] ?? 0);
  }
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function referee(a: Run, b: Run, target: Tracked): RefereeResult {
  const confounds: Tracked[] = [];
  const undocumented: Tracked[] = [];
  let targetDiffers: boolean | null = null;

  for (const f of TRACKED) {
    const va = a[f].value;
    const vb = b[f].value;
    if (va === null || vb === null) {
      undocumented.push(f);
      continue;
    }
    const isSame = same(f, va, vb);
    if (f === target) targetDiffers = !isSame;
    else if (!isSame) confounds.push(f);
  }

  // Fuel phase is not a tracked Value field, but liquid droplets vs solid fabric is never a fair comparison.
  const notes: string[] = [];
  if (a.fuelPhase !== b.fuelPhase) notes.push(`fuel phase differs (${a.fuelPhase} vs ${b.fuelPhase})`);

  if (confounds.length || notes.length) {
    const also = [...confounds, ...notes].join(", ");
    const missing = undocumented.length ? ` Not documented on both runs: ${undocumented.join(", ")}.` : "";
    return {
      verdict: "CANNOT_ISOLATE", target, confounds, undocumented, notes,
      explanation: `Cannot attribute the difference to ${target}: ${also} also changed.${missing}`,
    };
  }
  if (targetDiffers === null || undocumented.length) {
    return {
      verdict: "CANT_CONFIRM", target, confounds, undocumented, notes,
      explanation: `Can't confirm: ${undocumented.join(", ")} not documented on both runs.`,
    };
  }
  if (!targetDiffers) {
    return { verdict: "NO_CONTRAST", target, confounds, undocumented, notes, explanation: `${target} is the same on both runs.` };
  }
  return {
    verdict: "CAN_ISOLATE", target, confounds, undocumented, notes,
    explanation: `Only ${target} differs among tracked, documented conditions.`,
  };
}

export type VariableStatus = "constant" | "varies" | "undocumented" | "partly_documented";
export interface VariableSummaryRow {
  field: Tracked;
  status: VariableStatus;
  /** distinct documented values (grouped within tolerance), in first-seen order */
  values: (number | string)[];
  undocumentedRunIds: string[];
}

/**
 * Challenge brief: "how did tests from the same investigation differ and how were they the same?"
 * For a set of runs, says which tracked fields were held constant and which varied.
 */
export function variableSummary(runs: Run[]): VariableSummaryRow[] {
  return TRACKED.map((field) => {
    const values: (number | string)[] = [];
    const undocumentedRunIds: string[] = [];
    for (const r of runs) {
      const v = r[field].value;
      if (v === null) undocumentedRunIds.push(r.id);
      else if (!values.some((x) => same(field, x, v))) values.push(v);
    }
    const status: VariableStatus =
      values.length === 0 ? "undocumented"
      : values.length > 1 ? "varies"
      : undocumentedRunIds.length ? "partly_documented"
      : "constant";
    return { field, status, values, undocumentedRunIds };
  });
}
