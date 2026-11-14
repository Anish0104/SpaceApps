/**
 * Investigation ranking: Score = wM*M + wF*F + wQ*Q + wD*D + wC*C
 * Relevance to a question and scenario. NEVER a fire-risk score.
 */
import type { Investigation, Run, Scenario, SafetyRole } from "./schema";
import { gravitySimilarity, o2PartialKPa } from "./units";

export interface Weights { M: number; F: number; Q: number; D: number; C: number }
export const DEFAULT_WEIGHTS: Weights = { M: 0.3, F: 0.2, Q: 0.25, D: 0.15, C: 0.1 };

export const SCALES = { o2MolPct: 10, o2PartialKPa: 10, pressureKPa: 50, flowCmS: 20 };

export interface RankInput {
  investigation: Investigation;
  runs: Run[];
  /** 0..1 question relevance from search (keyword + semantic fused); 0 if no question */
  questionScore: number;
}

export interface RankedResult {
  psiId: string;
  score: number | null; // null = cannot assess applicability
  contributions: Weights;
  reasons: string[];
  notDocumented: string[];
  cannotAssess: boolean;
}

const sim = (x: number, target: number, scale: number) => Math.max(0, 1 - Math.abs(x - target) / scale);

/** Closest documented value to the target from runs, else from investigation ranges. */
function closest(target: number, runVals: (number | null)[], range?: [number, number]): number | null {
  const vals = runVals.filter((v): v is number => v !== null);
  if (vals.length) return vals.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
  if (range) return Math.min(Math.max(target, range[0]), range[1]);
  return null;
}

export function missionMatch(inv: Investigation, runs: Run[], sc: Scenario) {
  const r = inv.ranges ?? {};
  const o2 = closest(sc.o2MolPct, runs.map((x) => x.o2MolPct.value), r.o2MolPct);
  const p = closest(sc.pressureKPa, runs.map((x) => x.pressureKPa.value), r.pressureKPa);
  const flow = sc.flowCmS === null ? null : closest(sc.flowCmS, runs.map((x) => x.flowCmS.value), r.flowCmS);
  const g = closest(sc.gravityG, runs.map((x) => x.gravityG.value), r.gravityG);

  const parts: number[] = [];
  const reasons: string[] = [];
  const notDocumented: string[] = [];

  if (o2 !== null) {
    const s = sim(o2, sc.o2MolPct, SCALES.o2MolPct);
    parts.push(s);
    if (Math.abs(o2 - sc.o2MolPct) <= 5) reasons.push("O2_WITHIN_5PCT");
  } else notDocumented.push("o2MolPct");

  if (p !== null) parts.push(sim(p, sc.pressureKPa, SCALES.pressureKPa));
  else notDocumented.push("pressureKPa");

  if (o2 !== null && p !== null) {
    const target = o2PartialKPa(sc.o2MolPct, sc.pressureKPa);
    const s = sim(o2PartialKPa(o2, p), target, SCALES.o2PartialKPa);
    parts.push(s);
    if (s >= 0.8) reasons.push("PO2_CLOSE");
  }

  if (sc.flowCmS !== null) {
    if (flow !== null) parts.push(sim(flow, sc.flowCmS, SCALES.flowCmS));
    else notDocumented.push("flowCmS");
  }

  if (g !== null) {
    const s = gravitySimilarity(g, sc.gravityG);
    parts.push(s);
    if (s < 1) reasons.push(`GRAVITY_DIFFERS`);
  } else notDocumented.push("gravityG");

  const cannotAssess = o2 === null && p === null;
  if (cannotAssess) reasons.push("CANNOT_ASSESS_APPLICABILITY");
  const M = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  return { M, reasons, notDocumented, cannotAssess };
}

export function fuelApplicability(inv: Investigation, runs: Run[], sc: Scenario): { F: number; reason?: string } {
  if (!sc.fuelPhase) return { F: 1 };
  const mat = sc.material?.toLowerCase();
  if (mat && runs.some((r) => r.material.value?.toLowerCase().includes(mat))) return { F: 1, reason: "SAME_MATERIAL" };
  const phase = inv.fuelPhase ?? runs[0]?.fuelPhase;
  if (phase === sc.fuelPhase) return { F: 0.6, reason: `${sc.fuelPhase.toUpperCase()}_FUEL_MATCH` };
  return { F: 0.2, reason: "DIFFERENT_FUEL_PHASE" };
}

export function domainMatch(role: SafetyRole, filter: SafetyRole | null): number {
  if (!filter) return 1;
  if (role === filter) return 1;
  return role === "physics" ? 0.5 : 0;
}

const KEY_FIELDS = ["o2MolPct", "pressureKPa", "flowCmS", "gravityG", "material", "sensors"] as const;

export function completeness(inv: Investigation, runs: Run[]): number {
  const r = inv.ranges ?? {};
  const has = {
    o2MolPct: runs.some((x) => x.o2MolPct.value !== null) || !!r.o2MolPct,
    pressureKPa: runs.some((x) => x.pressureKPa.value !== null) || !!r.pressureKPa,
    flowCmS: runs.some((x) => x.flowCmS.value !== null) || !!r.flowCmS,
    gravityG: runs.some((x) => x.gravityG.value !== null) || !!r.gravityG,
    material: runs.some((x) => x.material.value !== null),
    sensors: inv.sensors.length > 0 || runs.some((x) => x.sensors.length > 0),
  };
  return KEY_FIELDS.filter((k) => has[k]).length / KEY_FIELDS.length;
}

export function rankInvestigations(
  inputs: RankInput[],
  sc: Scenario,
  filter: SafetyRole | null = null,
  w: Weights = DEFAULT_WEIGHTS,
): RankedResult[] {
  const out = inputs.map(({ investigation: inv, runs, questionScore }) => {
    const m = missionMatch(inv, runs, sc);
    const f = fuelApplicability(inv, runs, sc);
    const D = domainMatch(inv.safetyRole, filter);
    const C = completeness(inv, runs);
    const Q = Math.max(0, Math.min(1, questionScore));
    const contributions = { M: w.M * m.M, F: w.F * f.F, Q: w.Q * Q, D: w.D * D, C: w.C * C };
    const reasons = [...m.reasons, ...(f.reason ? [f.reason] : [])];
    const score = m.cannotAssess ? null : Object.values(contributions).reduce((a, b) => a + b, 0);
    return { psiId: inv.psiId, score, contributions, reasons, notDocumented: m.notDocumented, cannotAssess: m.cannotAssess };
  });
  // scored first (desc), then "cannot assess" at the end
  return out.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

/** Robustness: share of weight settings in which each psiId stays in the top k. */
export function robustness(inputs: RankInput[], sc: Scenario, filter: SafetyRole | null, k = 3, steps = [0.5, 1, 1.5]) {
  const counts = new Map<string, number>();
  let total = 0;
  for (const a of steps) for (const b of steps) for (const c of steps) {
    const raw = { M: DEFAULT_WEIGHTS.M * a, F: DEFAULT_WEIGHTS.F * b, Q: DEFAULT_WEIGHTS.Q * c, D: DEFAULT_WEIGHTS.D, C: DEFAULT_WEIGHTS.C };
    const sum = Object.values(raw).reduce((x, y) => x + y, 0);
    const w = Object.fromEntries(Object.entries(raw).map(([key, v]) => [key, v / sum])) as unknown as Weights;
    rankInvestigations(inputs, sc, filter, w).slice(0, k).forEach((r) => counts.set(r.psiId, (counts.get(r.psiId) ?? 0) + 1));
    total++;
  }
  return Object.fromEntries([...counts].map(([id, n]) => [id, n / total]));
}
