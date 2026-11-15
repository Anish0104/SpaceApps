import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AskResponse } from "@flameatlas/engine";
import Ask from "../pages/Ask";
import { ScenarioProvider } from "../lib/scenario";
import { api } from "../lib/api";
import questionsJson from "../../../../data/eval/questions.json";
import demoAnswersJson from "../../../../data/cache/demo-answers.json";
import datasetJson from "../../../../data/dataset.json";

/** Same as cacheKey() in apps/worker/src/gemini.ts: what the worker looks up in the demo cache. */
async function cacheKey(...parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.map((p) => p.trim().replace(/\s+/g, " ").toLowerCase()).join("␟"));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
  return "ask:" + [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ANSWER: AskResponse = {
  status: "answered", verdict: "yellow", sentences: [{ text: "x", recordIds: ["PSI-98"] }], differs: [], limit: "l",
  next: { kind: "missing_experiment", target: "t" }, scope: "s", missingFields: [], source: "cache", dataVersion: datasetJson.version,
};

const CHIPS = [
  { label: "Nearest tested condition?", id: "q2", scenarioId: "moon-challenge" },
  { label: "Is it just scale?", id: "q3", scenarioId: "moon-fm2" },
  { label: "Biggest lunar gap?", id: "q4", scenarioId: "moon-fm2" },
];

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Ask page demo chips", () => {
  for (const chip of CHIPS) {
    it(`"${chip.label}" sends the exact ${chip.id} text under ${chip.scenarioId}, which is in the demo cache`, async () => {
      const askSpy = vi.spyOn(api, "ask").mockResolvedValue(ANSWER);
      render(<MemoryRouter><ScenarioProvider><Ask /></ScenarioProvider></MemoryRouter>);

      fireEvent.click(within(screen.getByRole("group", { name: "Demo questions" })).getByRole("button", { name: (n) => n.startsWith(chip.label) }));
      await waitFor(() => expect(askSpy).toHaveBeenCalledTimes(1));

      const [question, scenarioId] = askSpy.mock.calls[0]!;
      expect(question).toBe(questionsJson.questions.find((q) => q.id === chip.id)!.question);
      expect(scenarioId).toBe(chip.scenarioId);
      const cached = (demoAnswersJson as { answers: Record<string, { question: string }> }).answers;
      expect(cached[await cacheKey(question, scenarioId, datasetJson.version)]?.question).toBe(question);
    });
  }
});
