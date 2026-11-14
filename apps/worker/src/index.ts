/**
 * FlameAtlas API (Cloudflare Worker)
 *   GET  /api/health
 *   GET  /api/data/:version
 *   POST /api/search   Contract 2
 *   POST /api/ask      Contract 3 (six-beat answer via Gemini, validated; demo cache; template fallback)
 *   POST /api/dev/warm-cache   localhost only, used by `pnpm warm-cache` (spends Gemini quota)
 *   POST /api/dev/eval         localhost only, used by `pnpm eval:record` (spends Gemini quota)
 *   POST /api/dev/summaries    localhost only, used by `pnpm summaries` (spends Gemini quota)
 */
import { AskRequest, AskResponse, Dataset, Scenario, SearchRequest } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset-v1.0.json";
import scenariosJson from "../../../data/scenarios.json";
import demoAnswersJson from "../../../data/cache/demo-answers.json";
import { buildIndex, search } from "./search";
import { ask } from "./ask";
import { parseModels } from "./gemini";
import { WarmRequest, loadDemoAnswers, warmCache } from "./demoCache";
import { EvalRequest, budgetedFetch, runEval } from "./evalRun";
import { SummaryRequest, summarize } from "./summaries";

export { templateAnswer } from "./ask";

export interface Env {
  DATA_VERSION: string;
  /** The deployed web app's origin (the pages.dev URL), allowed by CORS next to the local Vite server. */
  ALLOWED_ORIGIN?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODELS?: string; // comma-separated, tried in order
  AI?: unknown; // Workers AI binding (bge-small-en-v1.5), used for semantic search
  ANSWERS?: KVNamespace;
}

// The released dataset, bundled with the worker. data/fixtures.json (FAKE values) is for unit tests only.
// TODO(data release): load dataset-vX.Y.json from R2 instead of bundling it.
const DS = Dataset.parse(datasetJson);
const SCENARIOS = scenariosJson.map((s) => Scenario.parse(s));
const INDEX = buildIndex(DS);
// Committed demo answers (filled by `pnpm warm-cache`); served offline with source "cache".
const DEMO = loadDemoAnswers(demoAnswersJson, (m) => console.warn(m));

/** The local Vite dev server; always allowed so `pnpm dev:web` works against a local or deployed worker. */
export const DEV_ORIGIN = "http://localhost:5173";

/**
 * CORS headers for this request. Only the deployed web app (ALLOWED_ORIGIN) and the local Vite
 * server get an Access-Control-Allow-Origin header; any other browser origin is refused by the
 * browser. Requests without an Origin (curl, server to server) are unaffected.
 */
export function corsHeaders(origin: string | null, env: Pick<Env, "ALLOWED_ORIGIN">): Record<string, string> {
  const allowed = [DEV_ORIGIN, ...(env.ALLOWED_ORIGIN ?? "").split(",").map((o) => o.trim().replace(/\/+$/, ""))].filter(Boolean);
  const base = { "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
  return origin && allowed.includes(origin) ? { ...base, "Access-Control-Allow-Origin": origin } : base;
}

const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const cors = corsHeaders(req.headers.get("Origin"), env);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });
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
      // TODO(semantic): embed query with env.AI (@cf/baai/bge-small-en-v1.5), cosine vs stored vectors, pass as 5th arg
      return json(search(DS, INDEX, sc, parsed.data));
    }

    if (url.pathname === "/api/ask" && req.method === "POST") {
      const parsed = AskRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      const sc = scenarioById(parsed.data.scenarioId);
      if (!sc) return json({ error: "unknown scenarioId" }, 404);
      const answer = await ask(parsed.data.question, sc, {
        ds: DS, index: INDEX, apiKey: env.GEMINI_API_KEY, models: parseModels(env.GEMINI_MODELS), demo: DEMO, kv: env.ANSWERS,
        log: (m) => console.log(m),
      });
      return json(AskResponse.parse(answer));
    }

    // Dev only: `pnpm warm-cache` posts the demo questions here and writes the returned answers to
    // data/cache/demo-answers.json. It spends Gemini quota, so it only exists on localhost.
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

    return json({ error: "not found" }, 404);
  },
};
