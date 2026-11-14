/**
 * MOCK investigation summary for UI development only (`pnpm dev:web:mock`). Shown only when the
 * committed summaries file has no entry, so the summary section can be previewed before
 * `pnpm summaries` has run. It is not derived from any record and must never be demoed as a result.
 */
import type { Investigation, SummaryEntry } from "@flameatlas/engine";
import { dataset } from "./data";

export function mockSummary(inv: Investigation): SummaryEntry {
  const runId = dataset.runs.find((r) => r.psiId === inv.psiId)?.id;
  return {
    psiId: inv.psiId, dataVersion: dataset.version, model: "MOCK", dropped: 0,
    sentences: [
      { text: "MOCK summary sentence: shows how a cited summary reads, with a receipt for the investigation.", recordIds: [inv.psiId] },
      ...(runId ? [{ text: "MOCK summary sentence: a receipt for one of its runs links back to this page.", recordIds: [runId] }] : []),
    ],
  };
}
