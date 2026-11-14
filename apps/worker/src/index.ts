/**
 * FlameAtlas API (Cloudflare Worker)
 *   GET  /api/health
 *   GET  /api/data/:version
 *   POST /api/search   Contract 2
 *   POST /api/ask      Contract 3 (six-beat answer via Gemini, validated; demo cache; template fallback)
 *   POST /api/dev/warm-cache   localhost only, used by `pnpm warm-cache` (spends Gemini quota)
 */
import { AskRequest, AskResponse, Dataset, Scenario, SearchRequest } from "@flameatlas/engine";
import fixtures from "../../../data/fixtures.json";
import scenariosJson from "../../../data/scenarios.json";
import demoAnswersJson from "../../../data/cache/demo-answers.json";
import { buildIndex, search } from "./search";
import { ask } from "./ask";
import { parseModels } from "./gemini";
import { WarmRequest, loadDemoAnswers, warmCache } from "./demoCache";

export { templateAnswer } from "./ask";

export interface Env {
  DATA_VERSION: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODELS?: string; // comma-separated, tried in order
  AI?: unknown; // Workers AI binding (bge-small-en-v1.5), used for semantic search
  ANSWERS?: KVNamespace;
}

// TODO(data release): load dataset-vX.Y.json from R2 instead of fixtures.
const DS = Dataset.parse(fixtures);
const SCENARIOS = scenariosJson.map((s) => Scenario.parse(s));
const INDEX = buildIndex(DS);
// Committed demo answers (filled by `pnpm warm-cache`); served offline with source "cache".
const DEMO = loadDemoAnswers(demoAnswersJson, (m) => console.warn(m));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (url.pathname === "/api/health") {
      return json({ ok: true, dataVersion: DS.version, fixture: DS.fixture, gemini: Boolean(env.GEMINI_API_KEY) });
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
    if (url.pathname === "/api/dev/warm-cache" && req.method === "POST" && LOCAL_HOSTS.has(url.hostname)) {
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

    return json({ error: "not found" }, 404);
  },
};
