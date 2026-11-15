/**
 * Hybrid retrieval (stage 1). No network: Workers AI, Vectorize and KV are mocked, and the cached
 * embeddings file is only read when it exists. Nothing here calls Gemini.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dataset, Scenario, SearchRequest } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";
import { buildCorpus, invDocId, psiIdOfDoc, runDocId } from "../src/corpus";
import { buildIndex, fuseCosine, keywordScores, normalise, planRetrieval, rrf, search } from "../src/search";
import questionsJson from "../../../data/eval/questions.json";
import {
  EMBED_DIMENSIONS, EMBED_MODEL, VECTOR_TOP_K, clearQueryVectors, cosine, offlineSemanticScores, queryKey, scoresFromHits, semanticScores,
  type EmbedAI, type EmbeddingsFile, type VectorQuery,
} from "../src/semantic";
import worker from "../src/index";

const ds = Dataset.parse(datasetJson);
const index = buildIndex(ds);
const moon = Scenario.parse(scenariosJson.find((s) => s.id === "moon-challenge"));
const vec = (seed: number) => Array.from({ length: EMBED_DIMENSIONS }, (_, i) => Math.sin(seed * 31 + i));
const aRun = ds.runs[0]!;
const anInv = ds.investigations.find((i) => i.psiId !== aRun.psiId)!;

/** An AI mock that counts calls. */
const fakeAI = (impl?: () => Promise<unknown>) => {
  const ai = { calls: 0, run: vi.fn(async (_m: string, input: { text: string[] }) => { ai.calls++; return impl ? impl() : { data: input.text.map((_, i) => vec(i + 1)) }; }) };
  return ai as typeof ai & EmbedAI;
};
/** A Vectorize mock that records the query options and returns fixed matches. */
const fakeVectors = (matches: { id: string; score: number; metadata?: Record<string, unknown> }[]) => {
  const v = { lastOptions: undefined as unknown, query: vi.fn(async (_v: number[], o: unknown) => { v.lastOptions = o; return { matches }; }) };
  return v as typeof v & VectorQuery;
};
const memKV = () => {
  const store = new Map<string, string>();
  const puts: { key: string; ttl?: number }[] = [];
  return {
    store, puts,
    get: vi.fn(async (k: string) => (store.has(k) ? JSON.parse(store.get(k)!) : null)),
    put: vi.fn(async (k: string, v: string, o?: { expirationTtl?: number }) => { store.set(k, v); puts.push({ key: k, ttl: o?.expirationTtl }); }),
  } as unknown as KVNamespace & { store: Map<string, string>; puts: { key: string; ttl?: number }[] };
};

beforeEach(() => clearQueryVectors());

/** data/cache/embeddings-<version>.json, written by `pnpm index:vectors`; null until it exists. */
const cached: unknown = await import(`../../../data/cache/embeddings-${ds.version}.json`).then((m) => m.default, () => null);

describe("corpus", () => {
  const corpus = buildCorpus(ds);
  it("has one document per investigation and per run, with stable, unique ids", () => {
    expect(corpus).toHaveLength(ds.investigations.length + ds.runs.length);
    expect(new Set(corpus.map((d) => d.id)).size).toBe(corpus.length);
    expect(corpus.map((d) => d.id)).toContain(invDocId(anInv.psiId));
    expect(corpus.map((d) => d.id)).toContain(runDocId(aRun.id));
  });
  it("tags every document with its investigation, kind and the data version", () => {
    for (const d of corpus) {
      expect(d.metadata.dataVersion).toBe(ds.version);
      expect(psiIdOfDoc(ds, d.id)).toBe(d.metadata.psiId);
      expect(d.text.length).toBeGreaterThan(20);
    }
    const run = corpus.find((d) => d.id === runDocId(aRun.id))!;
    expect(run.metadata).toEqual({ psiId: aRun.psiId, kind: "run", dataVersion: ds.version });
  });
});

describe("run-to-investigation mapping", () => {
  it("maps a run hit to its investigation and keeps each investigation's best score", () => {
    const scores = scoresFromHits(ds, [
      { id: runDocId(aRun.id), score: 0.8 },
      { id: invDocId(aRun.psiId), score: 0.6 },
      { id: invDocId(anInv.psiId), score: 0.7 },
      { id: "run:NOT-A-RUN", score: 0.99 },
    ]);
    expect(scores.get(aRun.psiId)).toBe(0.8);
    expect(scores.get(anInv.psiId)).toBe(0.7);
    expect(scores.size).toBe(2);
  });
});

describe("version filtering", () => {
  it("asks Vectorize for this data version only, and drops any hit from another version", async () => {
    const vectors = fakeVectors([
      { id: invDocId(anInv.psiId), score: 0.9, metadata: { dataVersion: ds.version } },
      { id: runDocId(aRun.id), score: 0.95, metadata: { dataVersion: "0.9.0" } },
    ]);
    const r = await semanticScores(ds, "fabric flame spread", { ai: fakeAI(), vectors, dataVersion: ds.version });
    expect(vectors.lastOptions).toEqual({ topK: VECTOR_TOP_K, filter: { dataVersion: ds.version }, returnMetadata: "indexed" });
    expect(r.mode).toBe("hybrid");
    if (r.mode === "hybrid") expect([...r.scores.keys()]).toEqual([anInv.psiId]);
  });
});

describe("fusion", () => {
  it("rrf puts an id ranked well in both lists above ids ranked well in only one", () => {
    const kw = new Map([["A", 1], ["B", 0.9], ["C", 0.1]]);
    const sem = new Map([["B", 0.95], ["D", 0.9], ["A", 0.2]]);
    const order = [...rrf([kw, sem])].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    expect(order[0]).toBe("B"); // 2nd and 1st
    expect(order.indexOf("A")).toBeLessThan(order.indexOf("D")); // 1st and 3rd beats only 2nd
    expect(order.at(-1)).toBe("C");
  });
  it("semantic scores change which investigation search ranks first, through the same engine", () => {
    const req = SearchRequest.parse({ query: "zzzz unmatched words", scenarioId: moon.id });
    expect(keywordScores(index, req.query).size).toBe(0);
    const target = ds.investigations.at(-1)!.psiId;
    const plain = search(ds, index, moon, req);
    const hybrid = search(ds, index, moon, req, new Map([[target, 1]]));
    expect(hybrid.find((r) => r.psiId === target)!.score ?? 0).toBeGreaterThanOrEqual(plain.find((r) => r.psiId === target)!.score ?? 0);
    expect(hybrid.map((r) => r.psiId).sort()).toEqual(plain.map((r) => r.psiId).sort()); // same candidates, re-ordered only
  });
});

describe("fallback to keyword", () => {
  it("falls back when Workers AI throws, and logs why", async () => {
    const log = vi.fn();
    const r = await semanticScores(ds, "fabric", { ai: fakeAI(async () => { throw new Error("AI down"); }), vectors: fakeVectors([]), dataVersion: ds.version, log });
    expect(r).toEqual({ mode: "keyword", reason: "AI down" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("using keyword only"));
  });
  it("falls back when Vectorize is slower than the timeout", async () => {
    const slow = { query: () => new Promise<never>(() => {}) } as unknown as VectorQuery;
    const r = await semanticScores(ds, "fabric", { ai: fakeAI(), vectors: slow, dataVersion: ds.version, timeoutMs: 20 });
    expect(r.mode).toBe("keyword");
    if (r.mode === "keyword") expect(r.reason).toMatch(/timed out/);
  });
  it("falls back when a binding is missing or the index has nothing for this version", async () => {
    expect((await semanticScores(ds, "fabric", { vectors: fakeVectors([]), dataVersion: ds.version })).mode).toBe("keyword");
    const empty = await semanticScores(ds, "fabric", { ai: fakeAI(), vectors: fakeVectors([]), dataVersion: ds.version });
    expect(empty).toEqual({ mode: "keyword", reason: `no vectors for data version ${ds.version}` });
  });
  it("/api/ask still answers, keyword-only, when hybrid is on and Workers AI throws (header says so)", async () => {
    const env = { DATA_VERSION: ds.version, SEARCH_MODE: "hybrid", AI: fakeAI(async () => { throw new Error("AI down"); }), VECTORS: fakeVectors([]) };
    const res = await worker.fetch(new Request("http://x/api/ask", { method: "POST", body: JSON.stringify({ question: "fabric fire on the Moon", scenarioId: "moon-challenge", dataVersion: ds.version }) }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Oxyflame-Retrieval")).toBe("keyword");
    expect(((await res.json()) as { source: string }).source).toBe("template");
  });
});

describe("query-vector cache", () => {
  it("embeds a question once, then serves it from KV for 7 days (same wording, any case or spacing)", async () => {
    const ai = fakeAI();
    const kv = memKV();
    const vectors = fakeVectors([{ id: invDocId(anInv.psiId), score: 0.9 }]);
    await semanticScores(ds, "Fabric  flame spread", { ai, vectors, kv, dataVersion: ds.version });
    clearQueryVectors(); // a fresh isolate: only KV remains
    await semanticScores(ds, "fabric flame spread", { ai, vectors, kv, dataVersion: ds.version });
    expect(ai.calls).toBe(1);
    expect(kv.puts).toEqual([{ key: await queryKey("fabric flame spread"), ttl: 60 * 60 * 24 * 7 }]);
    expect(ai.run).toHaveBeenCalledWith(EMBED_MODEL, { text: ["Fabric  flame spread"] });
  });
});

describe("offline scoring over cached vectors", () => {
  it("ranks by cosine and maps runs to investigations, like Vectorize", () => {
    const file: EmbeddingsFile = {
      model: EMBED_MODEL, dimensions: EMBED_DIMENSIONS, dataVersion: ds.version,
      docs: {
        [runDocId(aRun.id)]: { textHash: "x", vector: vec(1), metadata: { psiId: aRun.psiId, kind: "run", dataVersion: ds.version } },
        [invDocId(anInv.psiId)]: { textHash: "y", vector: vec(2), metadata: { psiId: anInv.psiId, kind: "investigation", dataVersion: ds.version } },
      },
    };
    const scores = offlineSemanticScores(ds, vec(1), file);
    expect(scores.get(aRun.psiId)).toBeCloseTo(1, 6);
    expect(scores.get(aRun.psiId)!).toBeGreaterThan(scores.get(anInv.psiId)!);
    expect(cosine(vec(3), vec(3))).toBeCloseTo(1, 9);
  });

  it.skipIf(!cached)(`the committed embeddings-${ds.version}.json covers the whole corpus with 1024-d vectors`, () => {
    const file = cached as EmbeddingsFile;
    expect(file).toMatchObject({ model: EMBED_MODEL, dimensions: EMBED_DIMENSIONS, dataVersion: ds.version });
    for (const d of buildCorpus(ds)) {
      expect(file.docs[d.id], d.id).toBeDefined();
      expect(file.docs[d.id]!.vector).toHaveLength(EMBED_DIMENSIONS);
    }
  });
});

describe("semantic fallback (keyword finds nothing)", () => {
  const noHits = "qqqq zzzz xxyyzz";
  const target = ds.investigations.at(-1)!.psiId;

  it("SEARCH_MODE keyword never calls Workers AI while keyword has hits", async () => {
    const ai = fakeAI();
    const plan = await planRetrieval(ds, index, "fabric flame spread", "keyword", { ai, vectors: fakeVectors([]), dataVersion: ds.version });
    expect(plan).toMatchObject({ label: "keyword" });
    expect(ai.calls).toBe(0);
  });

  it("uses the Vectorize results instead of returning nothing, ranked by normalised cosine", async () => {
    expect(keywordScores(index, noHits).size).toBe(0);
    const vectors = fakeVectors([
      { id: invDocId(target), score: 0.61, metadata: { dataVersion: ds.version } },
      { id: invDocId(anInv.psiId), score: 0.55, metadata: { dataVersion: ds.version } },
    ]);
    const plan = await planRetrieval(ds, index, noHits, "keyword", { ai: fakeAI(), vectors, dataVersion: ds.version });
    expect(plan.label).toBe("semantic-fallback");
    expect(plan.fusion).toBe("cosine");
    expect(plan.semantic!.get(target)).toBe(0.61);
    const req = SearchRequest.parse({ query: noHits, scenarioId: moon.id });
    const keywordOnly = search(ds, index, moon, req);
    const fallback = search(ds, index, moon, req, plan.semantic, plan.fusion);
    const rank = (rs: typeof fallback, id: string) => rs.findIndex((r) => r.psiId === id);
    expect(rank(fallback, target)).toBeLessThanOrEqual(rank(keywordOnly, target));
  });

  it("still falls back to keyword (with the reason) when Workers AI fails or Vectorize is slow", async () => {
    const thrown = await planRetrieval(ds, index, noHits, "keyword", { ai: fakeAI(async () => { throw new Error("AI down"); }), vectors: fakeVectors([]), dataVersion: ds.version });
    expect(thrown).toMatchObject({ label: "keyword", reason: "AI down" });
    const slow = { query: () => new Promise<never>(() => {}) } as unknown as VectorQuery;
    const timed = await planRetrieval(ds, index, noHits, "keyword", { ai: fakeAI(), vectors: slow, dataVersion: ds.version, timeoutMs: 20 });
    expect(timed.label).toBe("keyword");
    expect(timed.reason).toMatch(/timed out/);
  });

  it("does not touch the benchmark: every eval question has keyword hits, so it is never used there", () => {
    for (const q of questionsJson.questions) expect(keywordScores(index, q.question).size, q.id).toBeGreaterThan(0);
  });

  it("/api/search reports semantic-fallback in the header when it is used", async () => {
    const env = { DATA_VERSION: ds.version, AI: fakeAI(), VECTORS: fakeVectors([{ id: invDocId(target), score: 0.6, metadata: { dataVersion: ds.version } }]) };
    const res = await worker.fetch(new Request("http://x/api/search", { method: "POST", body: JSON.stringify({ query: noHits, scenarioId: "moon-challenge" }) }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Oxyflame-Retrieval")).toBe("semantic-fallback");
  });
});

describe("hybrid-cosine fusion (built, off by default)", () => {
  it("averages the keyword score with the min-max normalised cosine score", () => {
    const kw = new Map([["A", 1], ["B", 0.5]]);
    const sem = new Map([["B", 0.62], ["C", 0.58], ["A", 0.5]]);
    const f = fuseCosine(kw, sem);
    expect(f.get("A")).toBeCloseTo((1 + 0) / 2, 9); // lowest cosine -> 0 after normalising
    expect(f.get("B")).toBeCloseTo((0.5 + 1) / 2, 9);
    expect(f.get("C")).toBeCloseTo((0 + (0.58 - 0.5) / 0.12) / 2, 9);
  });
  it("keeps the spread that rrf loses: scores span 0..1 instead of ~0.78..1", () => {
    const sem = new Map(Array.from({ length: 18 }, (_, i) => [`P${i}`, 0.65 - i * 0.005] as const));
    const n = normalise(sem);
    expect(Math.max(...n.values())).toBe(1);
    expect(Math.min(...n.values())).toBe(0);
    const r = rrf([sem]);
    expect(Math.min(...r.values())).toBeGreaterThan(0.75);
  });
  it("is chosen only when SEARCH_MODE asks for it", async () => {
    const vectors = fakeVectors([{ id: invDocId(anInv.psiId), score: 0.6, metadata: { dataVersion: ds.version } }]);
    const plan = await planRetrieval(ds, index, "fabric flame spread", "hybrid-cosine", { ai: fakeAI(), vectors, dataVersion: ds.version });
    expect(plan).toMatchObject({ label: "hybrid-cosine", fusion: "cosine" });
    const rrfPlan = await planRetrieval(ds, index, "fabric flame spread", "hybrid", { ai: fakeAI(), vectors, dataVersion: ds.version });
    expect(rrfPlan).toMatchObject({ label: "hybrid", fusion: "rrf" });
  });
});
