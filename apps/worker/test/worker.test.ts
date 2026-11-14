import { describe, it, expect } from "vitest";
import { Dataset } from "@flameatlas/engine";
import fixtures from "../../../data/fixtures.json";
import { expandQuery, rrf } from "../src/search";
import { validateSentences } from "../src/validator";
import worker from "../src/index";

const ds = Dataset.parse(fixtures);
const env = { DATA_VERSION: "fixture-0.1" };
const post = (path: string, body: unknown) =>
  worker.fetch(new Request(`http://x${path}`, { method: "POST", body: JSON.stringify(body) }), env);

describe("search", () => {
  it("expands synonyms", () => expect(expandQuery("fire on cloth")).toContain("sibal"));
  it("rrf normalizes to 1", () => {
    const f = rrf([new Map([["a", 1], ["b", 0.5]]), new Map([["b", 1]])]);
    expect(Math.max(...f.values())).toBe(1);
  });
  it("/api/search ranks for the lunar preset", async () => {
    const res = await post("/api/search", { query: "fabric flame spread", scenarioId: "moon-challenge" });
    const body = (await res.json()) as { psiId: string }[];
    expect(res.status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
  });
});

describe("validator", () => {
  it("keeps a number that matches the cited run", () => {
    const r = validateSentences(ds, [{ text: "FIX-BASS-1 ran at 21% O2.", recordIds: ["FIX-BASS-1"] }]);
    expect(r.kept).toHaveLength(1);
  });
  it("drops an invented number", () => {
    const r = validateSentences(ds, [{ text: "It ran at 35% O2.", recordIds: ["FIX-BASS-1"] }]);
    expect(r.dropped[0].reason).toMatch(/not in cited records/);
  });
  it("drops an unknown record id", () => {
    const r = validateSentences(ds, [{ text: "Something.", recordIds: ["NOPE"] }]);
    expect(r.dropped).toHaveLength(1);
  });
  it("drops a number with no citation", () => {
    const r = validateSentences(ds, [{ text: "Flames spread at 4 mm/s.", recordIds: [] }]);
    expect(r.dropped).toHaveLength(1);
  });
});

describe("served dataset", () => {
  it("is the released dataset, not the fixtures", async () => {
    const res = await worker.fetch(new Request("http://x/api/health"), env);
    expect(await res.json()).toMatchObject({ ok: true, dataVersion: "1.0.0-seed", fixture: false, gemini: false });
  });
  it("never ranks or cites a fixture record", async () => {
    const ranked = (await (await post("/api/search", { query: "fabric flame spread", scenarioId: "moon-challenge" })).json()) as { psiId: string }[];
    const answer = await (await post("/api/ask", { question: "fabric fire on the Moon", scenarioId: "moon-challenge", dataVersion: "1.0.0-seed" })).text();
    expect(ranked.map((r) => r.psiId).filter((id) => id.startsWith("FIX-"))).toEqual([]);
    expect(answer).not.toMatch(/FIX-/);
  });
});

describe("/api/ask", () => {
  it("returns a valid six-beat answer", async () => {
    const res = await post("/api/ask", { question: "fabric fire on the Moon", scenarioId: "moon-challenge", dataVersion: "fixture-0.1" });
    const body = (await res.json()) as { status: string; verdict: string; source: string };
    expect(res.status).toBe(200);
    expect(["answered", "cannot_confirm"]).toContain(body.status);
    expect(body.source).toBe("template");
  });
});
