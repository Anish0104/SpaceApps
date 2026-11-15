/**
 * FlameAtlas API (Cloudflare Worker)
 *   GET  /api/health
 *   GET  /api/data/:version
 *   POST /api/search   Contract 2
 *   POST /api/ask      Contract 3 (six-beat answer via Gemini, validated; demo cache; template fallback)
 *   POST /api/sms      Twilio webhook: signed, rate-limited, deterministic engine reply (no Gemini)
 *   POST /api/dev/warm-cache   localhost only, used by `pnpm warm-cache` (spends Gemini quota)
 *   POST /api/dev/eval         localhost only, used by `pnpm eval:record` (spends Gemini quota)
 *   POST /api/dev/summaries    localhost only, used by `pnpm summaries` (spends Gemini quota)
 *   GET  /api/dev/corpus       localhost only, used by `pnpm index:vectors` (no AI calls)
 *   POST /api/dev/embed        localhost only, used by `pnpm index:vectors` and `pnpm eval:embed` (Workers AI calls)
 *
 * Everything else is the web app (apps/web/dist), served by Workers static assets: wrangler.toml routes only
 * /api/* to this code (run_worker_first), and unknown paths get index.html (single-page application).
 *
 * Retrieval (src/search.ts planRetrieval): keyword by default; when keyword finds nothing, the bge-m3 /
 * Vectorize results instead (semantic-fallback); SEARCH_MODE = "hybrid" | "hybrid-cosine" fuses both.
 * Any AI/Vectorize failure or the 1.5 s timeout falls back to keyword, logged. The mode is reported in the
 * X-FlameAtlas-Retrieval response header; response bodies are unchanged.
 */
import { AskRequest, AskResponse, Dataset, Scenario, SearchRequest } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";
import demoAnswersJson from "../../../data/cache/demo-answers.json";
import summariesJson from "../../../data/cache/summaries.json";
import { SummaryFile } from "@flameatlas/engine";
import { z } from "zod";
import { buildCorpus } from "./corpus";
import { embed, type EmbedAI, type VectorQuery } from "./semantic";
import { buildIndex, planRetrieval, search, searchModeOf, type RetrievalPlan } from "./search";
import { ask } from "./ask";
import { parseModels } from "./gemini";
import { WarmRequest, loadDemoAnswers, warmCache } from "./demoCache";
import { EvalRequest, budgetedFetch, runEval } from "./evalRun";
import { SummaryRequest, summarize } from "./summaries";
import { corsHeaders } from "./cors";
import { SlidingWindow, handleSms } from "./sms";

export interface Env {
  DATA_VERSION: string;
  /** Extra browser origins allowed by CORS: the mobile app on Pages, local dev. The website is same-origin. */
  ALLOWED_ORIGIN?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODELS?: string; // comma-separated, tried in order
  /** Workers AI binding: @cf/baai/bge-m3 embeddings for hybrid search. */
  AI?: EmbedAI;
  /** Vectorize index flameatlas-records (1024 dimensions, cosine), metadata index on dataVersion. */
  VECTORS?: VectorQuery;
  /** "keyword" (default), "hybrid" (rrf) or "hybrid-cosine". Anything else means keyword. */
  SEARCH_MODE?: string;
  /** Workers static assets (the built web app). */
  ASSETS?: Fetcher;
  /** Twilio account auth token, used to verify the X-Twilio-Signature on /api/sms. */
  TWILIO_AUTH_TOKEN?: string;
  /** Answer cache and query-vector cache (keys prefixed qemb:). */
  ANSWERS?: KVNamespace;
}

const EmbedRequest = z.object({ texts: z.array(z.string().min(1)).min(1).max(50), maxCalls: z.number().int().min(0) });

// The released dataset, bundled with the worker. data/fixtures.json (FAKE values) is for unit tests only.
// TODO(data release): load dataset-vX.Y.json from R2 instead of bundling it.
const DS = Dataset.parse(datasetJson);
const SCENARIOS = scenariosJson.map((s) => Scenario.parse(s));
const INDEX = buildIndex(DS);
// Committed demo answers (filled by `pnpm warm-cache`); served offline with source "cache".
const DEMO = loadDemoAnswers(demoAnswersJson, (m) => console.warn(m));
const SUMMARIES = SummaryFile.safeParse(summariesJson);

/** Which scores to rank this question with (keyword, semantic-fallback, hybrid, hybrid-cosine). */
function retrieval(env: Env, question: string): Promise<RetrievalPlan> {
  return planRetrieval(DS, INDEX, question, searchModeOf(env.SEARCH_MODE), {
    ai: env.AI, vectors: env.VECTORS, kv: env.ANSWERS, dataVersion: DS.version, log: (m) => console.log(m),
  });
}

const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
// One limiter per isolate (see sms.ts): enough to throttle a sender, not a global guarantee.
const SMS_LIMITER = new SlidingWindow();

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const cors = corsHeaders(req.headers.get("Origin"), env);
    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors, ...extra } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    // Every /api/dev/* route spends Gemini quota or writes local files: localhost only, 404 anywhere else.
    if (url.pathname.startsWith("/api/dev/") && !LOCAL_HOSTS.has(url.hostname)) return json({ error: "not found" }, 404);

    if (url.pathname === "/api/health") {
      return json({ ok: true, dataVersion: DS.version, fixture: DS.fixture, gemini: Boolean(env.GEMINI_API_KEY), geminiModels: parseModels(env.GEMINI_MODELS).length });
    }

    if (url.pathname.startsWith("/api/data/")) return json(DS);

    if (url.pathname === "/api/search" && req.method === "POST") {
      const parsed = SearchRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      const sc = scenarioById(parsed.data.scenarioId);
      if (!sc) return json({ error: "unknown scenarioId" }, 404);
      const r = await retrieval(env, parsed.data.query);
      return json(search(DS, INDEX, sc, parsed.data, r.semantic, r.fusion), 200, { "X-FlameAtlas-Retrieval": r.label });
    }

    if (url.pathname === "/api/ask" && req.method === "POST") {
      const parsed = AskRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      const sc = scenarioById(parsed.data.scenarioId);
      if (!sc) return json({ error: "unknown scenarioId" }, 404);
      const r = await retrieval(env, parsed.data.question);
      const answer = await ask(parsed.data.question, sc, {
        ds: DS, index: INDEX, apiKey: env.GEMINI_API_KEY, models: parseModels(env.GEMINI_MODELS), demo: DEMO, kv: env.ANSWERS,
        semantic: r.semantic, fusion: r.fusion,
        log: (m) => console.log(m),
      });
      console.log(`ask: retrieval ${r.label}${r.reason ? ` (${r.reason})` : ""}`);
      return json(AskResponse.parse(answer), 200, { "X-FlameAtlas-Retrieval": r.label });
    }

    // Dev only: `pnpm warm-cache` posts the demo questions here and writes the returned answers to
    // data/cache/demo-answers.json. It spends Gemini quota, so it only exists on localhost.
    if (url.pathname === "/api/sms" && req.method === "POST") {
      // Twilio posts form-encoded; the signature covers the exact public URL Twilio called.
      return handleSms(req, url.toString(), env, { ds: DS, index: INDEX, scenarios: SCENARIOS }, SMS_LIMITER);
    }

    if (url.pathname === "/api/dev/warm-cache" && req.method === "POST") {
      const parsed = WarmRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      const sc = scenarioById(parsed.data.scenarioId);
      if (!sc) return json({ error: "unknown scenarioId" }, 404);
      const file = { answers: { ...DEMO } };
      const results = await warmCache(parsed.data.questions, sc, {
        ds: DS, index: INDEX, apiKey: env.GEMINI_API_KEY, models: parseModels(env.GEMINI_MODELS),
      }, file);
      const answers = Object.fromEntries(Object.entries(file.answers).filter(([key]) => !(key in DEMO)));
      return json({ results, answers });
    }

    // Dev only: `pnpm eval:record` posts one question and system per request; maxCalls caps Gemini requests.
    if (url.pathname === "/api/dev/eval" && req.method === "POST") {
      const parsed = EvalRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      const sc = scenarioById(parsed.data.scenarioId);
      if (!sc) return json({ error: "unknown scenarioId" }, 404);
      return json(await runEval(parsed.data, sc, { ds: DS, index: INDEX, apiKey: env.GEMINI_API_KEY, models: parseModels(env.GEMINI_MODELS) }));
    }

    // Dev only: `pnpm summaries` posts one investigation per request; maxCalls caps Gemini requests.
    if (url.pathname === "/api/dev/summaries" && req.method === "POST") {
      const parsed = SummaryRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      const inv = DS.investigations.find((i) => i.psiId === parsed.data.psiId);
      if (!inv) return json({ error: "unknown psiId" }, 404);
      const budget = budgetedFetch(parsed.data.maxCalls);
      const result = await summarize(inv, { ds: DS, apiKey: env.GEMINI_API_KEY, models: parseModels(env.GEMINI_MODELS), fetchImpl: budget.fetchImpl });
      return json({ ...result, callsUsed: budget.used() });
    }

    // Dev only: `pnpm index:vectors` reads the corpus to embed. No AI calls.
    if (url.pathname === "/api/dev/corpus" && req.method === "GET") {
      return json({ dataVersion: DS.version, docs: buildCorpus(DS, SUMMARIES.success ? SUMMARIES.data.summaries : {}) });
    }

    // Dev only: embed up to 50 texts in ONE Workers AI call. maxCalls must be >= 1, so a script has to
    // state its budget; maxCalls 0 is a dry run that reports what would be called.
    if (url.pathname === "/api/dev/embed" && req.method === "POST") {
      const parsed = EmbedRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      if (parsed.data.maxCalls < 1) return json({ vectors: null, callsUsed: 0, dryRun: true });
      if (!env.AI) return json({ error: "no AI binding" }, 503);
      try {
        return json({ vectors: await embed(env.AI, parsed.data.texts), callsUsed: 1 });
      } catch (e) {
        return json({ error: String(e).slice(0, 300), callsUsed: 1 }, 502);
      }
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    // Not an API route: the web app. (wrangler.toml sends only /api/* here; this covers anything else.)
    if (env.ASSETS) return env.ASSETS.fetch(req);
    return json({ error: "not found" }, 404);
  },
};
