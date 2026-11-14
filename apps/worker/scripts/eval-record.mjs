#!/usr/bin/env node
/**
 * pnpm eval:record [--questions q2,q3] [--max-calls N] [--dry-run] [--scenario <id>]
 *
 * Records raw answers from both benchmark systems for data/eval/questions.json:
 *   flameatlas  the real ask() pipeline (rules prompt, validator, template fallback), with every cache bypassed
 *   plain_rag   same records and models, minimal prompt, no rules, no validator, no fallback
 * Each output, with the records that were sent, goes to eval/runs/<data-version>/<system>/<qid>.json.
 *
 * SPENDS GEMINI QUOTA through the locally running worker (POST /api/dev/eval; it holds the key, this
 * script never reads it). Hard budget: --max-calls (default 10) Gemini requests in total; the worker
 * refuses any request past it. Nothing is retried. Outputs already on disk are skipped. --dry-run
 * prints the plan and sends nothing to Gemini.
 *
 * Scenario: a question's own "scenarioId" if it has one, else --scenario, else "moon-challenge".
 * Needs `pnpm dev:worker`. Another port: WORKER_URL=http://localhost:8788 pnpm eval:record
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evalTasks, parseFlags, runBudgeted } from "./lib/budget.mjs";

const root = new URL("../../../", import.meta.url);
const abs = (rel) => fileURLToPath(new URL(rel, root));
const readJson = (rel) => JSON.parse(readFileSync(abs(rel), "utf8"));
const WORKER = (process.env.WORKER_URL ?? "http://localhost:8787").replace(/\/$/, "");
const SYSTEMS = ["flameatlas", "plain_rag"];
const PER_TASK_TIMEOUT_MS = 240_000; // 3 models x 60 s, plus slack

let flags;
try { flags = parseFlags(process.argv.slice(2), { defaultMaxCalls: 10, listFlag: "--questions" }); }
catch (e) { console.error(String(e instanceof Error ? e.message : e)); process.exit(2); }

const all = readJson("data/eval/questions.json").questions;
const unknown = (flags.only ?? []).filter((id) => !all.some((q) => q.id === id));
if (unknown.length) { console.error(`Unknown question id(s): ${unknown.join(", ")}`); process.exit(2); }
const questions = flags.only ? all.filter((q) => flags.only.includes(q.id)) : all;

// /api/health is free (no Gemini). A dry run works without the worker.
let health = null;
try { health = await (await fetch(`${WORKER}/api/health`, { signal: AbortSignal.timeout(3000) })).json(); } catch { /* not running */ }
if (!health && !flags.dryRun) { console.error(`No worker at ${WORKER}. Start it first: pnpm dev:worker`); process.exit(1); }
if (health && !health.gemini && !flags.dryRun) { console.error("The worker has no GEMINI_API_KEY (apps/worker/.dev.vars). Nothing was asked."); process.exit(1); }
const dataVersion = health?.dataVersion ?? readJson("data/dataset-v1.0.json").version;
const models = health?.geminiModels ?? 3;
if (health?.fixture) console.warn(`Note: data ${dataVersion} is FAKE fixture data; these outputs are not a benchmark.`);
console.log(`Data ${dataVersion}; ${questions.length} question(s) x ${SYSTEMS.length} systems; budget ${flags.maxCalls} Gemini requests${flags.dryRun ? " (dry run)" : ""}\n`);

const tasks = evalTasks(questions, {
  systems: SYSTEMS, dataVersion, models, scenario: flags.scenario,
  exists: (rel) => existsSync(abs(rel)),
  write: (rel, obj) => { mkdirSync(dirname(abs(rel)), { recursive: true }); writeFileSync(abs(rel), JSON.stringify(obj, null, 2) + "\n"); },
  post: async (body) => {
    const res = await fetch(`${WORKER}/api/dev/eval`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(PER_TASK_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`worker returned HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.json();
  },
});

const s = await runBudgeted(tasks, { maxCalls: flags.maxCalls, dryRun: flags.dryRun });
if (!flags.dryRun) {
  console.log(`\nSaved ${s.saved.length}, not recorded ${s.failed.length}, skipped ${s.skipped.length}; ${s.callsUsed} of ${flags.maxCalls} Gemini requests used.`);
  if (s.stoppedForBudget) console.log("Stopped at the budget. Run again tomorrow (or with a larger --max-calls) to continue; recorded outputs are skipped.");
}
