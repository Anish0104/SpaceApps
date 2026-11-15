/** Data layer for the mobile app: the released dataset and scenarios, parsed once against the engine
 *  schema. data/fixtures.json (FAKE) is never used here. */
import { Dataset, Scenario, type Investigation, type Run } from "@flameatlas/engine";
import datasetJson from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";

export const dataset = Dataset.parse(datasetJson);
export const scenarios = scenariosJson.map((s) => Scenario.parse(s));

export const runsFor = (psiId: string): Run[] => dataset.runs.filter((r) => r.psiId === psiId);
export const invById = (psiId: string): Investigation | undefined => dataset.investigations.find((i) => i.psiId === psiId);

export const coverage = {
  investigations: dataset.investigations.length,
  runs: dataset.runs.length,
  verified: dataset.runs.filter((r) => r.status === "verified").length,
  sources: dataset.sources.length,
  version: dataset.version,
};
