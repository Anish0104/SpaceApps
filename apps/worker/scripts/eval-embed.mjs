#!/usr/bin/env node
/**
 * pnpm eval:embed [questions.json] [--dry-run] [--max-calls N]
 *
 * Embeds benchmark questions ONCE with Workers AI @cf/baai/bge-m3, exactly as the live worker would embed a
 * question (the raw question text), and saves them to data/cache/eval-query-embeddings-<version>.json
 * (committed), keyed by a hash of the question text, so any number of question files share one cache
 * without id clashes. Default file: data/eval/questions.json; e.g. `pnpm eval:embed data/eval/heldout.json`. With the corpus vectors from
 * `pnpm index:vectors`, that lets `pnpm eval:rank` / `pnpm eval:score` score hybrid search offline.
 *
 * The data version comes from data/dataset.json. Questions already embedded with the same text are skipped.
 * Prints the planned Workers AI calls (one per batch of 20) before making any; --dry-run stops there.
 * Needs `pnpm dev:worker` (it holds the AI binding). Another port: WORKER_URL=http://localhost:8788
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BATCH, DIMENSIONS, MODEL, checkWorker, chunk, embedBatch, parseEmbedFlags, textHash } from "./lib/embed.mjs";

const root = new URL("../../../", import.meta.url);
const abs = (rel) => fileURLToPath(new URL(rel, root));
const WORKER = (process.env.WORKER_URL ?? "http://localhost:8787").replace(/\/$/, "");

const args = process.argv.slice(2);
const fileArg = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--max-calls");
let flags;
try { flags = parseEmbedFlags(args.filter((a) => a !== fileArg)); } catch (e) { console.error(String(e.message ?? e)); process.exit(2); }
// pnpm runs this from apps/worker; INIT_CWD is where you typed the command.
const questionsPath = fileArg ? (isAbsolute(fileArg) ? fileArg : resolve(process.env.INIT_CWD ?? process.cwd(), fileArg)) : abs("data/eval/questions.json");

const version = JSON.parse(readFileSync(abs("data/dataset.json"), "utf8")).version;
const questions = JSON.parse(readFileSync(questionsPath, "utf8")).questions;
const CACHE = `data/cache/eval-query-embeddings-${version}.json`;
const file = existsSync(abs(CACHE))
  ? JSON.parse(readFileSync(abs(CACHE), "utf8"))
  : { model: MODEL, dimensions: DIMENSIONS, dataVersion: version, keyedBy: "sha256(question text), first 16 hex", vectors: {} };
file.vectors ??= {};

const todo = questions.filter((q) => !file.vectors[textHash(q.question)]);
const batches = chunk(todo, BATCH);
const maxCalls = flags.maxCalls ?? batches.length;
console.log(`Data ${version}, ${questionsPath.replace(abs(""), "")}: ${questions.length} questions; already embedded ${questions.length - todo.length}; to embed ${todo.length}`);
console.log(`  Workers AI calls planned: ${batches.length} (batches of ${BATCH}, model ${MODEL}); budget ${maxCalls}`);
if (flags.dryRun) { console.log("\nDry run: nothing embedded."); process.exit(0); }
if (batches.length > maxCalls) { console.error(`\n${batches.length} calls planned but --max-calls is ${maxCalls}. Nothing was embedded.`); process.exit(1); }
if (!batches.length) process.exit(0);

try { await checkWorker(WORKER, version); } catch (e) { console.error(String(e.message ?? e)); process.exit(1); }
let used = 0;
for (const batch of batches) {
  const vectors = await embedBatch(WORKER, batch.map((q) => q.question));
  used++;
  batch.forEach((q, i) => { file.vectors[textHash(q.question)] = vectors[i]; });
  writeFileSync(abs(CACHE), JSON.stringify(file) + "\n");
  console.log(`  embedded ${batch.length} (${used}/${batches.length} calls)`);
}
console.log(`\nWorkers AI calls made: ${used}. Saved ${CACHE}.`);
