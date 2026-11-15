/**
 * Shared by `pnpm index:vectors` and `pnpm eval:embed`. Plain Node, no dependencies.
 * Embeddings go through the locally running worker (POST /api/dev/embed, one Workers AI call per batch),
 * so these scripts never need a Cloudflare token: `wrangler dev` holds the AI binding.
 */
import { createHash } from "node:crypto";

export const MODEL = "@cf/baai/bge-m3";
export const DIMENSIONS = 1024;
export const BATCH = 20;

export const textHash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

/** 5 decimals keeps cosine order intact and the cache files small enough to commit. */
export const roundVector = (v) => v.map((x) => Math.round(x * 1e5) / 1e5);

export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** @param {string[]} argv */
export function parseEmbedFlags(argv) {
  const out = { dryRun: false, maxCalls: null, skipUpsert: false };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s, 2);
    if (flag === "--dry-run") out.dryRun = true;
    else if (flag === "--skip-upsert") out.skipUpsert = true;
    else if (flag === "--max-calls") {
      const n = Number(inline ?? argv[++i]);
      if (!Number.isInteger(n) || n < 0) throw new Error("--max-calls must be a whole number >= 0");
      out.maxCalls = n;
    } else throw new Error(`unknown flag ${flag}`);
  }
  return out;
}

/** Health check: the worker must be running and serve the same data version as data/dataset.json. */
export async function checkWorker(worker, datasetVersion) {
  let health = null;
  try { health = await (await fetch(`${worker}/api/health`, { signal: AbortSignal.timeout(3000) })).json(); } catch { /* not running */ }
  if (!health) throw new Error(`No worker at ${worker}. Start it first: pnpm dev:worker`);
  if (health.dataVersion !== datasetVersion) throw new Error(`The worker serves data ${health.dataVersion} but data/dataset.json is ${datasetVersion}. Restart the worker.`);
  if (health.fixture) throw new Error("The worker is serving FAKE fixture data; embeddings must come from the real dataset.");
  return health;
}

/** One Workers AI call through the worker. */
export async function embedBatch(worker, texts) {
  const res = await fetch(`${worker}/api/dev/embed`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts, maxCalls: 1 }), signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(body.vectors)) throw new Error(`embed failed: HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  if (body.vectors.length !== texts.length || body.vectors.some((v) => v.length !== DIMENSIONS)) throw new Error("embed returned the wrong shape");
  return body.vectors.map(roundVector);
}
