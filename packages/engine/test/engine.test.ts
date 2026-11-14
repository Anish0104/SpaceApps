import { describe, it, expect } from "vitest";
import fixtures from "../../../data/fixtures.json";
import scenarios from "../../../data/scenarios.json";
import {
  Dataset, Scenario, psiToKPa, o2PartialKPa, gravitySimilarity,
  rankInvestigations, referee, type Run,
} from "../src";

const ds = Dataset.parse(fixtures);
const sc = (id: string) => Scenario.parse(scenarios.find((s) => s.id === id));
const run = (id: string) => ds.runs.find((r) => r.id === id) as Run;

describe("units", () => {
  it("converts psi to kPa", () => expect(psiToKPa(14.7)).toBeCloseTo(101.35, 1));
  it("computes O2 partial pressure", () => {
    expect(o2PartialKPa(21, 101.3)).toBeCloseTo(21.3, 1);
    expect(o2PartialKPa(0.34, 56.5)).toBeCloseTo(19.2, 1); // fraction input
  });
  it("gravity similarity is a heuristic, symmetric for orbit and mars around moon", () => {
    expect(gravitySimilarity(0.165, 0)).toBe(0.5);
    expect(gravitySimilarity(0.165, 0.38)).toBe(0.5);
    expect(gravitySimilarity(0.165, 1)).toBe(0);
  });
});

describe("fixtures", () => {
  it("parse against the schema and are flagged as fixtures", () => expect(ds.fixture).toBe(true));
});

describe("ranking", () => {
  const inputs = ds.investigations.map((inv) => ({
    investigation: inv, runs: ds.runs.filter((r) => r.psiId === inv.psiId), questionScore: 0,
  }));
  it("returns every investigation, scored ones first", () => {
    const res = rankInvestigations(inputs, sc("moon-challenge"));
    expect(res).toHaveLength(ds.investigations.length);
    const firstNull = res.findIndex((r) => r.score === null);
    if (firstNull >= 0) expect(res.slice(firstNull).every((r) => r.score === null)).toBe(true);
  });
  it("flags cannot-assess when O2 and pressure are both missing", () => {
    const res = rankInvestigations(inputs, sc("moon-challenge"));
    const nd = res.find((r) => r.psiId === "PSI-47");
    expect(nd?.cannotAssess).toBe(true);
    expect(nd?.score).toBeNull();
  });
});

describe("referee", () => {
  it("geometry target with material also changed -> CANNOT_ISOLATE", () => {
    const r = referee(run("FIX-BASS-1"), run("FIX-BASS-2"), "geometry");
    expect(r.verdict).toBe("CANNOT_ISOLATE");
    expect(r.confounds).toContain("material");
  });
  it("same target value -> NO_CONTRAST", () => {
    expect(referee(run("FIX-BASS-1"), run("FIX-BASS-1"), "o2MolPct").verdict).toBe("NO_CONTRAST");
  });
  it("missing field -> CANT_CONFIRM", () => {
    expect(referee(run("FIX-BASS-1"), run("FIX-BASS-3"), "flowCmS").verdict).toBe("CANT_CONFIRM");
  });
  it("only target differs -> CAN_ISOLATE", () => {
    expect(referee(run("FIX-BASS-1"), run("FIX-BASS-4"), "flowCmS").verdict).toBe("CAN_ISOLATE");
  });
});
