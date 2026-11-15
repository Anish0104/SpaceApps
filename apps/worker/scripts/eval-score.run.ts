/**
 * pnpm eval:score [questions.json]  (offline: no worker, no network, no Gemini, no Workers AI)
 *
 * Scores the given question file (default data/eval/questions.json, the development set) for the loaded data
 * version: Top-1 / Top-3 per retrieval system on the labelled questions, with the questions each one misses;
 * Referee accuracy on the hand-built pairs; the five adversarial traps; and, for the development set, the
 * recorded answers of each system (`pnpm eval:record`). Rankings are computed here, with the same code as
 * `pnpm eval:rank`. Semantic rows use the cached vectors (`pnpm index:vectors`, `pnpm eval:embed [file]`).
 *
 * Writes eval/runs/<version>/scores.json for the development set, scores-<file name>.json for any other file.
 * The question file arrives in EVAL_QUESTIONS (scripts/eval-score.mjs sets it from the argument), because this
 * runs under vitest, which only loads the TypeScript engine for us.
 */
import { it } from "vitest";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Dataset, Scenario } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";
import demoPairs from "../../../data/demo-pairs.json";
import refereePairs from "../../../data/eval/referee-pairs.json";
import { buildIndex } from "../src/search";
import { EVAL_SYSTEMS } from "../src/evalRun";
import { rankingFor, type EvalQuestion } from "../src/evalRank";
import { offlineSemanticScores, type EmbeddingsFile } from "../src/semantic";
import { adversarial, scoreAnswers, scoreReferee, topK, type RankedSystem, type RecordedAnswer } from "../src/evalScore";
import { scenarioIdFor } from "./lib/budget.mjs";

const LABEL: Record<RankedSystem, string> = {
  keyword: "Keyword",
  flameatlas: "Engine-only",
  hybrid: "Hybrid (rrf)",
  hybridCosine: "Hybrid-cosine",
};

it("scores a question file", () => {
  const ds = Dataset.parse(datasetJson);
  const scenarios = scenariosJson.map((s) => Scenario.parse(s));
  const root = (rel: string) => fileURLToPath(new URL(`../../../${rel}`, import.meta.url));
  const devSet = root("data/eval/questions.json");
  const questionsPath = resolve(process.env.EVAL_QUESTIONS || devSet);
  const isDevSet = questionsPath === devSet;
  if (!existsSync(questionsPath)) throw new Error(`No question file at ${questionsPath}`);
  const questions = (JSON.parse(readFileSync(questionsPath, "utf8")) as { questions: EvalQuestion[] }).questions;

  const scenarioFor = (q: EvalQuestion) => {
    const id = scenarioIdFor(q, null);
    const sc = scenarios.find((s) => s.id === id);
    if (!sc) throw new Error(`unknown scenario ${id}`);
    return sc;
  };

  // Semantic rows need the corpus vectors and a cached vector for every question in this file.
  const cacheFile = (name: string) => root(`data/cache/${name}-${ds.version}.json`);
  const corpus = existsSync(cacheFile("embeddings")) ? (JSON.parse(readFileSync(cacheFile("embeddings"), "utf8")) as EmbeddingsFile) : null;
  const qcache = existsSync(cacheFile("eval-query-embeddings"))
    ? (JSON.parse(readFileSync(cacheFile("eval-query-embeddings"), "utf8")) as { vectors: Record<string, number[]> })
    : null;
  const hash = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);
  const missingVectors = questions.filter((q) => !qcache?.vectors[hash(q.question)]).map((q) => q.id);
  const semanticFor = corpus && qcache && !missingVectors.length
    ? (q: EvalQuestion) => offlineSemanticScores(ds, qcache.vectors[hash(q.question)]!, corpus)
    : undefined;

  // Hybrid-cosine was designed after seeing the development set, so it is only reported on other files.
  const ranking = rankingFor(ds, buildIndex(ds), questions, scenarioFor, semanticFor, { cosine: !isDevSet });
  const systems = (["keyword", "flameatlas", "hybrid", "hybridCosine"] as const).filter((s) =>
    s === "keyword" || s === "flameatlas" || ranking.questions.every((q) => Array.isArray(q[s])));

  const records: RecordedAnswer[] = [];
  const runDir = root(`eval/runs/${ds.version}/`);
  if (isDevSet) {
    for (const system of EVAL_SYSTEMS) {
      const sysDir = `${runDir}${system}/`;
      if (!existsSync(sysDir)) continue;
      for (const f of readdirSync(sysDir).filter((x) => x.endsWith(".json"))) records.push(JSON.parse(readFileSync(sysDir + f, "utf8")));
    }
  }

  const scores = {
    dataVersion: ds.version,
    questionFile: questionsPath.replace(root(""), ""),
    questions: questions.length,
    ranking: Object.fromEntries(systems.map((s) => [s, { label: LABEL[s], top1: topK(ranking.questions, s, 1), top3: topK(ranking.questions, s, 3) }])),
    referee: scoreReferee(ds, [...demoPairs.pairs, ...refereePairs.pairs]),
    adversarial: adversarial(ds, buildIndex(ds), scenarios),
    ...(isDevSet ? { answers: EVAL_SYSTEMS.map((s) => scoreAnswers(ds, scenarios, questions, records, s)) } : {}),
  };
  mkdirSync(runDir, { recursive: true });
  const outName = isDevSet ? "scores.json" : `scores-${basename(questionsPath, ".json")}.json`;
  writeFileSync(runDir + outName, JSON.stringify(scores, null, 2) + "\n");

  const frac = (a: number, b: number) => `${a}/${b}`;
  const anyRow = Object.values(scores.ranking)[0]!;
  const lines: string[] = [`\nBenchmark, data ${ds.version}, ${scores.questionFile}: ${scores.questions} questions, ${anyRow.top1.n} labelled`, ""];
  lines.push(`${"System".padEnd(15)} ${"Top-1".padEnd(7)} ${"Top-3".padEnd(7)} ${"Top-1 misses".padEnd(44)} Top-3 misses`);
  for (const r of Object.values(scores.ranking)) {
    lines.push(`${r.label.padEnd(15)} ${frac(r.top1.hits, r.top1.n).padEnd(7)} ${frac(r.top3.hits, r.top3.n).padEnd(7)} ${(r.top1.misses.join(", ") || "none").padEnd(44)} ${r.top3.misses.join(", ") || "none"}`);
  }
  if (!semanticFor) {
    lines.push(missingVectors.length && corpus
      ? `(no semantic rows: no cached vector for ${missingVectors.length} question(s); run pnpm eval:embed ${isDevSet ? "" : scores.questionFile})`
      : "(no semantic rows: run pnpm index:vectors and pnpm eval:embed first)");
  }
  if (isDevSet) lines.push("(Hybrid-cosine is not reported on this set: it was designed after seeing it. Score a held-out file instead.)");
  lines.push(`  left out (no labelled ids): ${anyRow.top3.unlabelled.join(", ") || "none"}; (labels not in dataset): ${anyRow.top3.unrankable.join(", ") || "none"}`);
  const rf = scores.referee;
  lines.push("", `Referee     verdict ${frac(rf.verdictCorrect, rf.n)}  named reason ${frac(rf.reasonCorrect, rf.reasonN)}  failures: ${rf.failures.map((f) => f.id).join(", ") || "none"}`);
  lines.push(`Adversarial caught ${frac(scores.adversarial.filter((a) => a.caught).length, scores.adversarial.length)}  missed: ${scores.adversarial.filter((a) => !a.caught).map((a) => a.id).join(", ") || "none"}`);
  if (scores.answers) {
    lines.push("");
    for (const a of scores.answers) {
      lines.push(a.n === 0
        ? `${a.system.padEnd(11)} no recorded answers yet (run pnpm eval:record)`
        : `${a.system.padEnd(11)} answers ${a.n}  malformed ${a.malformed.length}  unsupported sentences shown ${frac(a.unsupportedShown, a.sentences)}  off-record ${a.offRecord}  caught by validator ${a.caughtByValidator}  correct abstentions ${frac(a.abstention.correct, a.abstention.expected)}  over-abstained ${a.overAbstained.join(", ") || "none"}`);
    }
  }
  console.log(lines.join("\n"));
  console.log(`\nWrote eval/runs/${ds.version}/${outName}`);
});
