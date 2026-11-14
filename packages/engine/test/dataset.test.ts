import { describe, it, expect } from "vitest";
import datasetJson from "../../../data/dataset-v1.0.json";
import demoPairs from "../../../data/demo-pairs.json";
import { Dataset, TRACKED, referee, type RefereeResult, type Tracked } from "../src";

const parsed = Dataset.safeParse(datasetJson);

describe("dataset-v1.0.json", () => {
  it("parses against the Zod Dataset schema", () => {
    // On failure this prints each mismatch as "path: message".
    const issues = parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    expect(issues).toEqual([]);
  });

  it("is real data, not the fixture set", () => {
    expect(parsed.data?.fixture).toBe(false);
    expect(parsed.data?.runs).toHaveLength(13);
    expect(parsed.data?.investigations).toHaveLength(9);
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
      expect(run.o2PartialKPa.type).toBe("COMPUTED");
      expect(run.o2PartialKPa.formula).toBeTruthy();
    }
  });
});

describe("locked Referee demo pairs", () => {
  const run = (id: string) => {
    const r = parsed.data?.runs.find((x) => x.id === id);
    if (!r) throw new Error(`run ${id} is not in dataset-v1.0.json`);
    return r;
  };
  const judge = (id: string): RefereeResult => {
    const p = demoPairs.pairs.find((x) => x.id === id)!;
    expect(TRACKED).toContain(p.target);
    return referee(run(p.a), run(p.b), p.target as Tracked);
  };
  const expected = (id: string) => demoPairs.pairs.find((x) => x.id === id)!.expected;

  it("A: BASS-II vs Saffire-I on sample size cannot be isolated", () => {
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

  // KNOWN MISMATCH, not forced. The team expects CAN_ISOLATE for pair B. The comparison is clean
  // (no confounds, nothing undocumented), but the Referee's flow tolerance is 20% of the larger
  // value, and 20 vs 25 cm/s differ by exactly 20%, so the engine calls the flow "the same" and
  // returns NO_CONTRAST. Whoever owns the tolerance decides; then flip the two tests below.
  it("B: Saffire I-1 vs III-1 on flow is a clean comparison", () => {
    const r = judge("B");
    expect(r.confounds).toEqual([]);
    expect(r.undocumented).toEqual([]);
  });
  it("B: currently returns NO_CONTRAST (20 vs 25 cm/s sits on the 20% flow tolerance)", () => {
    expect(judge("B").verdict).toBe("NO_CONTRAST");
  });
  it.fails("B: gives the expected CAN_ISOLATE", () => {
    expect(judge("B").verdict).toBe(expected("B"));
  });
});
