/**
 * Investigation summaries, precomputed by `pnpm summaries` (dev-only POST /api/dev/summaries) and
 * committed in data/cache/summaries.json; never generated per page view. Gemini proposes 2-3 cited
 * sentences from one investigation's records; a sentence is kept only if it cites records of that
 * investigation and passes validateSentences (every number on a cited record).
 */
import { z } from "zod";
import { AskSentence, SummaryEntry, type Dataset, type Investigation } from "@flameatlas/engine";
import { callModels, recordsFor } from "./gemini";
import { modelsOf, type AskDeps } from "./ask";
import { validateSentences } from "./validator";

export const SUMMARY_PROMPT = `You summarise one NASA combustion investigation for fire-safety researchers.

Rules (all mandatory):
1. Use ONLY the RECORDS. Never use outside knowledge for facts or numbers.
2. Write 2 or 3 sentences. Each lists in "recordIds" the record ids it relies on, taken from RECORDS only.
3. Any number you write must appear, with the same unit, in a record that sentence cites. Do not compute new numbers.
4. Never say a material, design or condition is safe or unsafe.
5. Do not claim results for gravity levels, atmospheres or materials the RECORDS do not document. Earth (1 g) and orbit (~0 g) results do not bound lunar or Martian behaviour.
6. Gas flowing from a burner is not a cabin atmosphere; liquid droplets are not solid fabric.
Plain, precise language.`;

export const SUMMARY_SCHEMA = {
  type: "OBJECT",
  properties: {
    sentences: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { text: { type: "STRING" }, recordIds: { type: "ARRAY", items: { type: "STRING" } } },
        required: ["text", "recordIds"],
      },
    },
  },
  required: ["sentences"],
} as const;

export const SummaryRequest = z.object({ psiId: z.string(), maxCalls: z.number().int().min(0).max(5) });

export type SummaryOutcome =
  | { outcome: "saved"; entry: SummaryEntry }
  | { outcome: "skipped"; reason: string };

const Proposed = z.object({ sentences: z.array(AskSentence) });

/**
 * Keeps only sentences that cite at least one record, cite nothing outside this investigation and
 * its runs, and pass the citation validator. Returns at most 3, and why each other one was dropped.
 */
export function checkSummary(ds: Dataset, inv: Investigation, sentences: z.infer<typeof AskSentence>[]) {
  const allowed = new Set(recordsFor(ds, inv).ids);
  const reasons: string[] = [];
  const own = sentences.filter((s) => {
    if (!s.recordIds.length) { reasons.push("no citation"); return false; }
    const outside = s.recordIds.find((id) => !allowed.has(id));
    if (outside) { reasons.push(`cites ${outside}, not a record of ${inv.psiId}`); return false; }
    return true;
  });
  const { kept, dropped } = validateSentences(ds, own); // no scenario: SCENARIO ids are refused
  reasons.push(...dropped.map((d) => d.reason));
  return { kept: kept.slice(0, 3), reasons: [...reasons, ...kept.slice(3).map(() => "more than 3 sentences")] };
}

export async function summarize(inv: Investigation, deps: Pick<AskDeps, "ds" | "apiKey" | "models" | "fetchImpl">): Promise<SummaryOutcome> {
  if (!deps.apiKey) return { outcome: "skipped", reason: "no GEMINI_API_KEY" };
  const failures: string[] = [];
  const out = await callModels(SUMMARY_PROMPT, `INVESTIGATION: ${inv.psiId}\n\nRECORDS:\n${recordsFor(deps.ds, inv).text}`, {
    apiKey: deps.apiKey, models: modelsOf(deps), fetchImpl: deps.fetchImpl, schema: SUMMARY_SCHEMA,
    onFail: (model, e) => failures.push(`${model}: ${String(e).slice(0, 120)}`),
  });
  if (!out.ok) return { outcome: "skipped", reason: `no model answered (${failures.join("; ")})` };
  const parsed = Proposed.safeParse(out.raw);
  if (!parsed.success) return { outcome: "skipped", reason: "answer did not have the summary shape" };
  const { kept, reasons } = checkSummary(deps.ds, inv, parsed.data.sentences);
  if (!kept.length) return { outcome: "skipped", reason: `nothing survived validation (${reasons.join("; ") || "no sentences"})` };
  return {
    outcome: "saved",
    entry: SummaryEntry.parse({
      psiId: inv.psiId, dataVersion: deps.ds.version, model: out.model, sentences: kept,
      dropped: reasons.length, generatedAt: new Date().toISOString().slice(0, 10),
    }),
  };
}
