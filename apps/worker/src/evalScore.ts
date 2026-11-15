/**
 * Offline benchmark scoring (`pnpm eval:score`). Reads what is already on disk (ranking.json, recorded
 * answers, hand-built Referee pairs) and never calls Gemini. Every number comes with its denominator
 * and the list of failures.
 */
import {
  nearestTested, psiToKPa, referee, sameValue, toMolPct,
  type AskResponse, type Dataset, type Run, type Scenario, type Tracked,
} from "@flameatlas/engine";
import type MiniSearch from "minisearch";
import { SearchRequest } from "@flameatlas/engine";
import type { RankingEntry } from "./evalRank";
import { search } from "./search";
import { validateSentences } from "./validator";

// ---------- Top-k ----------

export interface TopK {
  k: number;
  hits: number;
  /** questions with at least one labelled relevant id that is in the dataset */
  n: number;
  misses: string[];
  /** left out of n: no labelled relevant ids at all */
  unlabelled: string[];
  /** left out of n: every labelled id is missing from this dataset, so no system could hit */
  unrankable: string[];
  /** counted, but some labelled ids are missing from this dataset */
  partlyRankable: string[];
}

export function topK(questions: RankingEntry[], system: "keyword" | "flameatlas", k: number): TopK {
  const out: TopK = { k, hits: 0, n: 0, misses: [], unlabelled: [], unrankable: [], partlyRankable: [] };
  for (const q of questions) {
    if (!q.relevantPsiIds.length) { out.unlabelled.push(q.qid); continue; }
    const rankable = q.relevantPsiIds.filter((id) => !q.relevantNotInDataset.includes(id));
    if (!rankable.length) { out.unrankable.push(q.qid); continue; }
    if (q.relevantNotInDataset.length) out.partlyRankable.push(q.qid);
    out.n++;
    if (q[system].slice(0, k).some((id) => rankable.includes(id))) out.hits++;
    else out.misses.push(q.qid);
  }
  return out;
}

// ---------- Referee ----------

export interface RefereePair { id: string; a: string; b: string; target: string; expected: string; names?: string | null; kind?: string }
export interface RefereeScore {
  n: number;
  verdictCorrect: number;
  /** of the pairs that name a field: the engine's confounds/undocumented list contains it */
  reasonN: number;
  reasonCorrect: number;
  failures: { id: string; expected: string; got: string; detail: string }[];
  skipped: string[];
}

export function scoreReferee(ds: Dataset, pairs: RefereePair[]): RefereeScore {
  const out: RefereeScore = { n: 0, verdictCorrect: 0, reasonN: 0, reasonCorrect: 0, failures: [], skipped: [] };
  const run = (id: string) => ds.runs.find((r) => r.id === id);
  for (const p of pairs) {
    const a = run(p.a), b = run(p.b);
    if (!a || !b) { out.skipped.push(p.id); continue; }
    const r = referee(a, b, p.target as Tracked);
    out.n++;
    const verdictOk = r.verdict === p.expected;
    if (verdictOk) out.verdictCorrect++;
    let reasonOk = true;
    if (p.names) {
      out.reasonN++;
      reasonOk = [...r.confounds, ...r.undocumented].includes(p.names as Tracked);
      if (reasonOk) out.reasonCorrect++;
    }
    if (!verdictOk || !reasonOk) {
      out.failures.push({ id: p.id, expected: `${p.expected}${p.names ? ` naming ${p.names}` : ""}`, got: r.verdict, detail: r.explanation });
    }
  }
  return out;
}

// ---------- Adversarial ----------

export interface AdversarialCase { id: string; trap: string; caught: boolean; detail: string }

const withValue = (r: Run, over: Partial<Record<Tracked, number | string | null>>, id: string, fuelPhase?: Run["fuelPhase"]): Run => {
  const c = structuredClone(r) as Run;
  c.id = id;
  if (fuelPhase) c.fuelPhase = fuelPhase;
  for (const [k, v] of Object.entries(over)) (c[k as Tracked] as { value: unknown }).value = v;
  return c;
};

/**
 * The five traps from the plan. Each is a fixed input the system must not fall for; "synthetic" in the
 * detail means the trap run is a real run with one field altered for the test, never shown as data.
 */
export function adversarial(ds: Dataset, index: MiniSearch, scenarios: Scenario[]): AdversarialCase[] {
  const moon = scenarios.find((s) => s.id === "moon-challenge") as Scenario;
  const solid = ds.runs.find((r) => r.fuelPhase === "solid" && r.o2MolPct.value !== null && r.flowCmS.value !== null) as Run;
  const out: AdversarialCase[] = [];

  // 1. kPa vs psi, mole fraction vs percent
  const kpa = psiToKPa(10.2);
  out.push({
    id: "units", trap: "10.2 psi read as 10.2 kPa; 0.30 mole fraction read as 0.30%",
    caught: sameValue("pressureKPa", kpa, moon.pressureKPa) && !sameValue("pressureKPa", 10.2, moon.pressureKPa) && toMolPct(0.3) === 30,
    detail: `10.2 psi converts to ${kpa.toFixed(1)} kPa and matches the scenario's ${moon.pressureKPa} kPa; a raw 10.2 does not; 0.30 is read as 30 mol%.`,
  });

  // 2. mole fraction vs partial pressure
  const near = nearestTested(moon, ds.runs);
  out.push({
    id: "mole_fraction_vs_partial_pressure", trap: "treating the run nearest in O2 percent as nearest in oxygen",
    caught: near.disagree,
    detail: near.byMolPct && near.byPartialPressure
      ? `Nearest by percent is ${near.byMolPct.runId}; nearest by partial pressure is ${near.byPartialPressure.runId}; the readout shows both.`
      : "No documented oxygen values to compare.",
  });

  // 3. CFI-G burner oxygen vs cabin oxygen
  // The trap is sprung on purpose: CFI-G's burner-gas range (21-85% O2) is entered as if it were a
  // chamber atmosphere, which is exactly the mistake a careless import would make.
  const cfig = ds.investigations.find((i) => /CFI-G/i.test(i.acronym));
  if (!cfig) {
    out.push({ id: "burner_o2_vs_cabin_o2", trap: "counting CFI-G's burner gas (up to 85% O2) as a high-oxygen cabin atmosphere", caught: false, detail: "CFI-G is not in this dataset, so the trap could not be run." });
  } else {
    const trapped = { ...cfig, ranges: { ...cfig.ranges, o2MolPct: [21, 85] as [number, number], pressureKPa: [101.3, 101.3] as [number, number] } };
    const dsTrap = { ...ds, investigations: ds.investigations.map((i) => (i.psiId === cfig.psiId ? trapped : i)) };
    const hit = search(dsTrap, index, moon, SearchRequest.parse({ query: "highest oxygen concentration microgravity tests", scenarioId: moon.id }))
      .find((r) => r.psiId === cfig.psiId);
    const o2Reason = hit?.reasons.find((x) => x === "O2_WITHIN_5PCT" || x === "PO2_CLOSE");
    out.push({
      id: "burner_o2_vs_cabin_o2", trap: "counting CFI-G's burner gas (up to 85% O2) as a high-oxygen cabin atmosphere",
      caught: !!hit && !o2Reason && hit.reasons.includes("O2_IS_BURNER_GAS"),
      detail: `Synthetic: ${cfig.psiId} with a 21-85% O2 range entered as if it were chamber air. Reasons: ${hit?.reasons.join(", ") ?? "not ranked"}.`,
    });
  }

  // 4. liquid vs solid fuel
  const liquid = withValue(solid, { o2MolPct: (solid.o2MolPct.value as number) + 10 }, "SYNTHETIC-liquid", "liquid");
  const r4 = referee(solid, liquid, "o2MolPct");
  out.push({
    id: "liquid_vs_solid", trap: "attributing a difference to oxygen when one run burned liquid droplets and the other solid fabric",
    caught: r4.verdict === "CANNOT_ISOLATE" && r4.notes.some((n) => n.includes("fuel phase")),
    detail: `Synthetic: ${solid.id} against a copy marked liquid with other oxygen. Referee: ${r4.verdict}. ${r4.explanation}`,
  });

  // 5. missing airflow
  const noFlow = withValue(solid, { flowCmS: null }, "SYNTHETIC-noflow");
  const r5 = referee(solid, noFlow, "flowCmS");
  out.push({
    id: "missing_airflow", trap: "comparing on airflow when one run never documented it",
    caught: r5.verdict === "CANT_CONFIRM" && r5.undocumented.includes("flowCmS"),
    detail: `Synthetic: ${solid.id} against a copy with airflow removed. Referee: ${r5.verdict}. ${r5.explanation}`,
  });
  return out;
}

// ---------- Recorded answers ----------

export interface RecordedAnswer {
  qid: string; system: string; scenarioId: string; dataVersion: string;
  recordIds: string[]; output: unknown; log?: string[];
}
export interface EvalQuestionLabel { id: string; expect?: string; use?: string }

export interface AnswerScore {
  system: string;
  /** recorded answers scored */
  n: number;
  /** no usable `sentences` array: counted, never repaired */
  malformed: string[];
  sentences: number;
  /** sentences with an untraceable number or an unknown id, as shown to the user */
  unsupportedShown: number;
  /** sentences citing an id that was not in the records sent to the model */
  offRecord: number;
  /** flameatlas only: sentences its validator removed before the user saw them */
  caughtByValidator: number;
  /** 1 - unsupportedShown / sentences; null when there are no sentences */
  citationPrecision: number | null;
  abstention: { expected: number; correct: number; wrong: string[] };
  /** answered questions wrongly refused */
  overAbstained: string[];
}

const sentencesOf = (output: unknown): AskResponse["sentences"] | null => {
  const s = (output as { sentences?: unknown } | null)?.sentences;
  if (!Array.isArray(s)) return null;
  return s.every((x) => x && typeof x.text === "string" && Array.isArray(x.recordIds)) ? (s as AskResponse["sentences"]) : null;
};

export function scoreAnswers(ds: Dataset, scenarios: Scenario[], questions: EvalQuestionLabel[], records: RecordedAnswer[], system: string): AnswerScore {
  const out: AnswerScore = {
    system, n: 0, malformed: [], sentences: 0, unsupportedShown: 0, offRecord: 0, caughtByValidator: 0,
    citationPrecision: null, abstention: { expected: 0, correct: 0, wrong: [] }, overAbstained: [],
  };
  for (const rec of records.filter((r) => r.system === system && r.dataVersion === ds.version)) {
    out.n++;
    const q = questions.find((x) => x.id === rec.qid);
    const status = (rec.output as { status?: string } | null)?.status;
    if (q?.expect === "cannot_confirm") {
      out.abstention.expected++;
      if (status === "cannot_confirm") out.abstention.correct++; else out.abstention.wrong.push(rec.qid);
    } else if (q?.expect === "answered" && status === "cannot_confirm") out.overAbstained.push(rec.qid);

    out.caughtByValidator += (rec.log ?? []).filter((l) => /dropped "/.test(l)).length;
    const sentences = sentencesOf(rec.output);
    if (!sentences) { out.malformed.push(rec.qid); continue; }
    const scenario = scenarios.find((s) => s.id === rec.scenarioId);
    out.sentences += sentences.length;
    out.unsupportedShown += validateSentences(ds, sentences, scenario).dropped.length;
    out.offRecord += sentences.filter((s) => s.recordIds.some((id) => !id.startsWith("SCENARIO:") && !rec.recordIds.includes(id))).length;
  }
  if (out.sentences) out.citationPrecision = 1 - out.unsupportedShown / out.sentences;
  return out;
}
