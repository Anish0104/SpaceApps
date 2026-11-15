/**
 * Investigation ranking: Score = wM*M + wF*F + wQ*Q + wD*D + wC*C
 * Relevance to a question and scenario. NEVER a fire-risk score.
 */
import type { Investigation, Run, Scenario, SafetyRole } from "./schema";
import { gravityRegime, gravitySimilarity, o2PartialKPa } from "./units";

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

const invText = (inv: Investigation) => `${inv.acronym} ${inv.name}`;
/** ACME E-FIELD Flames: partial gravity mimicked through the electric field (challenge brief). */
export const isEFieldFlames = (inv: Investigation) => /e-?field/i.test(invText(inv));
/**
 * ACME CFI-G: the oxygen (up to 85%) flowed OUT of the spherical burner into a chamber of nitrogen and
 * fuel gas (challenge brief). Its oxygen figure is burner gas, never a cabin atmosphere.
 */
export const isBurnerOxidizer = (inv: Investigation) => /\bCFI-G\b|cool flames investigation with gases/i.test(invText(inv));
/** ACME BRE: burned gas, but studied solid-material flammability (challenge brief). */
export const isMaterialEmulator = (inv: Investigation) => /\bBRE\b|burning rate emulator/i.test(invText(inv));

export function missionMatch(inv: Investigation, runs: Run[], sc: Scenario) {
  const r = inv.ranges ?? {};
  // Burner-gas oxygen is not an atmosphere: never compare it with the scenario's cabin oxygen.
  const burnerGas = isBurnerOxidizer(inv);
  const o2 = burnerGas ? null : closest(sc.o2MolPct, runs.map((x) => x.o2MolPct.value), r.o2MolPct);
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
  } else {
    notDocumented.push("o2MolPct");
    reasons.push(burnerGas ? "O2_IS_BURNER_GAS" : "NO_O2_DATA");
  }

  if (p !== null) parts.push(sim(p, sc.pressureKPa, SCALES.pressureKPa));
  else {
    notDocumented.push("pressureKPa");
    reasons.push("NO_PRESSURE_DATA");
  }

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
    if (gravityRegime(g) === "orbit" && gravityRegime(sc.gravityG) !== "orbit") reasons.push("GRAVITY_ORBIT_ONLY");
  } else notDocumented.push("gravityG");

  // Challenge brief: E-FIELD Flames mimicked partial gravity with an electric field.
  // Context only: it is NOT lunar- or Mars-gravity data, so it never changes the score.
  const partialG = ["moon", "mars"].includes(gravityRegime(sc.gravityG));
  if (partialG && isEFieldFlames(inv)) reasons.push("PARTIAL_G_MIMIC_EFIELD");

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
  // A gas-burner emulator of solid materials counts as a same-phase analog, not a different phase.
  if (sc.fuelPhase === "solid" && isMaterialEmulator(inv)) return { F: 0.6, reason: "MATERIAL_EMULATOR" };
  return { F: 0.2, reason: "DIFFERENT_FUEL_PHASE" };
}

export function domainMatch(role: SafetyRole, filter: SafetyRole | null): number {
  if (!filter) return 1;
  if (role === filter) return 1;
  return role === "physics" ? 0.5 : 0;
}

/**
 * Words in a question that point at one safety role. Deliberately small and literal:
 * a question is only assigned a role when exactly one role's words appear.
 */
export const ROLE_WORDS: Record<Exclude<SafetyRole, "physics">, RegExp> = {
  detection: /\b(smoke|detect\w*|alarm\w*|aerosol\w*|particle\w*|particulate\w*|dust\w*)\b/i,
  // "extinction": extinction limits are what the suppression experiments (FLEX = Flame Extinguishment) measured
  suppression: /\b(suppress\w*|extinguish\w*|extinction|fire[- ]?fight\w*|water[- ]mist|quench\w*)\b/i,
  prevention: /\b(flammab\w*|flame[- ]spread|ignit\w*|material selection|fabric\w*|textile\w*)\b/i,
};

/**
 * Flame-physics terms, taken from what the physics investigations studied (cool flames, laminar
 * diffusion flames, electric fields, soot and smoke points, gas-jet flames, lift-off).
 */
export const PHYSICS_WORDS = /\b(cool[- ]flames?|diffusion flames?|electric[- ]field\w*|soot\w*|smoke[- ]points?|laminar|jet flames?|gas jet|flame (structure|shape|dynamics)|lift-?off|spherical flames?)\b/i;

/**
 * Flame-physics terms that contain a role word but are not about that role: "smoke point" is a
 * property of a gas flame (SPICE), not smoke detection; "re-ignite" describes flame dynamics
 * (cool flames), not material ignition.
 */
const NOT_ROLE_WORDS = /\bsmoke[- ]points?\b|\bre-?ignit\w*/gi;

/**
 * Safety role a question is about, or null when it names none or more than one.
 * Used as the domain filter (D) when the user has not picked one, so that a smoke-detector
 * question is not ranked purely on how well a flame-spread test matches the cabin atmosphere.
 * A question in flame-physics terms and no other role's words is a physics question; physics
 * terms mixed with another role's words name more than one role, so the question is left alone.
 */
export function inferSafetyRole(question: string): SafetyRole | null {
  const physics = PHYSICS_WORDS.test(question);
  const rest = question.replace(NOT_ROLE_WORDS, " ");
  const hits = (Object.keys(ROLE_WORDS) as (keyof typeof ROLE_WORDS)[]).filter((role) => ROLE_WORDS[role].test(rest));
  if (physics) return hits.length === 0 ? "physics" : null;
  return hits.length === 1 ? hits[0] : null;
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

/**
 * Where a result sits in the list. A scored investigation sorts by its score. A "cannot assess"
 * investigation still shows no score (its O2 and pressure are undocumented), but it is placed by
 * what IS documented: question relevance, safety role, fuel and completeness, with the mission-match
 * term left out and the remaining weights rescaled to 1. This is the same rule the match term uses
 * inside itself: an undocumented condition is left out of the mean, never counted as zero.
 */
export function sortKey(r: RankedResult, w: Weights = DEFAULT_WEIGHTS): number {
  if (r.score !== null) return r.score;
  const rest = r.contributions.F + r.contributions.Q + r.contributions.D + r.contributions.C;
  return w.M < 1 ? rest / (1 - w.M) : rest;
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
    if (filter && inv.safetyRole === filter) reasons.push(`${filter.toUpperCase()}_ROLE_MATCH`);
    const score = m.cannotAssess ? null : Object.values(contributions).reduce((a, b) => a + b, 0);
    return { psiId: inv.psiId, score, contributions, reasons, notDocumented: m.notDocumented, cannotAssess: m.cannotAssess };
  });
  return out.sort((a, b) => sortKey(b, w) - sortKey(a, w) || a.psiId.localeCompare(b.psiId));
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
