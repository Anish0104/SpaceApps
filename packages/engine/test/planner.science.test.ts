/**
 * Scientific-reasoning regression tests for the planner: a projected experiment must never present
 * a value it cannot compute, and "already tested" must distinguish a confirmed duplicate from a
 * run it cannot compare for lack of documented conditions. Absence of data is never a match.
 */
import { describe, it, expect } from "vitest";
import fixtures from "../../../data/fixtures.json";
import real from "../../../data/dataset.json";
import scenarios from "../../../data/scenarios.json";
import {
  Dataset, Scenario, ExperimentCandidate, controlCheck, projectRun, planExperiments, generateRuleCandidates, type Run,
} from "../src";

const fx = Dataset.parse(fixtures);
const ds = Dataset.parse(real);
const sc = (id: string) => Scenario.parse(scenarios.find((s) => s.id === id));
const run = (id: string, from: Dataset = fx) => from.runs.find((r) => r.id === id) as Run;
const mk = (base: string, id: string, over: Record<string, unknown>): Run => {
  const r = structuredClone(run(base)) as Run; r.id = id;
  for (const [k, v] of Object.entries(over)) (r as unknown as Record<string, { value: unknown }>)[k].value = v;
  return r;
};

describe("projectRun never fabricates a partial pressure", () => {
  it("is COMPUTED with a formula when O2 and pressure are both present", () => {
    const c = ExperimentCandidate.parse({ id: "x", origin: "rule", anchorRunId: "FIX-BASS-1", changes: [{ field: "o2MolPct", to: 30 }] });
    const p = projectRun(c, run("FIX-BASS-1"));
    expect(p.o2PartialKPa).toMatchObject({ type: "COMPUTED", value: expect.any(Number) });
    expect(p.o2PartialKPa.formula).toBeTruthy();
  });
  it("is UNKNOWN with no formula when pressure is undocumented", () => {
    const anchor = mk("FIX-BASS-1", "NOP", { pressureKPa: null });
    const c = ExperimentCandidate.parse({ id: "x", origin: "rule", anchorRunId: "NOP", changes: [{ field: "o2MolPct", to: 30 }] });
    const p = projectRun(c, anchor);
    expect(p.o2PartialKPa).toMatchObject({ value: null, type: "UNKNOWN", missingReason: "not_documented" });
    expect(p.o2PartialKPa.formula).toBeUndefined();
  });
});

describe("duplicate detection does not treat missing data as a match", () => {
  const anchor = run("SAF-VI-3", ds);                 // a fully documented lunar-relevant anchor
  const cand = (field: string, to: number) => ExperimentCandidate.parse({ id: `c-${field}`, origin: "rule", anchorRunId: anchor.id, changes: [{ field, to }] });

  it("a real one-variable change away from every run fills a gap", () => {
    const check = controlCheck(cand("gravityG", 0.165), ds.runs);
    expect(check.checks.find((k) => k.id === "FILLS_GAP")).toMatchObject({ pass: true, required: true });
  });
  it("an anchor with an undocumented held field is not silently called a duplicate or a gap", () => {
    // SAF-I-1 has no pressure; moving its gravity cannot be confirmed as a duplicate of anything
    const c = ExperimentCandidate.parse({ id: "x", origin: "rule", anchorRunId: "SAF-I-1", changes: [{ field: "gravityG", to: 0.165 }] });
    const fills = controlCheck(c, ds.runs).checks.find((k) => k.id === "FILLS_GAP")!;
    expect(fills.detail).not.toContain("Already covered");
  });
});

describe("planner proposals carry honest provenance", () => {
  const plan = planExperiments(generateRuleCandidates(sc("moon-challenge"), ds.runs), ds.runs, sc("moon-challenge"), { budget: 1 });
  it("never claims a scientist verified the experiment, and flags an unverified anchor", () => {
    const top = plan.selected[0];
    expect(top.badges).toContain("Control checks passed (feasibility and safety not assessed)");
    expect(top.badges).not.toContain("Rules-verified");
    if (run(top.candidate.anchorRunId, ds).status !== "verified") expect(top.badges).toContain("Anchor not yet cross-checked");
  });
  it("counts uncertainty and cost as zero because no NASA source provides them", () => {
    expect(plan.selected[0].score.uncertainty).toBe(0);
    expect(plan.selected[0].score.cost).toBe(0);
  });
});
