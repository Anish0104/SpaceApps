/**
 * Semantic retrieval: Workers AI (@cf/baai/bge-m3, 1024-d) for embeddings, Vectorize for nearest
 * neighbours, KV for cached query vectors. It only decides which records are retrieved: its scores are
 * fused with keyword scores (rrf in search.ts) and then go through the same rules-engine ranking.
 *
 * If anything here throws, is missing, or takes longer than the timeout, the caller gets
 * { mode: "keyword" } with the reason, and search runs keyword-only. Nothing here calls Gemini.
 */
import type { Dataset } from "@flameatlas/engine";
import { psiIdOfDoc } from "./corpus";

export const EMBED_MODEL = "@cf/baai/bge-m3";
export const EMBED_DIMENSIONS = 1024;
export const VECTOR_TOP_K = 20;
export const SEMANTIC_TIMEOUT_MS = 1500;
const QUERY_TTL_S = 60 * 60 * 24 * 7;

export type SearchMode = "hybrid" | "keyword";

/** The Workers AI binding, narrowed to what we call. */
export interface EmbedAI {
  run(model: string, input: { text: string[] }): Promise<unknown>;
}

/** The Vectorize binding, narrowed to what we call. */
export interface VectorQuery {
  query(
    vector: number[],
    options: { topK: number; filter?: Record<string, string>; returnMetadata?: "none" | "indexed" | "all" },
  ): Promise<{ matches: { id: string; score: number; metadata?: Record<string, unknown> }[] }>;
}

export interface SemanticDeps {
  ai?: EmbedAI;
  vectors?: VectorQuery;
  kv?: Pick<KVNamespace, "get" | "put">;
  dataVersion: string;
  timeoutMs?: number;
  log?: (msg: string) => void;
}

export type SemanticResult = { mode: "hybrid"; scores: Map<string, number> } | { mode: "keyword"; reason: string };

/** Embed texts with bge-m3 in one Workers AI call. */
export async function embed(ai: EmbedAI, texts: string[]): Promise<number[][]> {
  const out = (await ai.run(EMBED_MODEL, { text: texts })) as { data?: number[][] };
  const data = out?.data;
  if (!Array.isArray(data) || data.length !== texts.length || data.some((v) => !Array.isArray(v) || v.length !== EMBED_DIMENSIONS)) {
    throw new Error(`unexpected ${EMBED_MODEL} output`);
  }
  return data;
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cache key for a question's vector: same wording (case and spacing aside) gives the same key. */
export const queryKey = async (question: string) => `qemb:${EMBED_MODEL}:${await sha256Hex(question.trim().replace(/\s+/g, " ").toLowerCase())}`;

const memVectors = new Map<string, number[]>();

/** The question's vector: memory, then KV (7 days), then one Workers AI call. */
export async function queryVector(question: string, deps: Pick<SemanticDeps, "ai" | "kv">): Promise<number[]> {
  const key = await queryKey(question);
  const mem = memVectors.get(key);
  if (mem) return mem;
  const cached = deps.kv ? ((await deps.kv.get(key, "json")) as number[] | null) : null;
  if (Array.isArray(cached) && cached.length === EMBED_DIMENSIONS) {
    memVectors.set(key, cached);
    return cached;
  }
  if (!deps.ai) throw new Error("no AI binding");
  const [vec] = await embed(deps.ai, [question]);
  memVectors.set(key, vec!);
  if (deps.kv) await deps.kv.put(key, JSON.stringify(vec), { expirationTtl: QUERY_TTL_S });
  return vec!;
}

/**
 * Document hits -> 0..1 score per investigation. A run hit counts for its investigation; an
 * investigation keeps its best hit. Hits from another data version or unknown ids are dropped.
 */
export function scoresFromHits(ds: Dataset, hits: { id: string; score: number; metadata?: Record<string, unknown> }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const h of hits) {
    const v = h.metadata?.dataVersion;
    if (v !== undefined && v !== ds.version) continue;
    const psiId = psiIdOfDoc(ds, h.id);
    if (!psiId) continue;
    out.set(psiId, Math.max(out.get(psiId) ?? -Infinity, h.score));
  }
  return out;
}

/** Resolve with `work`, or reject after `ms`; the timer never outlives the race. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, limit]).finally(() => clearTimeout(timer));
}

/** Semantic scores for a question, or the reason search must run keyword-only. Never throws. */
export async function semanticScores(ds: Dataset, question: string, deps: SemanticDeps): Promise<SemanticResult> {
  if (!question.trim()) return { mode: "keyword", reason: "empty question" };
  if (!deps.ai || !deps.vectors) return { mode: "keyword", reason: `${!deps.ai ? "AI" : "VECTORS"} binding not configured` };
  try {
    const work = (async () => {
      const vec = await queryVector(question, deps);
      const res = await deps.vectors!.query(vec, { topK: VECTOR_TOP_K, filter: { dataVersion: deps.dataVersion }, returnMetadata: "indexed" });
      return scoresFromHits(ds, res.matches ?? []);
    })();
    const scores = await withTimeout(work, deps.timeoutMs ?? SEMANTIC_TIMEOUT_MS);
    if (!scores.size) return { mode: "keyword", reason: `no vectors for data version ${deps.dataVersion}` };
    return { mode: "hybrid", scores };
  } catch (e) {
    const reason = String(e instanceof Error ? e.message : e).slice(0, 200);
    deps.log?.(`search: semantic retrieval unavailable (${reason}), using keyword only`);
    return { mode: "keyword", reason };
  }
}

// ---------- offline (tests and the benchmark: cached vectors, no network) ----------

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export interface EmbeddingsFile {
  model: string;
  dimensions: number;
  dataVersion: string;
  docs: Record<string, { textHash: string; vector: number[]; metadata: { psiId: string; kind: string; dataVersion: string }; indexed?: boolean }>;
}

/** The same top-k + mapping as Vectorize, computed locally over cached vectors. */
export function offlineSemanticScores(ds: Dataset, queryVec: number[], file: EmbeddingsFile, k = VECTOR_TOP_K): Map<string, number> {
  const hits = Object.entries(file.docs)
    .filter(([, d]) => d.metadata.dataVersion === ds.version)
    .map(([id, d]) => ({ id, score: cosine(queryVec, d.vector), metadata: d.metadata as Record<string, unknown> }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scoresFromHits(ds, hits);
}

export function clearQueryVectors() {
  memVectors.clear();
}
