/**
 * pnpm eval:rank  (offline: no worker, no network, no Gemini)
 *
 * Writes eval/runs/<data-version>/ranking.json: keyword-only vs FlameAtlas top-5 for every question in
 * data/eval/questions.json. Run through vitest (vitest.eval.config.ts) only because vitest already
 * loads the TypeScript engine; this file is not part of `pnpm test`.
 */
import { it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { Dataset, Scenario } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset-v1.0.json";
import scenariosJson from "../../../data/scenarios.json";
import questionsJson from "../../../data/eval/questions.json";
import { buildIndex } from "../src/search";
import { rankingFor, type EvalQuestion } from "../src/evalRank";
import { scenarioIdFor } from "./lib/budget.mjs";

it("writes eval/runs/<data-version>/ranking.json", () => {
  const ds = Dataset.parse(datasetJson);
  const scenarios = scenariosJson.map((s) => Scenario.parse(s));
  const flag = process.env.EVAL_SCENARIO ?? null;
  const scenarioFor = (q: EvalQuestion) => {
    const id = scenarioIdFor(q, flag);
    const sc = scenarios.find((s) => s.id === id);
    if (!sc) throw new Error(`unknown scenario ${id}`);
    return sc;
  };
  const out = rankingFor(ds, buildIndex(ds), questionsJson.questions as EvalQuestion[], scenarioFor);
  const dir = new URL(`../../../eval/runs/${ds.version}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL("ranking.json", dir), JSON.stringify(out, null, 2) + "\n");
  for (const q of out.questions) console.log(`${q.qid}  keyword ${q.keyword.join(" ") || "(no hits)"}  |  flameatlas ${q.flameatlas.join(" ")}`);
  console.log(`\nWrote eval/runs/${ds.version}/ranking.json`);
});
