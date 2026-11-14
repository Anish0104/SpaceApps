/**
 * MOCK answers for UI development only (`pnpm dev:web:mock`, VITE_MOCK_ASK=1).
 * api.ask() returns these instead of calling the worker, so no Gemini quota is spent.
 * They are not validated answers and never NASA data: do not demo, cite or screenshot them as results.
 */
import { AskResponse } from "@flameatlas/engine";
import captured from "../../../worker/test/captured/gemini-3.5-flash-moon-fm2.json";
import { dataset } from "./data";

const MOCK_DELAY_MS = 1500;

/**
 * MOCK "answered" example: a real gemini-3.5-flash response captured over the FAKE fixture data
 * (scenario moon-fm2, "Would fabric burn differently in a lunar habitat?"). The capture itself has
 * status "cannot_confirm"; it is overridden to "answered" here so this state can be previewed.
 */
const MOCK_ANSWERED = AskResponse.parse({ ...captured, status: "answered", source: "cache", dataVersion: dataset.version });

/** MOCK "cannot_confirm" example: hand-made, returned when the question contains "PMMA". Not from any record. */
const MOCK_CANNOT_CONFIRM = AskResponse.parse({
  status: "cannot_confirm",
  verdict: "red",
  sentences: [
    { text: "MOCK sentence: shows an investigation link, an unknown id and a scenario tag.", recordIds: ["PSI-26", "MOCK-UNKNOWN-ID", "SCENARIO:moon-fm2"] },
  ],
  differs: ["MOCK: material", "MOCK: gravity"],
  limit: "MOCK answer for UI development; it is not derived from any record.",
  next: { kind: "missing_experiment", target: "MOCK target" },
  scope: "In our curated dataset; illustrative, not an approved NASA plan.",
  missingFields: ["o2MolPct at 25-35%", "gravityG 0.165"],
  source: "template",
  dataVersion: dataset.version,
});

export async function mockAsk(question: string): Promise<AskResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  return /pmma/i.test(question) ? MOCK_CANNOT_CONFIRM : MOCK_ANSWERED;
}
