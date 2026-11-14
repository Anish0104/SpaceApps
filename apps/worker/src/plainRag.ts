/**
 * Plain-RAG baseline for the benchmark (eval/README.md). It shares FlameAtlas's retrieval (same
 * top-k records, same record text) and model list/fallback, and asks for the same JSON shape, but
 * has NO rule prompt, NO scenario block, NO citation validator and NO template fallback.
 * Its output is recorded raw, exactly as Gemini returned it. Never served to users.
 */
import type { Scenario } from "@flameatlas/engine";
import { callModels } from "./gemini";
import { modelsOf, retrieve, type AskDeps } from "./ask";

export const PLAIN_PROMPT = "Answer the question using the records below.";

export const plainUserPrompt = (question: string, records: string) => `QUESTION: ${question}\n\nRECORDS:\n${records || "(none)"}`;

export interface PlainRagResult {
  ok: boolean;
  /** Gemini's JSON exactly as returned (null when no model answered). Not Zod-checked, not validated. */
  output: unknown;
  model?: string;
  error?: string;
  /** What was sent: the record text and the ids in it (identical to what ask() sends). */
  records: string;
  recordIds: string[];
  attempts: { model: string; error: string }[];
}

export async function plainRag(
  question: string, sc: Scenario, deps: Pick<AskDeps, "ds" | "index" | "apiKey" | "models" | "fetchImpl">,
): Promise<PlainRagResult> {
  // The scenario only steers retrieval (so both systems see the same records); it is not in the prompt.
  const { records, recordIds } = retrieve(deps.ds, deps.index, sc, question);
  const base = { records, recordIds, attempts: [] as PlainRagResult["attempts"] };
  if (!deps.apiKey) return { ...base, ok: false, output: null, error: "no GEMINI_API_KEY" };
  const out = await callModels(PLAIN_PROMPT, plainUserPrompt(question, records), {
    apiKey: deps.apiKey, models: modelsOf(deps), fetchImpl: deps.fetchImpl,
    onFail: (model, e) => base.attempts.push({ model, error: String(e).slice(0, 300) }),
  });
  return out.ok
    ? { ...base, ok: true, output: out.raw, model: out.model }
    : { ...base, ok: false, output: null, error: out.reason === "exhausted" ? "all models failed" : "request failed" };
}
