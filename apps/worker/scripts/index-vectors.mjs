#!/usr/bin/env node
/**
 * pnpm index:vectors [--dry-run] [--max-calls N] [--skip-upsert]
 *
 * Embeds every corpus document (one per investigation, one per run) with Workers AI @cf/baai/bge-m3 and
 * upserts it into the Vectorize index flameatlas-records, tagged with the data version. The version is
 * read from data/dataset.json, so after a new data release re-indexing is this one command.
 *
 *   - Vectors are saved to data/cache/embeddings-<version>.json (committed), so tests and the offline
 *     benchmark never need the network.
 *   - A document already embedded with the same text is not embedded again; one already upserted for
 *     this version is not upserted again.
 *   - Prints how many Workers AI calls it will make (one per batch of 20) before making any.
 *     --dry-run stops there. --max-calls caps the calls (default: exactly the planned number).
 *   - --skip-upsert embeds and saves the cache file but does not touch Vectorize.
 *
 * Needs `pnpm dev:worker` running (it holds the AI binding; Workers AI always runs on Cloudflare and
 * uses the account's free daily Neurons). The upsert runs `wrangler vectorize upsert`, so you must be
 * logged in (`wrangler login`) and the index must exist (see docs/DEPLOY.md).
 * Another port: WORKER_URL=http://localhost:8788 pnpm index:vectors
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BATCH, DIMENSIONS, MODEL, checkWorker, chunk, embedBatch, parseEmbedFlags, textHash } from "./lib/embed.mjs";

const INDEX_NAME = "flameatlas-records";
const root = new URL("../../../", import.meta.url);
const abs = (rel) => fileURLToPath(new URL(rel, root));
const WORKER = (process.env.WORKER_URL ?? "http://localhost:8787").replace(/\/$/, "");

let flags;
try { flags = parseEmbedFlags(process.argv.slice(2)); } catch (e) { console.error(String(e.message ?? e)); process.exit(2); }

const version = JSON.parse(readFileSync(abs("data/dataset.json"), "utf8")).version;
const CACHE = `data/cache/embeddings-${version}.json`;
const NDJSON = `data/cache/vectors-${version}.ndjson`;

try { await checkWorker(WORKER, version); } catch (e) { console.error(String(e.message ?? e)); process.exit(1); }

const { docs } = await (await fetch(`${WORKER}/api/dev/corpus`)).json();
const file = existsSync(abs(CACHE))
  ? JSON.parse(readFileSync(abs(CACHE), "utf8"))
  : { model: MODEL, dimensions: DIMENSIONS, dataVersion: version, docs: {} };
if (file.model !== MODEL || file.dimensions !== DIMENSIONS || file.dataVersion !== version) {
  console.error(`${CACHE} was made for ${file.model}/${file.dimensions}/${file.dataVersion}; move it away to rebuild.`);
  process.exit(1);
}

const current = (d) => file.docs[d.id] && file.docs[d.id].textHash === textHash(d.text);
const toEmbed = docs.filter((d) => !current(d));
const batches = chunk(toEmbed, BATCH);
const calls = batches.length;
const maxCalls = flags.maxCalls ?? calls;
const willUpsert = () => docs.filter((d) => !(current(d) && file.docs[d.id].indexed));

console.log(`Data ${version}: ${docs.length} documents (${docs.filter((d) => d.metadata.kind === "investigation").length} investigations, ${docs.filter((d) => d.metadata.kind === "run").length} runs)`);
console.log(`  already embedded: ${docs.length - toEmbed.length}; to embed: ${toEmbed.length}`);
console.log(`  Workers AI calls planned: ${calls} (batches of ${BATCH}, model ${MODEL}); budget ${maxCalls}`);
console.log(`  to upsert into ${INDEX_NAME}: ${willUpsert().length}${flags.skipUpsert ? " (skipped: --skip-upsert)" : ""}`);
if (flags.dryRun) { console.log("\nDry run: nothing embedded, nothing upserted."); process.exit(0); }
if (calls > maxCalls) { console.error(`\n${calls} calls planned but --max-calls is ${maxCalls}. Nothing was embedded.`); process.exit(1); }

let used = 0;
const save = () => {
  const keep = new Set(docs.map((d) => d.id));
  file.docs = Object.fromEntries(Object.entries(file.docs).filter(([id]) => keep.has(id)).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(abs(CACHE), JSON.stringify(file) + "\n");
};
for (const batch of batches) {
  const vectors = await embedBatch(WORKER, batch.map((d) => d.text));
  used++;
  batch.forEach((d, i) => { file.docs[d.id] = { textHash: textHash(d.text), vector: vectors[i], metadata: d.metadata, indexed: false }; });
  save();
  console.log(`  embedded ${batch.length} (${used}/${calls} calls)`);
}
save();
console.log(`\nWorkers AI calls made: ${used}. Saved ${CACHE}.`);

if (flags.skipUpsert) process.exit(0);
const pending = willUpsert();
if (!pending.length) { console.log(`Nothing to upsert: every document is already in ${INDEX_NAME} for ${version}.`); process.exit(0); }

writeFileSync(abs(NDJSON), pending.map((d) => JSON.stringify({ id: d.id, values: file.docs[d.id].vector, metadata: d.metadata })).join("\n") + "\n");
console.log(`\nUpserting ${pending.length} vectors: npx wrangler vectorize upsert ${INDEX_NAME} --file ${NDJSON}`);
const r = spawnSync("npx", ["wrangler", "vectorize", "upsert", INDEX_NAME, "--file", abs(NDJSON)], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), stdio: "inherit",
});
if (r.status !== 0) { console.error("\nUpsert failed; the cache file is kept, so re-running only retries the upsert (no new AI calls)."); process.exit(1); }
pending.forEach((d) => { file.docs[d.id].indexed = true; });
save();
console.log(`Upserted ${pending.length} vectors into ${INDEX_NAME} for data ${version}.`);
