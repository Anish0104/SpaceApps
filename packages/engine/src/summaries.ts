/**
 * Precomputed investigation summaries (data/cache/summaries.json), written by `pnpm summaries` and
 * read by the web app. Each sentence passed the citation validator against the records it cites, for
 * the data version in its key; an entry for another data version is never shown.
 */
import { z } from "zod";
import { AskSentence } from "./contracts";

export const SummaryEntry = z.object({
  psiId: z.string(),
  dataVersion: z.string(),
  model: z.string().optional(),
  sentences: z.array(AskSentence.extend({ recordIds: z.array(z.string()).min(1) })).min(1).max(3),
  /** Sentences the validator removed before saving (0 when the whole summary passed). */
  dropped: z.number().int().min(0).default(0),
  generatedAt: z.string().optional(),
});
export type SummaryEntry = z.infer<typeof SummaryEntry>;

export const SummaryFile = z.object({
  _note: z.string().optional(),
  summaries: z.record(SummaryEntry).default({}),
});
export type SummaryFile = z.infer<typeof SummaryFile>;

export const summaryKey = (psiId: string, dataVersion: string) => `${psiId}@${dataVersion}`;
