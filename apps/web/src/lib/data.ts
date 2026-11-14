/**
 * Data access. Loads the released dataset (data/dataset-v1.0.json). data/fixtures.json holds FAKE
 * values and is for unit tests only. For a new release, change the import below (or fetch
 * /api/data/:version); no other code changes needed.
 */
import { Dataset, Scenario, SummaryFile, summaryKey, type Investigation, type Source, type SummaryEntry } from "@flameatlas/engine";
import datasetJson from "../../../../data/dataset-v1.0.json";
import scenariosJson from "../../../../data/scenarios.json";
import summariesJson from "../../../../data/cache/summaries.json";

export const dataset = Dataset.parse(datasetJson);
export const scenarios = scenariosJson.map((s) => Scenario.parse(s));

export const invById = (psiId: string) => dataset.investigations.find((i) => i.psiId === psiId);
export const runsFor = (psiId: string) => dataset.runs.filter((r) => r.psiId === psiId);
export const sourceById = (id?: string) => dataset.sources.find((s) => s.id === id);

/** True when the record is a NASA PSI investigation. Records taken from a NASA report (NTRS) are not. */
export const isPsiRecord = (inv: Investigation) => /^PSI-\d+$/.test(inv.psiId);

/** What kind of document a value's receipt is, so a NASA report is never presented as a PSI record. */
export function sourceKind(src: Source): { label: string; ref?: string } {
  if (src.ntrsId) return { label: "NASA report", ref: `NTRS ${src.ntrsId}` };
  if (src.psiId) return { label: "NASA PSI", ref: src.psiId };
  if (src.doi) return { label: "Journal article", ref: `doi:${src.doi}` };
  return { label: "Source" };
}

/**
 * Precomputed, validated summaries (`pnpm summaries`). Only an entry for the loaded data version is
 * shown; a malformed file shows none rather than breaking the page.
 */
const summaryFile = SummaryFile.safeParse(summariesJson);
export const summaryFor = (psiId: string): SummaryEntry | undefined =>
  summaryFile.success ? summaryFile.data.summaries[summaryKey(psiId, dataset.version)] : undefined;

export const coverage = {
  investigations: dataset.investigations.length,
  runsImported: dataset.runs.length,
  runsVerified: dataset.runs.filter((r) => r.status === "verified").length,
  relationships: dataset.edges.length,
  documents: dataset.sources.length,
};
