/**
 * Body of the dev-only POST /api/dev/eval route used by `pnpm eval:record`. Runs one question through
 * the requested systems and returns the raw outputs plus the records sent. The worker cannot write
 * files; the script saves what comes back to eval/runs/<data-version>/<system>/<qid>.json.
 *
 * SPENDS GEMINI QUOTA. `maxCalls` is a hard cap on Gemini HTTP requests for this POST: the fetch
 * handed to both systems refuses any request past it, and that refusal stops the model fallback.
 */
import { z } from "zod";
import type { AskResponse, Scenario } from "@flameatlas/engine";
import { ask, modelsOf, retrieve, type AskDeps } from "./ask";
import { SYSTEM_PROMPT } from "./gemini";
import { PLAIN_PROMPT, plainRag } from "./plainRag";

export const EVAL_SYSTEMS = ["flameatlas", "plain_rag"] as const;
export type EvalSystem = (typeof EVAL_SYSTEMS)[number];

export const EvalRequest = z.object({
  qid: z.string().min(1),
  question: z.string().min(3),
  scenarioId: z.string(),
  systems: z.array(z.enum(EVAL_SYSTEMS)).min(1),
  maxCalls: z.number().int().min(0).max(30),
});
export type EvalRequest = z.infer<typeof EvalRequest>;

export interface EvalRecord {
  qid: string;
  system: EvalSystem;
  question: string;
  scenarioId: string;
  dataVersion: string;
  /** True when a Gemini model answered; only recorded outputs are saved by the script. */
  recorded: boolean;
  model?: string;
  callsUsed: number;
  systemPrompt: string;
  /** The records sent to Gemini (same for both systems) and their ids. */
  records: string;
  recordIds: string[];
  /** flameatlas: the final AskResponse (validated, or the template). plain_rag: Gemini's raw JSON. */
  output: AskResponse | unknown;
  /** flameatlas: the pipeline log (what the validator dropped and why). plain_rag: failed attempts. */
  log: string[];
  error?: string;
}

/** Wraps fetch so that at most `max` requests go out; the next one throws (a non-retryable error). */
export function budgetedFetch(max: number, base: typeof fetch = fetch) {
  let used = 0;
  const fetchImpl = ((...args: Parameters<typeof fetch>) => {
    if (used >= max) return Promise.reject(new Error(`eval budget reached (${max} Gemini requests)`));
    used++;
    return base(...args);
  }) as typeof fetch;
  return { fetchImpl, used: () => used };
}

export async function runEval(req: EvalRequest, sc: Scenario, deps: AskDeps): Promise<{ results: EvalRecord[]; callsUsed: number }> {
  const budget = budgetedFetch(req.maxCalls, deps.fetchImpl);
  const { records, recordIds } = retrieve(deps.ds, deps.index, sc, req.question);
  const common = { qid: req.qid, question: req.question, scenarioId: sc.id, dataVersion: deps.ds.version, records, recordIds };
  const results: EvalRecord[] = [];

  for (const system of req.systems) {
    const before = budget.used();
    if (system === "flameatlas") {
      const log: string[] = [];
      // ask() exactly as /api/ask runs it, minus every cache, so each run is a fresh Gemini answer.
      const output = await ask(req.question, sc, { ...deps, models: modelsOf(deps), demo: undefined, kv: undefined, skipCache: true, fetchImpl: budget.fetchImpl, log: (m) => log.push(m) });
      const model = log.map((l) => /^ask: answered by (\S+)/.exec(l)?.[1]).find(Boolean);
      results.push({ ...common, system, recorded: Boolean(model), model, callsUsed: budget.used() - before, systemPrompt: SYSTEM_PROMPT, output, log });
    } else {
      const r = await plainRag(req.question, sc, { ...deps, fetchImpl: budget.fetchImpl });
      results.push({
        ...common, system, recorded: r.ok, model: r.model, callsUsed: budget.used() - before, systemPrompt: PLAIN_PROMPT,
        output: r.output, log: r.attempts.map((a) => `${a.model} failed (${a.error})`), ...(r.error ? { error: r.error } : {}),
      });
    }
  }
  return { results, callsUsed: budget.used() };
}
