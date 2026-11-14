/**
 * pnpm eval:score  (offline: no worker, no network, no Gemini)
 *
 * Scores what is on disk for the loaded data version and writes eval/runs/<data-version>/scores.json:
 * Top-1 / Top-3 from ranking.json, Referee accuracy on the hand-built pairs, the five adversarial
 * traps, and (when `pnpm eval:record` has saved any) the recorded answers of each system.
 * Run through vitest only because vitest already loads the TypeScript engine.
 */
import { it } from "vitest";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { Dataset, Scenario } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";
import questionsJson from "../../../data/eval/questions.json";
import demoPairs from "../../../data/demo-pairs.json";
import refereePairs from "../../../data/eval/referee-pairs.json";
import { buildIndex } from "../src/search";
import { EVAL_SYSTEMS } from "../src/evalRun";
import type { RankingEntry } from "../src/evalRank";
import { adversarial, scoreAnswers, scoreReferee, topK, type RecordedAnswer } from "../src/evalScore";

it("writes eval/runs/<data-version>/scores.json", () => {
  const ds = Dataset.parse(datasetJson);
  const scenarios = scenariosJson.map((s) => Scenario.parse(s));
  const dir = new URL(`../../../eval/runs/${ds.version}/`, import.meta.url);
  const rankingFile = new URL("ranking.json", dir);
  if (!existsSync(rankingFile)) throw new Error("Run `pnpm eval:rank` first: ranking.json is missing.");
  const ranking = JSON.parse(readFileSync(rankingFile, "utf8")) as { questions: RankingEntry[] };

  const records: RecordedAnswer[] = [];
  for (const system of EVAL_SYSTEMS) {
    const sysDir = new URL(`${system}/`, dir);
    if (!existsSync(sysDir)) continue;
    for (const f of readdirSync(sysDir).filter((x) => x.endsWith(".json"))) records.push(JSON.parse(readFileSync(new URL(f, sysDir), "utf8")));
  }

  const scores = {
    dataVersion: ds.version,
    questions: ranking.questions.length,
    ranking: Object.fromEntries((["keyword", "flameatlas"] as const).map((s) => [s, { top1: topK(ranking.questions, s, 1), top3: topK(ranking.questions, s, 3) }])),
    referee: scoreReferee(ds, [...demoPairs.pairs, ...refereePairs.pairs]),
    adversarial: adversarial(ds, buildIndex(ds), scenarios),
    answers: EVAL_SYSTEMS.map((s) => scoreAnswers(ds, scenarios, questionsJson.questions, records, s)),
  };
  writeFileSync(new URL("scores.json", dir), JSON.stringify(scores, null, 2) + "\n");

  const frac = (a: number, b: number) => `${a}/${b}`;
  const lines: string[] = [`\nBenchmark, data ${ds.version}, ${scores.questions} questions`, ""];
  for (const [name, r] of Object.entries(scores.ranking)) {
    lines.push(`${name.padEnd(11)} Top-1 ${frac(r.top1.hits, r.top1.n)}  Top-3 ${frac(r.top3.hits, r.top3.n)}  Top-3 misses: ${r.top3.misses.join(", ") || "none"}`);
  }
  const t = scores.ranking.keyword.top3;
  lines.push(`  left out (no labelled ids): ${t.unlabelled.join(", ") || "none"}; (labels not in dataset): ${t.unrankable.join(", ") || "none"}; counted with some labels missing: ${t.partlyRankable.join(", ") || "none"}`);
  const rf = scores.referee;
  lines.push("", `Referee     verdict ${frac(rf.verdictCorrect, rf.n)}  named reason ${frac(rf.reasonCorrect, rf.reasonN)}  failures: ${rf.failures.map((f) => f.id).join(", ") || "none"}`);
  lines.push(`Adversarial caught ${frac(scores.adversarial.filter((a) => a.caught).length, scores.adversarial.length)}  missed: ${scores.adversarial.filter((a) => !a.caught).map((a) => a.id).join(", ") || "none"}`);
  lines.push("");
  for (const a of scores.answers) {
    lines.push(a.n === 0
      ? `${a.system.padEnd(11)} no recorded answers yet (run pnpm eval:record)`
      : `${a.system.padEnd(11)} answers ${a.n}  malformed ${a.malformed.length}  unsupported sentences shown ${frac(a.unsupportedShown, a.sentences)}  off-record ${a.offRecord}  caught by validator ${a.caughtByValidator}  correct abstentions ${frac(a.abstention.correct, a.abstention.expected)}  over-abstained ${a.overAbstained.join(", ") || "none"}`);
  }
  console.log(lines.join("\n"));
  console.log(`\nWrote eval/runs/${ds.version}/scores.json`);
});
