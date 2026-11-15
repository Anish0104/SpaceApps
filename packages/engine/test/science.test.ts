/**
 * Science-engine tests: ranking reason codes, Referee extras, evidence labels,
 * engineer readout and the Missing Experiment planner.
 * Uses data/fixtures.json (FAKE values) plus synthetic runs built here. Never cite either.
 */
import { describe, it, expect } from "vitest";
import fixtures from "../../../data/fixtures.json";
import scenarios from "../../../data/scenarios.json";
import tolerances from "../../../data/tolerances.json";
import {
  Dataset, Scenario, type Run, type Investigation,
  rankInvestigations, fuelApplicability, missionMatch, inferSafetyRole,
  referee, variableSummary, TOLERANCE, FLOW_REL_TOL,
  PO2_TOLERANCE_KPA, labelCondition, labelScenario, nearestTested, findConflicts, closestOnEachSide,
  engineerReadout,
  ExperimentCandidate, generateRuleCandidates, controlCheck, scoreCandidate, planExperiments, projectRun,
  PROPOSAL_STAMP,
} from "../src";

const ds = Dataset.parse(fixtures);
const sc = (id: string) => Scenario.parse(scenarios.find((s) => s.id === id));
const run = (id: string) => ds.runs.find((r) => r.id === id) as Run;
const inv = (id: string) => ds.investigations.find((i) => i.psiId === id) as Investigation;

/** Copy a fixture run with a few fields overridden. */
function mk(base: string, id: string, over: Partial<Record<keyof Run, unknown>> & { status?: Run["status"] } = {}): Run {
  const r = structuredClone(run(base)) as Run;
  r.id = id;
  for (const [k, v] of Object.entries(over)) {
    if (k === "status" || k === "fuelPhase" || k === "outcomes") (r as Record<string, unknown>)[k] = v;
    else (r as unknown as Record<string, { value: unknown }>)[k].value = v;
  }
  return r;
}

describe("tolerances", () => {
  it("engine constants match data/tolerances.json", () => {
    expect(TOLERANCE.pressureKPa).toBe(tolerances.pressureKPa);
    expect(TOLERANCE.o2MolPct).toBe(tolerances.o2MolPct);
    expect(TOLERANCE.gravityG).toBe(tolerances.gravityG);
    expect(TOLERANCE.thicknessMm).toBe(tolerances.thicknessMm);
    expect(TOLERANCE.sizeMm).toBe(tolerances.sizeMm);
    expect(FLOW_REL_TOL).toBe(tolerances.flowRelative);
    expect(PO2_TOLERANCE_KPA).toBe(tolerances.o2PartialKPa);
  });
});

describe("ranking reason codes", () => {
  const moon = sc("moon-challenge");
  const inputs = ds.investigations.map((i) => ({ investigation: i, runs: ds.runs.filter((r) => r.psiId === i.psiId), questionScore: 0 }));

  it("flags orbit-only gravity for a lunar scenario", () => {
    const bass = rankInvestigations(inputs, moon).find((r) => r.psiId === "PSI-26");
    expect(bass?.reasons).toContain("GRAVITY_ORBIT_ONLY");
    expect(bass?.reasons).toContain("GRAVITY_DIFFERS");
  });
  it("does not flag orbit-only for the ISS scenario", () => {
    const bass = rankInvestigations(inputs, sc("iss")).find((r) => r.psiId === "PSI-26");
    expect(bass?.reasons).not.toContain("GRAVITY_ORBIT_ONLY");
  });
  it("names missing pressure instead of scoring it as zero", () => {
    const same = rankInvestigations(inputs, moon).find((r) => r.psiId === "PSI-102");
    expect(same?.reasons).toContain("NO_PRESSURE_DATA");
    expect(same?.notDocumented).toContain("pressureKPa");
  });
  it("treats ACME BRE as a material emulator, not a different fuel phase", () => {
    const bre = { ...inv("PSI-159"), psiId: "TEST-BRE", acronym: "ACME BRE", name: "Burning Rate Emulator" };
    expect(fuelApplicability(bre, [], moon)).toEqual({ F: 0.6, reason: "MATERIAL_EMULATOR" });
    expect(fuelApplicability(inv("PSI-159"), [], moon).reason).toBe("DIFFERENT_FUEL_PHASE");
  });
  it("never reads CFI-G burner-gas oxygen as a cabin atmosphere, even when a range is entered", () => {
    const cfig = { ...inv("PSI-159"), ranges: { o2MolPct: [21, 85] as [number, number], pressureKPa: [101.3, 101.3] as [number, number], gravityG: [0, 0] as [number, number] } };
    const m = missionMatch(cfig, [], moon);
    expect(m.reasons).toContain("O2_IS_BURNER_GAS");
    expect(m.reasons).not.toContain("O2_WITHIN_5PCT");
    expect(m.reasons).not.toContain("PO2_CLOSE");
    expect(m.notDocumented).toContain("o2MolPct");
    // the same range on any other gas experiment is still read as an atmosphere
    const other = { ...cfig, psiId: "TEST-GAS", acronym: "ACME s-Flame", name: "s-Flame" };
    expect(missionMatch(other, [], moon).reasons).toContain("O2_WITHIN_5PCT");
  });
  it("tags E-FIELD Flames as a partial-gravity mimic without changing its score", () => {
    const base = { ...inv("PSI-159"), ranges: { gravityG: [0, 0] as [number, number], o2MolPct: [21, 21] as [number, number] } };
    const efield = { ...base, acronym: "ACME E-FIELD Flames" };
    const a = missionMatch(base, [], moon), b = missionMatch(efield, [], moon);
    expect(b.reasons).toContain("PARTIAL_G_MIMIC_EFIELD");
    expect(a.reasons).not.toContain("PARTIAL_G_MIMIC_EFIELD");
    expect(b.M).toBe(a.M);
    expect(missionMatch(efield, [], sc("iss")).reasons).not.toContain("PARTIAL_G_MIMIC_EFIELD");
  });
});

describe("safety role from the question", () => {
  it("names a role only when exactly one role's words appear", () => {
    expect(inferSafetyRole("How does smoke-particle size differ, and what does that mean for detector thresholds?")).toBe("detection");
    expect(inferSafetyRole("What do the tests say about extinguishing a low-flow flame?")).toBe("suppression");
    expect(inferSafetyRole("Which fabric has the lowest flammability limit?")).toBe("prevention");
    expect(inferSafetyRole("Where is the biggest evidence gap for a lunar habitat?")).toBeNull();
    expect(inferSafetyRole("Does suppressing a fire change the smoke a detector sees?")).toBeNull(); // two roles
    // flame-physics terms are their own role, and are never read as detection or prevention words
    expect(inferSafetyRole("What is the smoke point of gas jet diffusion flames in microgravity?")).toBe("physics");
    expect(inferSafetyRole("Can an electric field change flame behavior in microgravity?")).toBe("physics");
    expect(inferSafetyRole("Do cool flames re-ignite after they go out?")).toBe("physics");
    expect(inferSafetyRole("How easily does this fabric ignite?")).toBe("prevention");
    // physics terms mixed with another role's words name two roles: left alone
    expect(inferSafetyRole("Do cool flames persist after an apparent extinction event?")).toBeNull();
    expect(inferSafetyRole("Does soot from a diffusion flame set off a smoke detector?")).toBeNull();
    // extinction limits are suppression science
    expect(inferSafetyRole("What oxygen levels mark the extinction limit for fuel droplet flames?")).toBe("suppression");
    expect(inferSafetyRole("How does thickness affect flame spread and extinction for PMMA?")).toBeNull(); // prevention + suppression
  });
  it("a role match is a reason code and never turns a cannot-assess card into a score", () => {
    const inputs = ds.investigations.map((i) => ({ investigation: i, runs: ds.runs.filter((r) => r.psiId === i.psiId), questionScore: i.psiId === "PSI-47" ? 1 : 0 }));
    const res = rankInvestigations(inputs, sc("moon-challenge"), "detection");
    const daft = res.find((r) => r.psiId === "PSI-47")!;
    expect(daft.reasons).toContain("DETECTION_ROLE_MATCH");
    expect(daft.score).toBeNull(); // still "cannot assess applicability": no number shown
  });
});

describe("referee extras", () => {
  it("liquid vs solid fuel is never isolable, even with identical tracked fields", () => {
    const liquid = mk("FIX-BASS-1", "T-LIQ", { fuelPhase: "liquid", o2MolPct: 30 });
    const r = referee(run("FIX-BASS-1"), liquid, "o2MolPct");
    expect(r.verdict).toBe("CANNOT_ISOLATE");
    expect(r.notes[0]).toContain("liquid");
  });
  it("scale pair (small duct vs large module) cannot isolate sample size", () => {
    const r = referee(run("FIX-BASS-4"), run("FIX-SAFF1-1"), "sizeMm");
    expect(r.verdict).toBe("CANNOT_ISOLATE");
    expect(r.confounds).toEqual(expect.arrayContaining(["ductSize", "apparatus"]));
  });
  it("pressure and O2 changing together cannot isolate pressure", () => {
    const a = mk("FIX-SAFF1-1", "T-IV1", { pressureKPa: 100.0, o2MolPct: 22.0 });
    const b = mk("FIX-SAFF1-1", "T-VI2", { pressureKPa: 54.1, o2MolPct: 31.0 });
    const r = referee(a, b, "pressureKPa");
    expect(r.verdict).toBe("CANNOT_ISOLATE");
    expect(r.confounds).toEqual(["o2MolPct"]);
  });
  it("summarizes which variables an investigation varied", () => {
    const rows = variableSummary(ds.runs.filter((r) => r.psiId === "PSI-26"));
    const status = (f: string) => rows.find((x) => x.field === f)?.status;
    expect(status("material")).toBe("varies");
    expect(status("flowCmS")).toBe("varies");
    expect(status("pressureKPa")).toBe("constant");
    expect(rows.find((x) => x.field === "flowCmS")?.undocumentedRunIds).toEqual(["FIX-BASS-3"]);
  });
});

describe("evidence labels", () => {
  it("ISS conditions have a direct match from the verified run", () => {
    const labels = labelScenario(sc("iss"), ds.runs);
    expect(labels.map((l) => l.condition)).toEqual(["gravityG", "o2MolPct", "o2PartialKPa", "pressureKPa", "flowCmS"]);
    expect(labels.every((l) => l.label === "DIRECT_MATCH")).toBe(true);
    expect(labels[0].runIds).toContain("FIX-BASS-1");
  });
  it("lunar gravity, O2 and pressure are missing observations; material is direct", () => {
    const moon = sc("moon-challenge");
    expect(labelCondition("gravityG", moon, ds.runs)?.label).toBe("MISSING_OBSERVATION");
    expect(labelCondition("o2MolPct", moon, ds.runs)?.label).toBe("MISSING_OBSERVATION");
    expect(labelCondition("pressureKPa", moon, ds.runs)?.label).toBe("MISSING_OBSERVATION");
    expect(labelCondition("material", moon, ds.runs)?.label).toBe("DIRECT_MATCH");
    expect(labelCondition("flowCmS", moon, ds.runs)).toBeNull(); // scenario does not specify flow
  });
  it("an unverified match is only a partial analog", () => {
    const e = labelCondition("o2MolPct", { ...sc("iss"), o2MolPct: 17 }, ds.runs);
    expect(e?.label).toBe("PARTIAL_ANALOG");
    expect(e?.runIds).toEqual(["FIX-BASS2-1"]);
  });
  it("a matching run of another material is only a partial analog", () => {
    const pmma = mk("FIX-BASS-1", "T-PMMA", { material: "PMMA", o2MolPct: 30 });
    const e = labelCondition("o2MolPct", sc("moon-challenge"), [...ds.runs, pmma]);
    expect(e?.label).toBe("PARTIAL_ANALOG");
  });
  it("undocumented field on the only runs -> unknown metadata", () => {
    const e = labelCondition("flowCmS", { ...sc("iss"), flowCmS: 40 }, [run("FIX-BASS-3")]);
    expect(e?.label).toBe("UNKNOWN_METADATA");
  });
  it("verified runs at identical conditions that disagree -> conflicting", () => {
    const twin = mk("FIX-BASS-1", "T-TWIN", { status: "verified" });
    twin.outcomes[0].value.value = 2.0;
    expect(findConflicts([run("FIX-BASS-1"), twin])).toHaveLength(1);
    const e = labelCondition("o2MolPct", sc("iss"), [run("FIX-BASS-1"), twin]);
    expect(e?.label).toBe("CONFLICTING");
    expect(e?.runIds).toEqual(["FIX-BASS-1", "T-TWIN"]);
  });
  it("finds the closest run on each side of a target, and says when a side is empty", () => {
    const lo = mk("FIX-BASS-1", "T-LO", { o2MolPct: 17 });
    const mid = mk("FIX-BASS-1", "T-MID", { o2MolPct: 26 });
    const hi = mk("FIX-BASS-1", "T-HI", { o2MolPct: 40 });
    const undocumented = mk("FIX-BASS-1", "T-NULL", { o2MolPct: null });
    const sides = closestOnEachSide("o2MolPct", 30, [lo, mid, hi, undocumented]);
    expect(sides.below).toMatchObject({ runId: "T-MID", value: 26, delta: -4 });
    expect(sides.above).toMatchObject({ runId: "T-HI", value: 40, delta: 10 });
    expect(closestOnEachSide("o2MolPct", 10, [lo, mid, hi])).toMatchObject({ below: null, above: { runId: "T-LO" } });
    expect(closestOnEachSide("gravityG", 0.165, [lo]).above).toBeNull(); // only orbit runs: nothing above
    expect(closestOnEachSide("o2MolPct", 26, [mid])).toEqual({ below: null, above: null }); // a run at the target is on neither side
  });
  it("labels carry the sides; material has none", () => {
    const moon = sc("moon-challenge");
    expect(labelCondition("gravityG", moon, ds.runs)?.sides).toMatchObject({ below: { value: 0 }, above: null });
    expect(labelCondition("material", moon, ds.runs)?.sides).toBeNull();
  });
  it("a far verified run never hides a near unverified one; verification only breaks ties", () => {
    const far = mk("FIX-BASS-1", "T-FAR", { o2MolPct: 21, status: "verified" });
    const near = mk("FIX-BASS-1", "T-NEAR", { o2MolPct: 31, status: "imported" });
    expect(nearestTested(sc("moon-challenge"), [far, near]).byMolPct).toMatchObject({ runId: "T-NEAR", verified: false });
    const tieA = mk("FIX-BASS-1", "T-TIE-A", { o2MolPct: 29, status: "imported" });
    const tieB = mk("FIX-BASS-1", "T-TIE-B", { o2MolPct: 31, status: "verified" });
    expect(nearestTested(sc("moon-challenge"), [tieA, tieB]).byMolPct?.runId).toBe("T-TIE-B");
  });
  it("nearest tested condition differs by mole fraction vs partial pressure", () => {
    // same 30% O2 at low pressure vs 21% at sea level: the low-O2% run is closer in partial pressure
    const a = mk("FIX-BASS-1", "T-A", { o2MolPct: 30, pressureKPa: 30 });   // pO2 9.0
    const b = mk("FIX-BASS-1", "T-B", { o2MolPct: 21, pressureKPa: 101.3 }); // pO2 21.3
    const n = nearestTested(sc("moon-challenge"), [a, b]); // target 30% / 70.3 kPa -> pO2 21.1
    expect(n.byMolPct?.runId).toBe("T-A");
    expect(n.byPartialPressure?.runId).toBe("T-B");
    expect(n.disagree).toBe(true);
  });
});

describe("engineer readout", () => {
  it("lunar scenario: red lights, gravity gap first, never a safety claim", () => {
    const r = engineerReadout(sc("moon-challenge"), ds.runs);
    const light = (c: string) => r.rows.find((x) => x.condition === c)?.light;
    expect(light("gravityG")).toBe("red");
    expect(light("material")).toBe("green");
    expect(r.gap?.condition).toBe("gravityG");
    expect(r.uncovered.map((x) => x.condition)).toEqual(["gravityG", "o2MolPct", "pressureKPa"]); // O2 partial pressure is covered: 21% at 101.3 kPa is the same pO2
    expect(r.doesNotTransfer.join(" ")).toContain("not bounds");
    expect(r.rows.find((x) => x.condition === "o2PartialKPa")?.targetType).toBe("COMPUTED");
    expect(r.rows.find((x) => x.condition === "o2MolPct")?.targetType).toBe("ASSUMED");
    expect(JSON.stringify(r).toLowerCase()).not.toMatch(/\bis safe\b|\bunsafe\b/);
  });
  it("ISS scenario: all green, no gap", () => {
    const r = engineerReadout(sc("iss"), ds.runs);
    expect(r.rows.every((x) => x.light === "green")).toBe(true);
    expect(r.gap).toBeNull();
    expect(r.uncovered).toEqual([]);
    expect(r.doesNotTransfer).toEqual([]);
  });
});

describe("planner", () => {
  const moon = sc("moon-challenge");
  const cands = generateRuleCandidates(moon, ds.runs, { verifiedOnly: true });

  it("generates one-variable candidates from the verified anchor, plus a flagged factorial", () => {
    expect(cands.map((c) => c.id).sort()).toEqual([
      "rule-FIX-BASS-1-atmosphere", "rule-FIX-BASS-1-gravityG", "rule-FIX-BASS-1-o2MolPct", "rule-FIX-BASS-1-pressureKPa",
    ]);
    const fact = controlCheck(cands.find((c) => c.id.endsWith("atmosphere"))!, ds.runs);
    expect(fact.pass).toBe(true);
    expect(fact.factorial).toBe(true);
  });
  it("projected run keeps held values and recomputes O2 partial pressure", () => {
    const p = projectRun(cands.find((c) => c.id.endsWith("pressureKPa"))!, run("FIX-BASS-1"));
    expect(p.pressureKPa).toMatchObject({ value: 70.3, type: "ASSUMED" });
    expect(p.o2PartialKPa.type).toBe("COMPUTED");
    expect(p.o2PartialKPa.value).toBeCloseTo(0.21 * 70.3, 5);
    expect(p.material.value).toBe("SIBAL");
  });
  it("control check rejects unknown anchors, no-op changes, undocumented held values and duplicates", () => {
    const c = (over: object) => ExperimentCandidate.parse({ id: "x", origin: "ai", anchorRunId: "FIX-BASS-1", changes: [{ field: "gravityG", to: 0.165 }], ...over });
    const failed = (cc: ReturnType<typeof controlCheck>) => cc.checks.filter((k) => !k.pass && k.required).map((k) => k.id);
    expect(failed(controlCheck(c({ anchorRunId: "NOPE" }), ds.runs))).toEqual(["ANCHOR_EXISTS"]);
    expect(failed(controlCheck(c({ changes: [{ field: "gravityG", to: 0.01 }] }), ds.runs))).toContain("CHANGE_IS_REAL");
    expect(failed(controlCheck(c({ anchorRunId: "FIX-BASS-3" }), ds.runs))).toEqual(["HELD_DOCUMENTED"]);
    // moving BASS-1 flow 10 -> 20 just recreates FIX-BASS-4
    expect(failed(controlCheck(c({ changes: [{ field: "flowCmS", to: 20 }] }), ds.runs))).toEqual(["FILLS_GAP"]);
    expect(controlCheck(c({}), ds.runs).pass).toBe(true);
  });
  it("uncertainty and cost only count with a source", () => {
    expect(() => ExperimentCandidate.parse({ id: "x", origin: "ai", anchorRunId: "a", changes: [{ field: "gravityG", to: 1 }], cost: { value: 0.5 } })).toThrow();
    const s = scoreCandidate(cands[0], ds.runs, moon);
    expect(s?.uncertainty).toBe(0);
    expect(s?.cost).toBe(0);
  });
  it("picks the lunar-gravity run first, robustly, with the stamp", () => {
    const plan = planExperiments(cands, ds.runs, moon, { budget: 1 });
    expect(plan.selected).toHaveLength(1);
    const top = plan.selected[0];
    expect(top.candidate.id).toBe("rule-FIX-BASS-1-gravityG");
    expect(top.score.cell).toBe("empty");
    expect(top.badges).not.toContain("Anchor not yet cross-checked");
    expect(top.score.discrimination).toBe(1);
    expect(top.robust).toBe(true);
    expect(top.badges).toEqual(expect.arrayContaining(["Rule-generated", "Rules-verified", "Robust"]));
    expect(top.stamp).toBe(PROPOSAL_STAMP);
  });
  it("a larger budget never repeats a pick and reports rejected candidates with reasons", () => {
    const bad = ExperimentCandidate.parse({ id: "ai-bad", origin: "ai", anchorRunId: "FIX-BASS-3", changes: [{ field: "gravityG", to: 0.165 }] });
    const plan = planExperiments([...cands, bad], ds.runs, moon, { budget: 3 });
    const ids = plan.selected.map((p) => p.candidate.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(1);
    expect(plan.rejected.map((r) => r.candidate.id)).toEqual(["ai-bad"]);
  });
  it("imported anchors are allowed by default but badged as not cross-checked", () => {
    const all = generateRuleCandidates(moon, ds.runs);
    expect(all.length).toBeGreaterThan(cands.length);
    const plan = planExperiments(all.filter((c) => c.anchorRunId === "FIX-BASS-4"), ds.runs, moon, { budget: 1 });
    expect(plan.selected[0].badges).toContain("Anchor not yet cross-checked");
  });
  it("a cell that only holds another material is a smaller gap than an untested one", () => {
    // PMMA already tested in orbit at 70 kPa: moving SIBAL there fills less than moving it to lunar gravity
    const pmma = mk("FIX-BASS-1", "T-PMMA-70", { material: "PMMA", pressureKPa: 70.3 });
    const runs = [...ds.runs, pmma];
    const byId = (id: string) => scoreCandidate(cands.find((c) => c.id === id)!, runs, moon)!;
    expect(byId("rule-FIX-BASS-1-pressureKPa").cell).toBe("other_material_only");
    expect(byId("rule-FIX-BASS-1-gravityG").cell).toBe("empty");
    expect(byId("rule-FIX-BASS-1-gravityG").V).toBeGreaterThan(byId("rule-FIX-BASS-1-pressureKPa").V);
  });
  it("is deterministic", () => {
    const a = planExperiments(cands, ds.runs, moon, { budget: 3 });
    const b = planExperiments(cands, ds.runs, moon, { budget: 3 });
    expect(a).toEqual(b);
  });
});
