/**
 * The science engine against the real dataset (data/dataset.json).
 * These pin behaviour, not NASA values: run ids and labels, never a measured number.
 */
import { describe, it, expect } from "vitest";
import real from "../../../data/dataset.json";
import scenarios from "../../../data/scenarios.json";
import {
  Dataset, Scenario, engineerReadout, rankInvestigations, generateRuleCandidates, planExperiments, variableSummary, PROPOSAL_STAMP,
} from "../src";

const ds = Dataset.parse(real);
const sc = (id: string) => Scenario.parse(scenarios.find((s) => s.id === id));
const allImported = ds.runs.every((r) => r.status === "imported");

describe("engineer readout on real data", () => {
  const moon = engineerReadout(sc("moon-challenge"), ds.runs);
  const row = (c: string) => moon.rows.find((r) => r.condition === c)!;

  it("lunar gravity is a missing observation and the gap to close", () => {
    expect(row("gravityG")).toMatchObject({ label: "MISSING_OBSERVATION", light: "red" });
    expect(moon.gap).toEqual({ condition: "gravityG", target: "gravity at 0.165 g" });
    expect(moon.doesNotTransfer[0]).toContain("not bounds");
  });
  it("lunar gravity is bracketed on one side only: orbit below, nothing above", () => {
    expect(moon.uncovered.map((r) => r.condition)).toEqual(["gravityG"]);
    expect(row("gravityG").sides).toMatchObject({ below: { value: 0 }, above: null });
  });
  it("FM2 air: 34% O2 has a tested run below and none above", () => {
    const fm2 = engineerReadout(sc("moon-fm2"), ds.runs);
    const o2 = fm2.rows.find((r) => r.condition === "o2MolPct")!;
    expect(fm2.uncovered.map((r) => r.condition)).toEqual(["gravityG", "o2MolPct"]);
    expect(o2.sides).toMatchObject({ below: { runId: "SAF-VI-2", value: 31 }, above: null });
  });
  it("30% O2 is matched by the SIBAL run, not by the PMMA runs at the same O2", () => {
    expect(row("o2MolPct").runIds).toEqual(["SAF-VI-2"]);
    if (allImported) expect(row("o2MolPct")).toMatchObject({ label: "PARTIAL_ANALOG", analogKind: "same_material_unverified", light: "yellow" });
  });
  it("70.3 kPa is only covered by a different material", () => {
    expect(row("pressureKPa")).toMatchObject({ label: "PARTIAL_ANALOG", analogKind: "other_material", runIds: ["SAF-V-2"] });
  });
  it("nearest tested condition depends on how oxygen is matched", () => {
    expect(moon.nearestTested.byMolPct?.runId).toBe("SAF-VI-2");
    expect(moon.nearestTested.byPartialPressure?.psiId).not.toBe("SAFFIRE-IVVI");
    expect(moon.nearestTested.disagree).toBe(true);
  });
  it("verifying some runs never changes which run is nearest", () => {
    const partly = ds.runs.map((r) => (r.psiId === "PSI-25" ? { ...r, status: "verified" as const } : r));
    const after = engineerReadout(sc("moon-challenge"), partly).nearestTested;
    expect(after.byMolPct?.runId).toBe("SAF-VI-2");
    expect(after.disagree).toBe(true);
  });
  it("ISS: nothing to transfer across gravity and no new experiment needed, only cross-checks", () => {
    const iss = engineerReadout(sc("iss"), ds.runs);
    expect(iss.doesNotTransfer.join(" ")).not.toContain("Gravity");
    expect(iss.gap).toBeNull();
    expect(iss.rows.every((r) => r.light !== "red")).toBe(true);
    if (allImported) {
      expect(iss.toVerify.length).toBeGreaterThan(0);
      expect(iss.limit).toContain("not yet cross-checked");
    }
  });
  it("never words a light as a safety verdict", () => {
    for (const s of scenarios) {
      expect(JSON.stringify(engineerReadout(Scenario.parse(s), ds.runs)).toLowerCase()).not.toMatch(/\bis safe\b|\bunsafe\b/);
    }
  });
});

describe("Missing Experiment planner on real data", () => {
  const moon = sc("moon-challenge");
  const plan = planExperiments(generateRuleCandidates(moon, ds.runs), ds.runs, moon, { budget: 3 });

  it("proposes lunar gravity first: one variable changed on a documented cotton-fiberglass run", () => {
    const top = plan.selected[0];
    expect(top.candidate.changes).toEqual([{ field: "gravityG", to: 0.165 }]);
    expect(top.check.factorial).toBe(false);
    expect(top.score.cell).toBe("empty");
    expect(top.robust).toBe(true);
    expect(top.stamp).toBe(PROPOSAL_STAMP);
    const anchor = ds.runs.find((r) => r.id === top.candidate.anchorRunId)!;
    expect(anchor.material.value).toContain("SIBAL");
    expect(top.badges.includes("Anchor not yet cross-checked")).toBe(anchor.status !== "verified");
  });
  it("refuses BASS-II anchors because their thickness is not documented", () => {
    const bass2 = plan.rejected.filter((r) => r.candidate.anchorRunId.startsWith("BASS2-"));
    expect(bass2.length).toBeGreaterThan(0);
    for (const r of bass2) {
      const failed = r.check.checks.filter((k) => !k.pass && k.required);
      expect(failed.map((k) => k.id)).toEqual(["HELD_DOCUMENTED"]);
      expect(failed[0].detail).toContain("thicknessMm");
    }
  });
  it("uncertainty and cost stay at zero: no NASA source provides them", () => {
    for (const p of plan.selected) expect([p.score.uncertainty, p.score.cost]).toEqual([0, 0]);
  });
  it("works for Mars through the same logic", () => {
    const mars = sc("mars");
    const top = planExperiments(generateRuleCandidates(mars, ds.runs), ds.runs, mars, { budget: 1 }).selected[0];
    expect(top.candidate.changes).toEqual([{ field: "gravityG", to: 0.38 }]);
  });
});

describe("ranking on real data", () => {
  const moon = sc("moon-challenge");
  const ranked = rankInvestigations(
    ds.investigations.map((i) => ({ investigation: i, runs: ds.runs.filter((r) => r.psiId === i.psiId), questionScore: 0 })), moon,
  );
  const reasons = (acronym: RegExp) => ranked.find((r) => r.psiId === ds.investigations.find((i) => acronym.test(i.acronym))!.psiId)!.reasons;

  it("ACME BRE is a material emulator, not a different fuel phase", () => {
    expect(reasons(/BRE/)).toContain("MATERIAL_EMULATOR");
    expect(reasons(/BRE/)).not.toContain("DIFFERENT_FUEL_PHASE");
  });
  it("E-FIELD Flames is tagged as a partial-gravity mimic for a lunar scenario", () => {
    expect(reasons(/E-FIELD/)).toContain("PARTIAL_G_MIMIC_EFIELD");
  });
});

describe("variable summary on real data", () => {
  it("BASS-II cotton-fiberglass runs differ only in flow direction; thickness is undocumented", () => {
    const rows = variableSummary(ds.runs.filter((r) => r.psiId === "PSI-25"));
    expect(rows.filter((r) => r.status === "varies").map((r) => r.field)).toEqual(["flowDirection"]);
    expect(rows.filter((r) => r.status === "undocumented").map((r) => r.field)).toEqual(["thicknessMm"]);
  });
});
