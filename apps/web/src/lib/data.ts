/**
 * Data access. Starts on fixtures (FAKE values). When Navneet publishes dataset-vX.Y.json,
 * change the import below (or fetch /api/data/:version) — no other code changes needed.
 */
import { Dataset, Scenario } from "@flameatlas/engine";
import fixtures from "../../../../data/fixtures.json";
import scenariosJson from "../../../../data/scenarios.json";

export const dataset = Dataset.parse(fixtures);
export const scenarios = scenariosJson.map((s) => Scenario.parse(s));

export const invById = (psiId: string) => dataset.investigations.find((i) => i.psiId === psiId);
export const runsFor = (psiId: string) => dataset.runs.filter((r) => r.psiId === psiId);
export const sourceById = (id?: string) => dataset.sources.find((s) => s.id === id);

export const coverage = {
  investigations: dataset.investigations.length,
  runsImported: dataset.runs.length,
  runsVerified: dataset.runs.filter((r) => r.status === "verified").length,
  relationships: dataset.edges.length,
  documents: dataset.sources.length,
};
