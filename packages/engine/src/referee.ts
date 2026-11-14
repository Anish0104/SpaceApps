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
  explanation: string;
}

/** Numeric tolerances for "same" (matching heuristics, not safety limits). */
export const TOLERANCE: Partial<Record<Tracked, number>> = {
  pressureKPa: 5, o2MolPct: 2, gravityG: 0.02, thicknessMm: 0.05, sizeMm: 1,
};
const FLOW_REL_TOL = 0.2;

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

  if (confounds.length) {
    return {
      verdict: "CANNOT_ISOLATE", target, confounds, undocumented,
      explanation: `Cannot attribute the difference to ${target}: ${confounds.join(", ")} also changed.`,
    };
  }
  if (targetDiffers === null || undocumented.length) {
    return {
      verdict: "CANT_CONFIRM", target, confounds, undocumented,
      explanation: `Can't confirm: ${undocumented.join(", ")} not documented on both runs.`,
    };
  }
  if (!targetDiffers) {
    return { verdict: "NO_CONTRAST", target, confounds, undocumented, explanation: `${target} is the same on both runs.` };
  }
  return {
    verdict: "CAN_ISOLATE", target, confounds, undocumented,
    explanation: `Only ${target} differs among tracked, documented conditions.`,
  };
}
