/**
 * pnpm eval:rank  (offline: no worker, no network, no Gemini)
 *
 * Writes eval/runs/<data-version>/ranking.json: keyword-only vs Oxyflame top-5 for every question in
 * data/eval/questions.json. Run through vitest (vitest.eval.config.ts) only because vitest already
 * loads the TypeScript engine; this file is not part of `pnpm test`.
 */
import { it } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Dataset, Scenario } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";
import questionsJson from "../../../data/eval/questions.json";
import { buildIndex } from "../src/search";
import { rankingFor, type EvalQuestion } from "../src/evalRank";
import { offlineSemanticScores, type EmbeddingsFile } from "../src/semantic";
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
  // Hybrid needs both cached vector files (pnpm index:vectors, pnpm eval:embed); without them it is left out.
  const cache = (name: string) => new URL(`../../../data/cache/${name}-${ds.version}.json`, import.meta.url);
  const corpusFile = existsSync(cache("embeddings")) ? (JSON.parse(readFileSync(cache("embeddings"), "utf8")) as EmbeddingsFile) : null;
  const queryFile = existsSync(cache("eval-query-embeddings"))
    ? (JSON.parse(readFileSync(cache("eval-query-embeddings"), "utf8")) as { vectors: Record<string, number[]> })
    : null;
  const textHash = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);
  const semanticFor = corpusFile && queryFile
    ? (q: EvalQuestion) => { const v = queryFile.vectors[textHash(q.question)]; return v ? offlineSemanticScores(ds, v, corpusFile) : undefined; }
    : undefined;
  if (!semanticFor) console.log(`No hybrid rows: data/cache/embeddings-${ds.version}.json and eval-query-embeddings-${ds.version}.json are both needed.`);
  const out = rankingFor(ds, buildIndex(ds), questionsJson.questions as EvalQuestion[], scenarioFor, semanticFor);
  const dir = new URL(`../../../eval/runs/${ds.version}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL("ranking.json", dir), JSON.stringify(out, null, 2) + "\n");
  for (const q of out.questions) console.log(`${q.qid}  keyword ${q.keyword.join(" ") || "(no hits)"}  |  engine ${q.flameatlas.join(" ")}${q.hybrid ? `  |  hybrid ${q.hybrid.join(" ")}` : ""}`);
  console.log(`\nWrote eval/runs/${ds.version}/ranking.json`);
});
