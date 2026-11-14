#!/usr/bin/env node
/**
 * pnpm summaries [--ids PSI-98,PSI-25] [--max-calls N] [--dry-run]
 *
 * Asks Gemini ONCE per investigation in data/dataset-v1.0.json for a 2-3 sentence cited summary,
 * through the locally running worker (POST /api/dev/summaries; it holds the key, this script never
 * reads it). Only sentences that cite that investigation's own records and pass the citation
 * validator are kept. Results go to data/cache/summaries.json, keyed by <psiId>@<data version>;
 * review and commit that file.
 *
 * SPENDS GEMINI QUOTA. Hard budget: --max-calls (default 9, one per investigation when the first
 * model answers); the worker refuses any request past it. Nothing is retried. Investigations already
 * in the file are skipped. --dry-run prints the plan and sends nothing to Gemini.
 * Needs `pnpm dev:worker`. Another port: WORKER_URL=http://localhost:8788 pnpm summaries
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseFlags, runBudgeted, summaryTasks } from "./lib/budget.mjs";

const root = new URL("../../../", import.meta.url);
const abs = (rel) => fileURLToPath(new URL(rel, root));
const readJson = (rel) => JSON.parse(readFileSync(abs(rel), "utf8"));
const WORKER = (process.env.WORKER_URL ?? "http://localhost:8787").replace(/\/$/, "");
const CACHE = "data/cache/summaries.json";

let flags;
try { flags = parseFlags(process.argv.slice(2), { defaultMaxCalls: 9, listFlag: "--ids" }); }
catch (e) { console.error(String(e instanceof Error ? e.message : e)); process.exit(2); }

const dataset = readJson("data/dataset-v1.0.json");
const allIds = dataset.investigations.map((i) => i.psiId);
const unknown = (flags.only ?? []).filter((id) => !allIds.includes(id));
if (unknown.length) { console.error(`Unknown investigation id(s): ${unknown.join(", ")}`); process.exit(2); }
const psiIds = flags.only ?? allIds;

// /api/health is free (no Gemini). A dry run works without the worker.
let health = null;
try { health = await (await fetch(`${WORKER}/api/health`, { signal: AbortSignal.timeout(3000) })).json(); } catch { /* not running */ }
if (!health && !flags.dryRun) { console.error(`No worker at ${WORKER}. Start it first: pnpm dev:worker`); process.exit(1); }
if (health && !health.gemini && !flags.dryRun) { console.error("The worker has no GEMINI_API_KEY (apps/worker/.dev.vars). Nothing was asked."); process.exit(1); }
const dataVersion = health?.dataVersion ?? dataset.version;
if (health && health.dataVersion !== dataset.version) {
  console.error(`The worker serves data ${health.dataVersion} but data/dataset-v1.0.json is ${dataset.version}. Restart the worker.`);
  process.exit(1);
}
if (health?.fixture) { console.error("The worker is serving FAKE fixture data; summaries must come from the real dataset."); process.exit(1); }

const file = readJson(CACHE);
file.summaries ??= {};
const before = Object.keys(file.summaries).length;
console.log(`Data ${dataVersion}; ${psiIds.length} investigation(s); budget ${flags.maxCalls} Gemini requests${flags.dryRun ? " (dry run)" : ""}\n`);

const tasks = summaryTasks(psiIds, {
  dataVersion, models: health?.geminiModels ?? 3, file,
  post: async (body) => {
    const res = await fetch(`${WORKER}/api/dev/summaries`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(240_000),
    });
    if (!res.ok) throw new Error(`worker returned HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.json();
  },
});

const s = await runBudgeted(tasks, { maxCalls: flags.maxCalls, dryRun: flags.dryRun });
const added = Object.keys(file.summaries).length - before;
// Written once at the end: `wrangler dev` reloads the worker when watched files change.
if (added > 0) writeFileSync(abs(CACHE), JSON.stringify(file, null, 2) + "\n");
if (!flags.dryRun) {
  console.log(`\n${added ? `Wrote ${added} summary(ies) to ${CACHE}. Review and commit it.` : "Nothing new to write."} ${s.callsUsed} of ${flags.maxCalls} Gemini requests used.`);
}
