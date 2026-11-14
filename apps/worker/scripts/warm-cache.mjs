#!/usr/bin/env node
/**
 * pnpm warm-cache
 *
 * Asks the demo questions (q2, q3, q4 from data/eval/questions.json) for scenario "moon-fm2", ONCE
 * each, through the real ask() pipeline of the locally running worker (POST /api/dev/warm-cache),
 * and writes only validated LLM answers to data/cache/demo-answers.json.
 *
 * SPENDS GEMINI QUOTA: at most one request per model in GEMINI_MODELS per question (so at most
 * 3 x 3 = 9 requests, normally 3). Nothing is retried. Questions already in the file are not asked
 * again. A question that falls back to the template is skipped and the reason is printed.
 *
 * Needs the worker running (`pnpm dev:worker`); it holds GEMINI_API_KEY (.dev.vars). This script
 * never reads the key. Another port: WORKER_URL=http://localhost:8788 pnpm warm-cache
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SCENARIO_ID = "moon-fm2";
const QUESTION_IDS = ["q2", "q3", "q4"];
const WORKER = (process.env.WORKER_URL ?? "http://localhost:8787").replace(/\/$/, "");
const PER_QUESTION_TIMEOUT_MS = 240_000; // 3 models x 60 s, plus slack

const root = new URL("../../../", import.meta.url);
const cachePath = fileURLToPath(new URL("data/cache/demo-answers.json", root));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const all = readJson(fileURLToPath(new URL("data/eval/questions.json", root))).questions;
const questions = QUESTION_IDS.map((id) => {
  const q = all.find((x) => x.id === id);
  if (!q) throw new Error(`question ${id} not found in data/eval/questions.json`);
  return { id: q.id, question: q.question };
});

// A free call: is the worker there, and does it have a key?
let health;
try {
  health = await (await fetch(`${WORKER}/api/health`, { signal: AbortSignal.timeout(5000) })).json();
} catch {
  console.error(`No worker at ${WORKER}. Start it first: pnpm dev:worker`);
  process.exit(1);
}
if (!health.gemini) {
  console.error("The worker has no GEMINI_API_KEY (apps/worker/.dev.vars). Nothing was asked.");
  process.exit(1);
}
if (health.fixture) {
  console.warn(`Note: data version ${health.dataVersion} is FAKE fixture data. Cached answers are for development, never NASA data.`);
}

const file = readJson(cachePath);
file.answers ??= {};
let saved = 0;

for (const q of questions) {
  process.stdout.write(`${q.id}  ${q.question}\n`);
  try {
    // One POST per question; no retry on any failure.
    const res = await fetch(`${WORKER}/api/dev/warm-cache`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId: SCENARIO_ID, questions: [q] }),
      signal: AbortSignal.timeout(PER_QUESTION_TIMEOUT_MS),
    });
    if (!res.ok) { console.log(`    skipped: worker returned HTTP ${res.status} ${(await res.text()).slice(0, 200)}`); continue; }
    const { results, answers } = await res.json();
    for (const r of results) {
      if (r.outcome === "saved") console.log(`    saved (answered by ${r.model ?? "unknown model"})`);
      else if (r.outcome === "already_cached") console.log("    already in the demo cache, not asked again");
      else console.log(`    skipped (template fallback): ${r.reason}`);
    }
    const fresh = Object.keys(answers).filter((key) => !(key in file.answers));
    Object.assign(file.answers, answers);
    saved += fresh.length;
  } catch (e) {
    console.log(`    skipped: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Written once at the end: `wrangler dev` reloads the worker when this file changes.
if (saved) writeFileSync(cachePath, JSON.stringify(file, null, 2) + "\n");
console.log(saved
  ? `\nWrote ${saved} answer(s) to data/cache/demo-answers.json (data ${health.dataVersion}). Review and commit it.`
  : "\nNothing new to write.");
