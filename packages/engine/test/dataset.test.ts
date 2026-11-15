import { describe, it, expect } from "vitest";
import datasetJson from "../../../data/dataset.json";
import demoPairs from "../../../data/demo-pairs.json";
import coverageJson from "../../../data/coverage.json";
import earthJson from "../../../data/earth_applications.json";
import scenariosJson from "../../../data/scenarios.json";
import { Dataset, Scenario, TRACKED, rankInvestigations, referee, type RefereeResult, type Tracked } from "../src";

const parsed = Dataset.safeParse(datasetJson);

describe("dataset.json", () => {
  it("parses against the Zod Dataset schema", () => {
    // On failure this prints each mismatch as "path: message".
    const issues = parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    expect(issues).toEqual([]);
  });

  it("is release 1.3.0, real data, not the fixture set", () => {
    expect(parsed.data?.version).toBe("1.3.0");
    expect(parsed.data?.fixture).toBe(false);
    expect(parsed.data?.runs).toHaveLength(12);
    expect(parsed.data?.investigations).toHaveLength(25);
  });

  it("keeps a null optional field as absent, never as a value", () => {
    const noNtrs = parsed.data?.sources.find((s) => s.id === "S-PMMA"); // a journal article: ntrsId is null in the file
    expect(noNtrs).toBeDefined();
    expect(noNtrs?.ntrsId).toBeUndefined();
  });

  it("only cites sources and investigations that exist", () => {
    const ds = parsed.data!;
    const sourceIds = new Set(ds.sources.map((s) => s.id));
    const psiIds = new Set(ds.investigations.map((i) => i.psiId));
    for (const run of ds.runs) {
      expect(psiIds.has(run.psiId), `${run.id} -> ${run.psiId}`).toBe(true);
      for (const f of TRACKED) {
        const v = run[f];
        if (v.value !== null) expect(sourceIds.has(v.sourceId ?? ""), `${run.id}.${f} source`).toBe(true);
        else expect(v.missingReason, `${run.id}.${f} missingReason`).toBeDefined();
      }
      // O2 partial pressure is COMPUTED (with its formula) when both inputs are documented, UNKNOWN otherwise
      if (run.o2MolPct.value !== null && run.pressureKPa.value !== null) {
        expect(run.o2PartialKPa.type, `${run.id} pO2 type`).toBe("COMPUTED");
        expect(run.o2PartialKPa.formula, `${run.id} pO2 formula`).toBeTruthy();
        expect(run.o2PartialKPa.value, `${run.id} pO2 value`).toBeCloseTo((run.o2MolPct.value / 100) * run.pressureKPa.value, 1);
      } else {
        expect(run.o2PartialKPa.type, `${run.id} pO2 type`).toBe("UNKNOWN");
        expect(run.o2PartialKPa.value, `${run.id} pO2 value`).toBeNull();
        expect(run.o2PartialKPa.missingReason, `${run.id} pO2 missingReason`).toBeDefined();
      }
    }
  });
});

describe("release side files", () => {
  const ds = parsed.data!;

  it("coverage.json describes this dataset", () => {
    expect(coverageJson).toMatchObject({
      dataVersion: ds.version,
      investigationsIndexed: ds.investigations.length,
      runsImported: ds.runs.length,
      runsVerified: ds.runs.filter((r) => r.status === "verified").length,
      relationshipsMapped: ds.edges.length,
    });
  });

  it("every Space-to-Earth item has a source link and only names investigations in the dataset", () => {
    const psiIds = new Set(ds.investigations.map((i) => i.psiId));
    expect(earthJson.applications.length).toBeGreaterThan(0);
    for (const a of earthJson.applications) {
      expect(a.source, a.id).toBeTruthy();
      expect(a.url, a.id).toMatch(/^https:\/\//);
      for (const id of a.relatedPsiIds) expect(psiIds.has(id), `${a.id} -> ${id}`).toBe(true);
    }
  });

  it("an investigation with no documented oxygen or pressure is never scored", () => {
    const has = (psiId: string, f: "o2MolPct" | "pressureKPa") => {
      const inv = ds.investigations.find((i) => i.psiId === psiId)!;
      return !!inv.ranges?.[f] || ds.runs.some((r) => r.psiId === psiId && r[f].value !== null);
    };
    const inputs = ds.investigations.map((inv) => ({ investigation: inv, runs: ds.runs.filter((r) => r.psiId === inv.psiId), questionScore: 0 }));
    let unassessable = 0;
    for (const sc of scenariosJson.map((s) => Scenario.parse(s))) {
      for (const r of rankInvestigations(inputs, sc)) {
        const none = !has(r.psiId, "o2MolPct") && !has(r.psiId, "pressureKPa");
        expect(r.cannotAssess, `${sc.id} ${r.psiId}`).toBe(none);
        expect(r.score === null, `${sc.id} ${r.psiId}`).toBe(none);
        if (none) unassessable++;
      }
    }
    expect(unassessable).toBeGreaterThan(0); // 1.3.0 has cards without either range
  });
});

describe("locked Referee demo pairs", () => {
  const run = (id: string) => {
    const r = parsed.data?.runs.find((x) => x.id === id);
    if (!r) throw new Error(`run ${id} is not in dataset.json`);
    return r;
  };
  const judge = (id: string): RefereeResult => {
    const p = demoPairs.pairs.find((x) => x.id === id)!;
    expect(TRACKED).toContain(p.target);
    return referee(run(p.a), run(p.b), p.target as Tracked);
  };
  const expected = (id: string) => demoPairs.pairs.find((x) => x.id === id)!.expected;

  it("A: BASS vs Saffire-I on sample size cannot be isolated", () => {
    const r = judge("A");
    expect(r.verdict).toBe(expected("A"));
    expect(r.verdict).toBe("CANNOT_ISOLATE");
    expect(r.confounds).toEqual(["geometry", "flowCmS", "ductSize", "apparatus"]);
  });

  it("C: Saffire IV-1 vs VI-2 on oxygen cannot be isolated, because pressure changed too", () => {
    const r = judge("C");
    expect(r.verdict).toBe(expected("C"));
    expect(r.verdict).toBe("CANNOT_ISOLATE");
    expect(r.confounds).toEqual(["pressureKPa"]);
  });

  // Saffire I-III pressure was not in the cited table and is now "not documented" (eval/verification.md).
  // Nothing else differs but the flow (20 vs 25 cm/s, outside the 10% tolerance), so this is the honest
  // "Can't confirm" example: it would be a clean comparison if the pressure were documented.
  it("B: Saffire I-1 vs III-1 on flow has no confound, but pressure is undocumented on both runs", () => {
    const r = judge("B");
    expect(r.confounds).toEqual([]);
    expect(r.undocumented).toEqual(["pressureKPa"]);
  });
  it("B: gives the expected CANT_CONFIRM", () => {
    expect(judge("B").verdict).toBe(expected("B"));
    expect(judge("B").verdict).toBe("CANT_CONFIRM");
  });
});
