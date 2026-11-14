/**
 * Engineer readout: "what does the evidence support now?" for one scenario.
 * One traffic light per condition. Lights rate evidence coverage, NEVER safety.
 */
import type { Run, Scenario } from "./schema";
import {
  labelScenario, nearestTested,
  type Condition, type ConditionEvidence, type EvidenceLabel, type NearestTested,
} from "./evidence";
import { O2_PARTIAL_FORMULA, gravityRegime } from "./units";

export type Light = "green" | "yellow" | "red";

export const LIGHT_FOR: Record<EvidenceLabel, Light> = {
  DIRECT_MATCH: "green",
  PARTIAL_ANALOG: "yellow",
  CONFLICTING: "yellow",
  UNKNOWN_METADATA: "red",
  MISSING_OBSERVATION: "red",
};

const UNIT: Record<Condition, string | undefined> = {
  gravityG: "g", o2MolPct: "mol%", o2PartialKPa: "kPa", pressureKPa: "kPa", flowCmS: "cm/s", material: undefined,
};
const NAME: Record<Condition, string> = {
  gravityG: "gravity", o2MolPct: "O2 fraction", o2PartialKPa: "O2 partial pressure",
  pressureKPa: "pressure", flowCmS: "airflow", material: "material",
};
/** Which gap to send to The Missing Experiment first. */
const GAP_PRIORITY: Condition[] = ["gravityG", "o2PartialKPa", "o2MolPct", "pressureKPa", "flowCmS", "material"];

export interface ReadoutRow extends ConditionEvidence {
  name: string;
  unit?: string;
  /** scenario inputs are ASSUMED; O2 partial pressure is COMPUTED from them. Never shown as evidence. */
  targetType: "ASSUMED" | "COMPUTED";
  formula?: string;
  light: Light;
  note: string;
}

export interface EngineerReadout {
  scenarioId: string;
  rows: ReadoutRow[];
  nearestTested: NearestTested;
  doesNotTransfer: string[];
  /** conditions no curated run covers (missing observation or never documented), in gap-priority order */
  uncovered: ReadoutRow[];
  /** runs that match but still need the cross-check against their source page; verifying them turns yellow to green */
  toVerify: string[];
  /** the condition to hand to The Missing Experiment; null when no new experiment is needed (only verification, or nothing) */
  gap: { condition: Condition; target: string } | null;
  limit: string;
  scope: string;
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

function noteFor(e: ConditionEvidence, unit: string | undefined): string {
  const u = unit ? ` ${unit}` : "";
  const near = e.nearest
    ? ` Nearest ${e.nearest.verified ? "verified" : "unverified"} run: ${e.nearest.runId} at ${fmt(e.nearest.value)}${u}.`
    : "";
  switch (e.label) {
    case "DIRECT_MATCH":
      return `Verified run within tolerance: ${e.runIds.slice(0, 3).join(", ")}.`;
    case "PARTIAL_ANALOG":
      return e.analogKind === "same_material_unverified"
        ? `Matching run not yet cross-checked: ${e.runIds.slice(0, 3).join(", ")}. Imported, not verified.`
        : `Only a different material matches: ${e.runIds.slice(0, 3).join(", ")}. Context, not the answer.`;
    case "CONFLICTING":
      return `Verified runs at the same conditions disagree: ${e.runIds.join(" vs ")}. Both shown.`;
    case "UNKNOWN_METADATA":
      return `Runs exist but ${NAME[e.condition]} was never documented.${near}`;
    case "MISSING_OBSERVATION":
      return `Not in our curated data.${near}`;
  }
}

export function engineerReadout(sc: Scenario, runs: Run[]): EngineerReadout {
  const rows: ReadoutRow[] = labelScenario(sc, runs).map((e) => ({
    ...e,
    name: NAME[e.condition],
    unit: UNIT[e.condition],
    targetType: e.condition === "o2PartialKPa" ? "COMPUTED" : "ASSUMED",
    formula: e.condition === "o2PartialKPa" ? O2_PARTIAL_FORMULA : undefined,
    light: LIGHT_FOR[e.label],
    note: noteFor(e, UNIT[e.condition]),
  }));
  const row = (c: Condition) => rows.find((r) => r.condition === c);
  const near = nearestTested(sc, runs);

  const doesNotTransfer: string[] = [];
  const g = row("gravityG");
  // only when no run sits at the scenario's gravity at all (an unverified match is a verification job, not a transfer problem)
  if (g && (g.label === "MISSING_OBSERVATION" || g.label === "UNKNOWN_METADATA")) {
    const from = g.nearest ? `${gravityRegime(g.nearest.value)} (${fmt(g.nearest.value)} g)` : "other gravity levels";
    doesNotTransfer.push(
      `Gravity: results from ${from} are reference points, not bounds, for ${fmt(sc.gravityG)} g. Partial gravity may be more flammable than either Earth or orbit.`,
    );
  }
  const m = row("material");
  if (m && m.label !== "DIRECT_MATCH" && m.analogKind !== "same_material_unverified") {
    doesNotTransfer.push(`Material: no ${sc.material} run in our curated data. Other materials are context only.`);
  }
  const o2 = row("o2MolPct"), po2 = row("o2PartialKPa");
  if (o2 && po2 && (o2.label === "DIRECT_MATCH") !== (po2.label === "DIRECT_MATCH")) {
    doesNotTransfer.push(
      "Oxygen: the O2 fraction and the O2 partial pressure are not both covered. A higher O2 percentage does not mean more oxygen.",
    );
  }
  if (near.disagree && near.byMolPct && near.byPartialPressure) {
    doesNotTransfer.push(
      `Nearest tested condition depends on how oxygen is matched: ${near.byMolPct.runId} by mole fraction, ${near.byPartialPressure.runId} by partial pressure.`,
    );
  }

  const unverifiedOnly = (r: ReadoutRow) => r.analogKind === "same_material_unverified";
  const toVerify = [...new Set(rows.filter(unverifiedOnly).flatMap((r) => r.runIds))];

  // A new experiment is the answer for red rows and for other-material analogs, never for a pending cross-check.
  const worst = (light: Light) => GAP_PRIORITY.map(row).find((r) => r?.light === light && !unverifiedOnly(r));
  const gapRow = worst("red") ?? worst("yellow");
  const gap = gapRow
    ? { condition: gapRow.condition, target: `${NAME[gapRow.condition]} at ${typeof gapRow.target === "number" ? fmt(gapRow.target) : gapRow.target}${gapRow.unit ? ` ${gapRow.unit}` : ""}` }
    : null;

  const reds = rows.filter((r) => r.light === "red").map((r) => r.name);
  const limit = reds.length
    ? `No curated run covers ${reds.join(", ")} for this scenario; anything said about ${reds.length > 1 ? "them" : "it"} here is extrapolation.`
    : rows.some((r) => r.light === "yellow" && !unverifiedOnly(r))
      ? "Some conditions are covered only by other materials or by runs that disagree."
    : rows.some((r) => r.light === "yellow")
      ? "Matching runs exist but are not yet cross-checked against their source pages."
      : "Every scenario condition has a verified run within tolerance, taken one condition at a time; that is not one run matching all of them at once.";

  return {
    scenarioId: sc.id,
    rows,
    nearestTested: near,
    doesNotTransfer,
    uncovered: GAP_PRIORITY.map(row).filter((r): r is ReadoutRow => !!r && r.light === "red"),
    toVerify,
    gap,
    limit,
    scope: "In our curated dataset, among tracked conditions. Lights rate evidence coverage, not safety.",
  };
}
