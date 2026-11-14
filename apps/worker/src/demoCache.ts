/**
 * Demo cache: data/cache/demo-answers.json holds validated LLM answers for the demo questions so
 * they work offline and without spending Gemini quota. It is committed; `pnpm warm-cache` fills it.
 * Entries are keyed by cacheKey(question, scenario id, data version) and re-validated by ask()
 * before they are served (always with source "cache").
 */
import { z } from "zod";
import { AskResponse, type Scenario } from "@flameatlas/engine";
import { ask, type AskDeps } from "./ask";
import { cacheKey } from "./gemini";

export const DemoEntry = z.object({
  question: z.string(),
  scenarioId: z.string(),
  dataVersion: z.string(),
  model: z.string().optional(), // which Gemini model produced it
  answer: AskResponse,
});
export const DemoCacheFile = z.object({
  _note: z.string().optional(),
  answers: z.record(DemoEntry).default({}),
});
export type DemoCacheFile = z.infer<typeof DemoCacheFile>;
export type DemoAnswers = DemoCacheFile["answers"];

/** Parses the JSON file's content. A malformed file yields no demo answers rather than a broken worker. */
export function loadDemoAnswers(json: unknown, warn: (msg: string) => void = () => {}): DemoAnswers {
  const parsed = DemoCacheFile.safeParse(json);
  if (!parsed.success) { warn(`demo cache ignored: ${parsed.error.message.slice(0, 200)}`); return {}; }
  return parsed.data.answers;
}

/** Body of the dev-only POST /api/dev/warm-cache route used by `pnpm warm-cache`. */
export const WarmRequest = z.object({
  scenarioId: z.string(),
  questions: z.array(z.object({ id: z.string(), question: z.string().min(3) })).min(1).max(5),
});

export interface WarmResult {
  id: string;
  question: string;
  outcome: "saved" | "already_cached" | "skipped";
  model?: string;
  /** For "skipped": the pipeline's own log lines saying why it fell back to the template. */
  reason?: string;
}

/**
 * Asks each question ONCE through the real ask() pipeline and adds only validated LLM answers to
 * `file.answers`. A question already in the file is not asked again; a template fallback is
 * skipped with the reason. Spends Gemini quota: at most one request per model per question.
 */
export async function warmCache(
  questions: { id: string; question: string }[],
  sc: Scenario,
  deps: AskDeps,
  file: Pick<DemoCacheFile, "answers">,
): Promise<WarmResult[]> {
  const results: WarmResult[] = [];
  for (const { id, question } of questions) {
    const key = await cacheKey(question, sc.id, deps.ds.version);
    if (file.answers[key]) { results.push({ id, question, outcome: "already_cached" }); continue; }
    const logs: string[] = [];
    const a = await ask(question, sc, { ...deps, demo: undefined, kv: undefined, log: (m) => logs.push(m) });
    if (a.source === "template") {
      results.push({ id, question, outcome: "skipped", reason: logs.map((l) => l.replace(/^ask: /, "")).join("; ") || "template fallback" });
      continue;
    }
    // "llm", or "cache" when this process already holds a validated LLM answer in memory
    const model = logs.map((l) => /^ask: answered by (\S+)/.exec(l)?.[1]).find(Boolean);
    file.answers[key] = {
      question, scenarioId: sc.id, dataVersion: deps.ds.version, ...(model ? { model } : {}), answer: { ...a, source: "llm" },
    };
    results.push({ id, question, outcome: "saved", model });
  }
  return results;
}
