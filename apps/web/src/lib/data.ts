/**
 * Data access. Loads the released dataset (data/dataset.json, version 1.2.0). data/fixtures.json holds FAKE
 * values and is for unit tests only. For a new release, change the import below (or fetch
 * /api/data/:version); no other code changes needed.
 */
import { Dataset, Scenario, SummaryFile, summaryKey, type Investigation, type Source, type SummaryEntry } from "@flameatlas/engine";
import datasetJson from "../../../../data/dataset.json";
import scenariosJson from "../../../../data/scenarios.json";
import summariesJson from "../../../../data/cache/summaries.json";
import coverageJson from "../../../../data/coverage.json";
import earthJson from "../../../../data/earth_applications.json";

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

/**
 * Release counts written by ingest/release.py (data/coverage.json). Shown only when they describe the
 * loaded dataset, so a stale file never puts wrong numbers on screen.
 */
export const releaseCoverage =
  coverageJson.dataVersion === dataset.version
    ? { investigations: coverageJson.investigationsIndexed, runsImported: coverageJson.runsImported, runsVerified: coverageJson.runsVerified }
    : undefined;

/** Space-to-Earth items (data/earth_applications.json). Each one carries its NASA source link. */
export type EarthApplication = {
  id: string;
  title: string;
  space: string;
  earth: string;
  relatedPsiIds: string[];
  source: string;
  url: string;
};
/** An item without a title, a source name or an https source link is left out, never shown unsourced. */
export const earthApplications: EarthApplication[] = earthJson.applications.filter(
  (a) => a.title && a.source && /^https:\/\//.test(a.url),
);
