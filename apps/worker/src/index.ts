/**
 * FlameAtlas API (Cloudflare Worker)
 *   GET  /api/health
 *   GET  /api/data/:version
 *   POST /api/search   Contract 2
 *   POST /api/ask      Contract 3 (six-beat answer)
 * The LLM call is a TODO; until then /api/ask returns the rules-engine template answer.
 */
import {
  AskRequest, AskResponse, Dataset, Scenario, SearchRequest, type RankedResult,
} from "@flameatlas/engine";
import fixtures from "../../../data/fixtures.json";
import scenariosJson from "../../../data/scenarios.json";
import { buildIndex, search } from "./search";
import { validateSentences } from "./validator";

export interface Env {
  DATA_VERSION: string;
  AI?: unknown; // Workers AI binding (bge-small-en-v1.5)
  ANSWERS?: KVNamespace;
  LLM_API_KEY?: string;
}

// TODO(data release): load dataset-vX.Y.json from R2 instead of fixtures.
const DS = Dataset.parse(fixtures);
const SCENARIOS = scenariosJson.map((s) => Scenario.parse(s));
const INDEX = buildIndex(DS);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

function scenarioOr404(id: string) {
  return SCENARIOS.find((s) => s.id === id);
}

/** Rules-engine template answer: used when the LLM is unavailable or fails validation. */
export function templateAnswer(question: string, sc: Scenario, ranked: RankedResult[], dataVersion: string): AskResponse {
  const top = ranked.filter((r) => r.score !== null).slice(0, 3);
  if (!top.length) {
    return {
      status: "cannot_confirm", verdict: "red", sentences: [],
      differs: [], limit: "No investigation in our curated data documents the conditions needed for this question.",
      next: { kind: "missing_experiment" }, scope: "In our curated dataset.",
      missingFields: ranked[0]?.notDocumented ?? [], source: "template", dataVersion,
    };
  }
  const sentences = top.map((r) => {
    const inv = DS.investigations.find((i) => i.psiId === r.psiId)!;
    return { text: `${inv.acronym} (${inv.psiId}) is relevant: ${r.reasons.join(", ") || "related by topic"}.`, recordIds: [inv.psiId] };
  });
  const gravityGap = top.every((r) => r.reasons.includes("GRAVITY_DIFFERS"));
  return {
    status: "answered",
    verdict: gravityGap ? "yellow" : "green",
    sentences,
    differs: [...new Set(top.flatMap((r) => r.notDocumented.map((f) => `${f} not documented`)))],
    limit: gravityGap
      ? `No curated run matches ${sc.name} gravity; results are analogs, not direct evidence.`
      : "Among tracked conditions only.",
    next: { kind: gravityGap ? "missing_experiment" : "evidence_now" },
    scope: "In our curated dataset; illustrative, not an approved NASA plan.",
    missingFields: [], source: "template", dataVersion,
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (url.pathname === "/api/health") return json({ ok: true, dataVersion: DS.version, fixture: DS.fixture });

    if (url.pathname.startsWith("/api/data/")) return json(DS);

    if (url.pathname === "/api/search" && req.method === "POST") {
      const parsed = SearchRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      const sc = scenarioOr404(parsed.data.scenarioId);
      if (!sc) return json({ error: "unknown scenarioId" }, 404);
      // TODO(semantic): embed query with env.AI (@cf/baai/bge-small-en-v1.5), cosine vs stored vectors, pass as 5th arg
      return json(search(DS, INDEX, sc, parsed.data));
    }

    if (url.pathname === "/api/ask" && req.method === "POST") {
      const parsed = AskRequest.safeParse(await req.json());
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
      const sc = scenarioOr404(parsed.data.scenarioId);
      if (!sc) return json({ error: "unknown scenarioId" }, 404);
      const ranked = search(DS, INDEX, sc, SearchRequest.parse({ query: parsed.data.question, scenarioId: sc.id }));

      // TODO(LLM): 1) check env.ANSWERS cache  2) build prompt from top records  3) call LLM for six-beat JSON
      //            4) AskResponse.safeParse  5) validateSentences  6) fall back to template if empty  7) cache
      const answer = templateAnswer(parsed.data.question, sc, ranked, DS.version);
      const { kept } = validateSentences(DS, answer.sentences);
      return json(AskResponse.parse({ ...answer, sentences: kept }));
    }

    return json({ error: "not found" }, 404);
  },
};
