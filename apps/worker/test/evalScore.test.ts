import { describe, it, expect } from "vitest";
import real from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";
import { Dataset, Scenario } from "@flameatlas/engine";
import { buildIndex } from "../src/search";
import { adversarial, scoreAnswers, scoreReferee, topK, type RecordedAnswer } from "../src/evalScore";
import type { RankingEntry } from "../src/evalRank";

const ds = Dataset.parse(real);
const scenarios = scenariosJson.map((s) => Scenario.parse(s));

const entry = (qid: string, relevant: string[], missing: string[], flameatlas: string[]): RankingEntry =>
  ({ qid, question: "", scenarioId: "moon-challenge", relevantPsiIds: relevant, relevantNotInDataset: missing, keyword: [], flameatlas });

describe("topK", () => {
  const qs = [
    entry("a", ["P1"], [], ["P1", "P2"]),          // top-1 hit
    entry("b", ["P1"], [], ["P2", "P3", "P1"]),    // top-3 hit only
    entry("c", ["P1"], [], ["P2", "P3", "P4", "P1"]), // miss
    entry("d", [], [], ["P1"]),                    // no labels: left out
    entry("e", ["P9"], ["P9"], ["P1"]),            // label not in dataset: left out
    entry("f", ["P1", "P9"], ["P9"], ["P1"]),      // counted, partly rankable
  ];
  it("counts hits against the rankable labels and reports every exclusion", () => {
    expect(topK(qs, "flameatlas", 1)).toMatchObject({ hits: 2, n: 4, misses: ["b", "c"] });
    expect(topK(qs, "flameatlas", 3)).toMatchObject({ hits: 3, n: 4, misses: ["c"], unlabelled: ["d"], unrankable: ["e"], partlyRankable: ["f"] });
  });
  it("a missing label never counts as a hit", () => {
    expect(topK([entry("g", ["P9", "P1"], ["P9"], ["P9"])], "flameatlas", 3).hits).toBe(0);
  });
});

describe("scoreReferee", () => {
  it("scores verdict and named reason separately and lists failures", () => {
    const s = scoreReferee(ds, [
      { id: "ok", a: "SAF-IV-1", b: "SAF-VI-2", target: "pressureKPa", expected: "CANNOT_ISOLATE", names: "o2MolPct" },
      { id: "wrong-verdict", a: "SAF-IV-1", b: "SAF-VI-2", target: "pressureKPa", expected: "CAN_ISOLATE" },
      { id: "wrong-reason", a: "SAF-IV-1", b: "SAF-VI-2", target: "pressureKPa", expected: "CANNOT_ISOLATE", names: "material" },
      { id: "gone", a: "NOPE", b: "SAF-VI-2", target: "pressureKPa", expected: "CANNOT_ISOLATE" },
    ]);
    expect(s).toMatchObject({ n: 3, verdictCorrect: 2, reasonN: 2, reasonCorrect: 1, skipped: ["gone"] });
    expect(s.failures.map((f) => f.id)).toEqual(["wrong-verdict", "wrong-reason"]);
  });
});

describe("adversarial", () => {
  it("runs the five traps on the real dataset", () => {
    const cases = adversarial(ds, buildIndex(ds), scenarios);
    expect(cases.map((c) => c.id)).toEqual(["units", "mole_fraction_vs_partial_pressure", "burner_o2_vs_cabin_o2", "liquid_vs_solid", "missing_airflow"]);
    expect(cases.filter((c) => !c.caught).map((c) => c.id)).toEqual([]);
  });
});

describe("scoreAnswers", () => {
  const base = { scenarioId: "moon-challenge", dataVersion: ds.version, recordIds: ["SAF-VI-2", "PSI-25"] };
  const questions = [{ id: "q1", expect: "cannot_confirm" }, { id: "q2", expect: "answered" }, { id: "q3", expect: "answered" }];
  const records: RecordedAnswer[] = [
    // supported: 31 mol% is on SAF-VI-2
    { ...base, qid: "q2", system: "plain_rag", output: { status: "answered", sentences: [
      { text: "The cloth burned at 31 mol% oxygen.", recordIds: ["SAF-VI-2"] },
      { text: "It burned at 99 kPa.", recordIds: ["SAF-VI-2"] },            // number not on the record
      { text: "BASS ran many tests.", recordIds: ["PSI-26"] },              // id that was never sent
    ] } },
    { ...base, qid: "q1", system: "plain_rag", output: { status: "answered", sentences: [] } }, // should have abstained
    { ...base, qid: "q3", system: "plain_rag", output: "free text, no JSON" },                  // malformed
    { ...base, qid: "q1", system: "flameatlas", output: { status: "cannot_confirm", sentences: [] }, log: ['ask: dropped "x" (number 99 not in cited records)'] },
    { ...base, qid: "q2", system: "flameatlas", output: { status: "cannot_confirm", sentences: [] } }, // over-abstained
    { ...base, qid: "q2", system: "flameatlas", dataVersion: "other", output: { status: "answered", sentences: [] } }, // other data version: ignored
  ];
  it("plain RAG: counts unsupported, off-record, malformed and a missed abstention", () => {
    const s = scoreAnswers(ds, scenarios, questions, records, "plain_rag");
    expect(s).toMatchObject({ n: 3, malformed: ["q3"], sentences: 3, unsupportedShown: 1, offRecord: 1, caughtByValidator: 0 });
    expect(s.abstention).toEqual({ expected: 1, correct: 0, wrong: ["q1"] });
    expect(s.citationPrecision).toBeCloseTo(2 / 3, 5);
  });
  it("FlameAtlas: counts what the validator caught, correct and excessive abstentions", () => {
    const s = scoreAnswers(ds, scenarios, questions, records, "flameatlas");
    expect(s).toMatchObject({ n: 2, caughtByValidator: 1, overAbstained: ["q2"], citationPrecision: null });
    expect(s.abstention).toEqual({ expected: 1, correct: 1, wrong: [] });
  });
});
