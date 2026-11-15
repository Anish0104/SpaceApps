/** Data layer: the released dataset and scenarios, parsed once against the engine schema.
 *  Every value shown in the app comes from here (the backend data) with its real evidence type and
 *  NASA source. data/fixtures.json (FAKE) is never imported. No value is invented in the UI. */
import { Dataset, Scenario, type Investigation, type Run, type Source, type NumValue, type StrValue } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";

export const dataset = Dataset.parse(datasetJson);
export const scenarios = scenariosJson.map((s) => Scenario.parse(s));

export const runsFor = (psiId: string): Run[] => dataset.runs.filter((r) => r.psiId === psiId);
export const invById = (psiId: string): Investigation | undefined => dataset.investigations.find((i) => i.psiId === psiId);
export const sourceById = (id?: string): Source | undefined => dataset.sources.find((s) => s.id === id);

export const coverage = {
  investigations: dataset.investigations.length,
  runs: dataset.runs.length,
  verified: dataset.runs.filter((r) => r.status === "verified").length,
  sources: dataset.sources.length,
  version: dataset.version,
};

/** A displayable number with its unit, evidence type and source — straight from the record. */
export interface Field { value: number | string | null; unit?: string; type: string; src?: Source; missing?: string; formula?: string }
export function field(v: NumValue | StrValue): Field {
  return { value: v.value, unit: v.unit, type: v.type, src: sourceById(v.sourceId), missing: v.missingReason, formula: v.formula };
}

/** Source reference string a NASA document is cited by (NTRS id / DOI). */
export function sourceRef(s?: Source): string {
  if (!s) return "";
  if (s.ntrsId) return `NTRS ${s.ntrsId}${s.page ? ` · ${s.page}` : ""}`;
  if (s.doi) return `doi:${s.doi}`;
  return s.title;
}
