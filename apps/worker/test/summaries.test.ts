/** Precomputed investigation summaries. Gemini is always a fake fetch here. */
import { describe, it, expect } from "vitest";
import { Dataset, SummaryFile, summaryKey } from "@flameatlas/engine";
import releaseJson from "../../../data/dataset-v1.0.json";
import summariesJson from "../../../data/cache/summaries.json";
import { recordsFor } from "../src/gemini";
import { budgetedFetch } from "../src/evalRun";
import { SUMMARY_PROMPT, SUMMARY_SCHEMA, checkSummary, summarize } from "../src/summaries";
import { validateSentences } from "../src/validator";
import worker from "../src/index";

const ds = Dataset.parse(releaseJson);
const inv = (id: string) => ds.investigations.find((i) => i.psiId === id)!;
const MODELS = ["model-a", "model-b", "model-c"];

function fakeGemini(steps: (number | object)[]) {
  const calls: { model: string; body: { systemInstruction: { parts: { text: string }[] }; contents: { parts: { text: string }[] }[]; generationConfig: { responseSchema: unknown } } }[] = [];
  const fetchImpl = (async (url: unknown, init?: RequestInit) => {
    calls.push({ model: /models\/([^:]+):/.exec(String(url))?.[1] ?? "?", body: JSON.parse(String(init?.body)) });
    const step = steps[calls.length - 1];
    if (step === undefined) throw new Error("unexpected extra Gemini request");
    if (typeof step === "number") return new Response("{}", { status: step });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(step) }] } }] }));
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const GOOD = {
  sentences: [
    { text: "Saffire-I (PSI-98) burned large cotton-fiberglass (SIBAL) sheets aboard the Cygnus Saffire module.", recordIds: ["PSI-98", "SAF-I-1"] },
    { text: "Its runs measured oxygen at 21.5 and 21.7 mol% with a flow of 20 cm/s.", recordIds: ["SAF-I-1", "SAF-I-2"] },
  ],
};
const deps = (fetchImpl: typeof fetch) => ({ ds, apiKey: "test-key", models: MODELS, fetchImpl });

describe("summarize", () => {
  it("sends one investigation's records with the summary prompt and schema, and saves a validated entry", async () => {
    const g = fakeGemini([GOOD]);
    const r = await summarize(inv("PSI-98"), deps(g.fetchImpl));
    expect(g.calls).toHaveLength(1);
    expect(g.calls[0].body.systemInstruction.parts[0].text).toBe(SUMMARY_PROMPT);
    expect(g.calls[0].body.generationConfig.responseSchema).toEqual(SUMMARY_SCHEMA);
    const user = g.calls[0].body.contents[0].parts[0].text;
    expect(user).toContain(recordsFor(ds, inv("PSI-98")).text);
    expect(user).not.toMatch(/\[PSI-25\]|ranking reasons/); // only its own records, no ranking line
    expect(r).toMatchObject({ outcome: "saved", entry: { psiId: "PSI-98", dataVersion: "1.0.0-seed", model: "model-a", dropped: 0, sentences: GOOD.sentences } });
  });

  it("drops a sentence with a number that is not on its cited records", async () => {
    const bad = { sentences: [...GOOD.sentences, { text: "Flames spread at 9.9 mm/s.", recordIds: ["SAF-I-1"] }] };
    const r = await summarize(inv("PSI-98"), deps(fakeGemini([bad]).fetchImpl));
    expect(r).toMatchObject({ outcome: "saved", entry: { dropped: 1, sentences: GOOD.sentences } });
  });

  it("drops sentences that cite another investigation, no record, or a scenario", () => {
    const { kept, reasons } = checkSummary(ds, inv("PSI-98"), [
      { text: "BASS-II used a smaller duct.", recordIds: ["PSI-25"] },
      { text: "It was a large test.", recordIds: [] },
      { text: "The habitat runs at 30 mol% O2.", recordIds: ["SCENARIO:moon-challenge"] },
      GOOD.sentences[0],
    ]);
    expect(kept).toEqual([GOOD.sentences[0]]);
    expect(reasons).toEqual(["cites PSI-25, not a record of PSI-98", "no citation", "cites SCENARIO:moon-challenge, not a record of PSI-98"]);
  });

  it("keeps at most 3 sentences", () => {
    const s = { text: "Saffire-I (PSI-98) used SIBAL.", recordIds: ["PSI-98"] };
    const { kept } = checkSummary(ds, inv("PSI-98"), [s, { ...s, text: "b" }, { ...s, text: "c" }, { ...s, text: "d" }]);
    expect(kept).toHaveLength(3);
  });

  it("skips (saves nothing) when nothing survives, the shape is wrong, or no model answers", async () => {
    expect(await summarize(inv("PSI-98"), deps(fakeGemini([{ sentences: [{ text: "It burned at 99 mol% O2.", recordIds: ["SAF-I-1"] }] }]).fetchImpl)))
      .toMatchObject({ outcome: "skipped", reason: expect.stringMatching(/nothing survived validation/) });
    expect(await summarize(inv("PSI-98"), deps(fakeGemini([{ summary: "free text" }]).fetchImpl)))
      .toMatchObject({ outcome: "skipped", reason: "answer did not have the summary shape" });
    const dead = fakeGemini([429, 503, 429]);
    expect(await summarize(inv("PSI-98"), deps(dead.fetchImpl))).toMatchObject({ outcome: "skipped", reason: expect.stringMatching(/no model answered/) });
    expect(dead.calls.map((c) => c.model)).toEqual(MODELS);
  });

  it("works for an investigation with no runs (objectives only)", async () => {
    const g = fakeGemini([{ sentences: [{ text: "SAME measured smoke particle sizes from overheated spacecraft materials in microgravity.", recordIds: ["PSI-102"] }] }]);
    expect(await summarize(inv("PSI-102"), deps(g.fetchImpl))).toMatchObject({ outcome: "saved" });
  });

  it("respects the per-request budget", async () => {
    const g = fakeGemini([429, 429, 429]);
    const b = budgetedFetch(1, g.fetchImpl);
    expect(await summarize(inv("PSI-98"), deps(b.fetchImpl))).toMatchObject({ outcome: "skipped" });
    expect(g.calls).toHaveLength(1);
  });

  it("makes no request without a key", async () => {
    const g = fakeGemini([]);
    expect(await summarize(inv("PSI-98"), { ...deps(g.fetchImpl), apiKey: undefined })).toEqual({ outcome: "skipped", reason: "no GEMINI_API_KEY" });
  });
});

describe("POST /api/dev/summaries", () => {
  const post = (host: string, body: unknown) =>
    worker.fetch(new Request(`${host}/api/dev/summaries`, { method: "POST", body: JSON.stringify(body) }), { DATA_VERSION: "x" });

  it("is 404 off localhost", async () => expect((await post("https://flameatlas-api.example.workers.dev", { psiId: "PSI-98", maxCalls: 1 })).status).toBe(404));
  it("rejects an unknown investigation and a bad budget", async () => {
    expect((await post("http://localhost:8787", { psiId: "PSI-999", maxCalls: 1 })).status).toBe(404);
    expect((await post("http://localhost:8787", { psiId: "PSI-98", maxCalls: 99 })).status).toBe(400);
  });
  it("without a key, skips and reports 0 requests used", async () => {
    const res = await post("http://localhost:8787", { psiId: "PSI-98", maxCalls: 3 });
    expect(await res.json()).toEqual({ outcome: "skipped", reason: "no GEMINI_API_KEY", callsUsed: 0 });
  });
});

describe("committed data/cache/summaries.json", () => {
  const file = SummaryFile.parse(summariesJson);

  it("parses, and every entry for this data version still validates against the dataset", () => {
    for (const [key, entry] of Object.entries(file.summaries)) {
      expect(key).toBe(summaryKey(entry.psiId, entry.dataVersion));
      if (entry.dataVersion !== ds.version) continue; // other versions are never shown
      const own = inv(entry.psiId);
      expect(own, key).toBeDefined();
      const { kept, reasons } = checkSummary(ds, own, entry.sentences);
      expect(reasons, key).toEqual([]);
      expect(kept).toHaveLength(entry.sentences.length);
      expect(validateSentences(ds, entry.sentences).dropped, key).toEqual([]);
    }
  });
});
