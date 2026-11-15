import { describe, expect, it } from "vitest";
import questionsJson from "../../../data/eval/questions.json";
import demoAnswersJson from "../../../data/cache/demo-answers.json";
import datasetJson from "../../../data/dataset.json";
import { CHIPS } from "./demoChips";

/** Same as cacheKey() in apps/worker/src/gemini.ts: what the worker looks up in the demo cache. */
async function cacheKey(...parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.map((p) => p.trim().replace(/\s+/g, " ").toLowerCase()).join("␟"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return "ask:" + [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("mobile Ask chips", () => {
  const demoChips = CHIPS.filter((c) => c.demo);

  it("map to the demo questions q2, q4 and q3 under their scenarios", () => {
    expect(demoChips.map((c) => [c.demo!.id, c.demo!.scenarioId])).toEqual([["q2", "moon-challenge"], ["q4", "moon-fm2"], ["q3", "moon-fm2"]]);
    expect(CHIPS.every((c) => c.demo)).toBe(true);
  });

  it("send text identical to the demo question, which is in the committed demo cache", async () => {
    const cached = (demoAnswersJson as { answers: Record<string, { question: string }> }).answers;
    for (const chip of demoChips) {
      const { id, question, scenarioId } = chip.demo!;
      expect(question).toBe(questionsJson.questions.find((q) => q.id === id)!.question);
      const key = await cacheKey(question, scenarioId, datasetJson.version);
      expect(cached[key]?.question, `${chip.label} -> ${id}`).toBe(question);
    }
  });
});
