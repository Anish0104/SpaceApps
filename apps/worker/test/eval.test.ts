/**
 * Benchmark tooling: plain-RAG baseline, the /api/dev/eval runner, the budgeted script runner and the
 * offline ranking. Every Gemini response here comes from a fake fetch; nothing reaches the network.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Dataset, Scenario } from "@flameatlas/engine";
import releaseJson from "../../../data/dataset-v1.0.json";
import scenariosJson from "../../../data/scenarios.json";
import questionsJson from "../../../data/eval/questions.json";
import { buildIndex } from "../src/search";
import { clearAskCache, retrieve } from "../src/ask";
import { cacheKey } from "../src/gemini";
import { PLAIN_PROMPT, plainRag } from "../src/plainRag";
import { budgetedFetch, runEval, type EvalRequest } from "../src/evalRun";
import { RANK_K, rankingFor, type EvalQuestion } from "../src/evalRank";
import { evalTasks, parseFlags, runBudgeted, scenarioIdFor, summaryTasks } from "../scripts/lib/budget.mjs";

const ds = Dataset.parse(releaseJson);
const index = buildIndex(ds);
const scenarios = scenariosJson.map((s) => Scenario.parse(s));
const moon = scenarios.find((s) => s.id === "moon-challenge")!;
const MODELS = ["model-a", "model-b", "model-c"];
const Q = "Compare BASS-II small-sample and Saffire large-scale cotton-fiberglass results";

/** A Gemini-shaped answer. The second sentence quotes a number that is on no record. */
const ANSWER = {
  status: "answered", verdict: "yellow",
  sentences: [
    { text: "Saffire-I (PSI-98) burned SIBAL fabric in orbit.", recordIds: ["PSI-98"] },
    { text: "It burned at 99 mol% O2.", recordIds: ["PSI-98"] },
  ],
  differs: ["gravity"], limit: "No lunar-gravity run.", next: { kind: "missing_experiment" },
  scope: "In our curated dataset; illustrative, not an approved NASA plan.", missingFields: [],
};

/**
 * Fake Gemini: plays one step per request (HTTP status or an answer object), records the model and
 * request body of each call, and throws on any request beyond the script.
 */
function fakeGemini(steps: (number | object)[], { repeatLast = false } = {}) {
  const calls: { model: string; body: { systemInstruction: { parts: { text: string }[] }; contents: { parts: { text: string }[] }[] } }[] = [];
  const fetchImpl = (async (url: unknown, init?: RequestInit) => {
    calls.push({ model: /models\/([^:]+):/.exec(String(url))?.[1] ?? "?", body: JSON.parse(String(init?.body)) });
    const step = steps[calls.length - 1] ?? (repeatLast ? steps.at(-1) : undefined);
    if (step === undefined) throw new Error("unexpected extra Gemini request");
    if (typeof step === "number") return new Response(JSON.stringify({ error: { code: step } }), { status: step });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(step) }] } }] }));
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const deps = (fetchImpl: typeof fetch) => ({ ds, index, apiKey: "test-key", models: MODELS, fetchImpl });

beforeEach(() => clearAskCache());

describe("plain-RAG baseline", () => {
  it("sends the same records as ask(), a minimal prompt and no scenario block", async () => {
    const g = fakeGemini([ANSWER]);
    const r = await plainRag(Q, moon, deps(g.fetchImpl));
    const same = retrieve(ds, index, moon, Q);
    expect(r.records).toBe(same.records);
    expect(r.recordIds).toEqual(same.recordIds);
    const sent = g.calls[0].body;
    expect(sent.systemInstruction.parts[0].text).toBe(PLAIN_PROMPT);
    const user = sent.contents[0].parts[0].text;
    expect(user).toContain(same.records);
    expect(user).not.toMatch(/SCENARIO|ASSUMED|Rules/);
  });

  it("returns Gemini's JSON untouched: no validator, an invented number stays", async () => {
    const r = await plainRag(Q, moon, deps(fakeGemini([ANSWER]).fetchImpl));
    expect(r).toMatchObject({ ok: true, model: "model-a", output: ANSWER });
  });

  it("uses the same model fallback (429 moves on) and has no template fallback", async () => {
    const g = fakeGemini([429, ANSWER]);
    expect(await plainRag(Q, moon, deps(g.fetchImpl))).toMatchObject({ ok: true, model: "model-b" });
    expect(g.calls.map((c) => c.model)).toEqual(["model-a", "model-b"]);

    const dead = fakeGemini([429, 503, 429]);
    const r = await plainRag(Q, moon, deps(dead.fetchImpl));
    expect(r).toMatchObject({ ok: false, output: null, error: "all models failed" });
    expect(r.attempts).toHaveLength(3);

    const fatal = fakeGemini([400]);
    expect(await plainRag(Q, moon, deps(fatal.fetchImpl))).toMatchObject({ ok: false, error: "request failed" });
    expect(fatal.calls).toHaveLength(1); // a 400 does not try the next model
  });

  it("makes no request without a key", async () => {
    const g = fakeGemini([]);
    expect(await plainRag(Q, moon, { ...deps(g.fetchImpl), apiKey: undefined })).toMatchObject({ ok: false, error: "no GEMINI_API_KEY" });
    expect(g.calls).toHaveLength(0);
  });
});

describe("/api/dev/eval runner", () => {
  const req = (over: Partial<EvalRequest> = {}): EvalRequest =>
    ({ qid: "q3", question: Q, scenarioId: moon.id, systems: ["flameatlas", "plain_rag"], maxCalls: 6, ...over });

  it("records both systems with the records sent and the prompt each used", async () => {
    const g = fakeGemini([ANSWER, ANSWER]);
    const { results, callsUsed } = await runEval(req(), moon, deps(g.fetchImpl));
    expect(callsUsed).toBe(2);
    const [fa, plain] = results;
    expect(fa).toMatchObject({ system: "flameatlas", recorded: true, model: "model-a", callsUsed: 1, dataVersion: "1.0.0-seed" });
    expect(plain).toMatchObject({ system: "plain_rag", recorded: true, model: "model-a", callsUsed: 1, systemPrompt: PLAIN_PROMPT, output: ANSWER });
    expect(fa.records).toBe(plain.records);
    expect(fa.recordIds.length).toBeGreaterThan(0);
    // FlameAtlas validated its answer: the invented 99 mol% sentence was dropped and logged; plain RAG kept it.
    expect(JSON.stringify(fa.output)).not.toContain("99 mol%");
    expect(fa.log.join("\n")).toMatch(/number 99 not in cited records/);
  });

  it("never sends more Gemini requests than maxCalls", async () => {
    const g = fakeGemini([429], { repeatLast: true });
    const { results, callsUsed } = await runEval(req({ maxCalls: 2 }), moon, deps(g.fetchImpl));
    expect(g.calls).toHaveLength(2);
    expect(callsUsed).toBe(2);
    expect(results.every((r) => !r.recorded)).toBe(true);
    expect(results[1].callsUsed).toBe(0); // plain_rag got nothing left
  });

  it("maxCalls 0 sends nothing", async () => {
    const g = fakeGemini([]);
    const { callsUsed, results } = await runEval(req({ maxCalls: 0 }), moon, deps(g.fetchImpl));
    expect(callsUsed).toBe(0);
    expect(results.map((r) => r.recorded)).toEqual([false, false]);
  });

  it("bypasses the demo cache and the memory cache: every run asks Gemini", async () => {
    const key = await cacheKey(Q, moon.id, ds.version);
    const cached = { question: Q, scenarioId: moon.id, dataVersion: ds.version, answer: { ...ANSWER, sentences: [ANSWER.sentences[0]], source: "llm" as const, dataVersion: ds.version } };
    const g = fakeGemini([ANSWER, ANSWER]);
    const d = { ...deps(g.fetchImpl), demo: { [key]: cached } } as Parameters<typeof runEval>[2];
    await runEval(req({ systems: ["flameatlas"] }), moon, d);
    await runEval(req({ systems: ["flameatlas"] }), moon, d);
    expect(g.calls).toHaveLength(2);
  });

  it("budgetedFetch refuses past its cap", async () => {
    const g = fakeGemini([ANSWER], { repeatLast: true });
    const b = budgetedFetch(1, g.fetchImpl);
    await b.fetchImpl("https://x/models/m:generateContent", { body: "{}" });
    await expect(b.fetchImpl("https://x/models/m:generateContent", { body: "{}" })).rejects.toThrow(/budget reached/);
    expect(b.used()).toBe(1);
  });
});

describe("budgeted script runner (pnpm eval:record / pnpm summaries)", () => {
  const task = (label: string, callsUsed: number, done = false) => {
    const t = { label, worstCase: 3, done: () => done, ran: [] as number[], run: async (budget: number) => { t.ran.push(budget); return { callsUsed: Math.min(callsUsed, budget), saved: true }; } };
    return t;
  };
  const quiet = () => {};

  it("stops when the budget is used up and passes each task only what is left", async () => {
    const ts = [task("a", 2), task("b", 2), task("c", 2), task("d", 2)];
    const s = await runBudgeted(ts, { maxCalls: 5, dryRun: false, log: quiet });
    expect(ts.map((t) => t.ran)).toEqual([[5], [3], [1], []]);
    expect(s).toMatchObject({ callsUsed: 5, stoppedForBudget: true, saved: ["a", "b", "c"] });
  });

  it("dry run plans every task and runs none", async () => {
    const ts = [task("a", 1), task("b", 1, true)];
    const lines: string[] = [];
    const s = await runBudgeted(ts, { maxCalls: 10, dryRun: true, log: (l) => lines.push(l) });
    expect(ts.every((t) => t.ran.length === 0)).toBe(true);
    expect(s).toMatchObject({ planned: ["a"], skipped: ["b"], callsUsed: 0 });
    expect(lines.at(-1)).toMatch(/at most 3 Gemini requests.*Nothing was sent/s);
  });

  it("skips tasks that are already done without spending budget", async () => {
    const ts = [task("a", 1, true), task("b", 1)];
    const s = await runBudgeted(ts, { maxCalls: 1, dryRun: false, log: quiet });
    expect(ts[0].ran).toEqual([]);
    expect(ts[1].ran).toEqual([1]);
    expect(s).toMatchObject({ skipped: ["a"], saved: ["b"], callsUsed: 1 });
  });

  it("stops without retrying when a request fails in transport", async () => {
    let n = 0;
    const boom = { label: "x", worstCase: 3, done: () => false, run: async () => { n++; throw new Error("worker down"); } };
    const s = await runBudgeted([boom, task("y", 1)], { maxCalls: 10, dryRun: false, log: quiet });
    expect(n).toBe(1);
    expect(s).toMatchObject({ failed: ["x"], stoppedForBudget: true });
  });

  it("parses flags", () => {
    const f = (a: string[]) => parseFlags(a, { defaultMaxCalls: 10, listFlag: "--questions" });
    expect(f([])).toEqual({ only: null, maxCalls: 10, dryRun: false, scenario: null });
    expect(f(["--questions", "q2,q3", "--max-calls=4", "--dry-run", "--scenario", "mars"])).toEqual({ only: ["q2", "q3"], maxCalls: 4, dryRun: true, scenario: "mars" });
    expect(() => f(["--max-calls", "-1"])).toThrow();
    expect(() => f(["--max-calls"])).toThrow();
    expect(() => f(["--nope"])).toThrow();
  });
});

describe("pnpm eval:record end to end (script tasks -> runEval, fake Gemini, in-memory files)", () => {
  const questions = questionsJson.questions.slice(0, 4);
  const setup = (steps: (number | object)[], repeatLast = true) => {
    const g = fakeGemini(steps, { repeatLast });
    const files = new Map<string, unknown>();
    const tasks = evalTasks(questions, {
      systems: ["flameatlas", "plain_rag"], dataVersion: ds.version, models: MODELS.length, scenario: null,
      exists: (p: string) => files.has(p), write: (p: string, o: unknown) => files.set(p, o),
      post: async (body: object) => {
        const r = body as EvalRequest;
        return runEval(r, scenarios.find((s) => s.id === r.scenarioId)!, deps(g.fetchImpl));
      },
    });
    return { g, files, tasks };
  };
  const quiet = () => {};

  it("dry run writes nothing and calls nothing", async () => {
    const { g, files, tasks } = setup([ANSWER]);
    await runBudgeted(tasks, { maxCalls: 10, dryRun: true, log: quiet });
    expect(g.calls).toHaveLength(0);
    expect(files.size).toBe(0);
  });

  it("saves to eval/runs/<data-version>/<system>/<qid>.json, then skips what is recorded", async () => {
    const { g, files, tasks } = setup([ANSWER]);
    const first = await runBudgeted(tasks, { maxCalls: 4, dryRun: false, log: quiet });
    expect(first.callsUsed).toBe(4);
    expect([...files.keys()]).toEqual([
      "eval/runs/1.0.0-seed/flameatlas/q1.json", "eval/runs/1.0.0-seed/plain_rag/q1.json",
      "eval/runs/1.0.0-seed/flameatlas/q2.json", "eval/runs/1.0.0-seed/plain_rag/q2.json",
    ]);
    expect(files.get("eval/runs/1.0.0-seed/plain_rag/q1.json")).toMatchObject({ qid: "q1", scenarioId: "moon-challenge", recordIds: expect.any(Array), records: expect.any(String) });

    const before = g.calls.length;
    const second = await runBudgeted(tasks, { maxCalls: 4, dryRun: false, log: quiet });
    expect(second.skipped).toHaveLength(4);
    expect(g.calls.length - before).toBe(4); // only the 4 unrecorded tasks were asked
    expect(files.size).toBe(8);
  });

  it("holds the hard budget even when every model fails over", async () => {
    const { g, files, tasks } = setup([429]);
    const s = await runBudgeted(tasks, { maxCalls: 10, dryRun: false, log: quiet });
    expect(g.calls.length).toBe(10);
    expect(s.callsUsed).toBe(10);
    expect(s.stoppedForBudget).toBe(true);
    expect(files.size).toBe(0); // nothing answered, nothing recorded
  });

  it("uses a question's own scenario, else the flag, else moon-challenge", () => {
    expect(scenarioIdFor({}, null)).toBe("moon-challenge");
    expect(scenarioIdFor({}, "mars")).toBe("mars");
    expect(scenarioIdFor({ scenarioId: "iss" }, "mars")).toBe("iss");
  });

  it("summary tasks skip investigations already in the file", async () => {
    const file = { summaries: { "PSI-98@1.0.0-seed": {} } as Record<string, unknown> };
    const posted: string[] = [];
    const tasks = summaryTasks(["PSI-98", "PSI-25"], {
      dataVersion: "1.0.0-seed", models: 3, file,
      post: async (b: object) => { posted.push((b as { psiId: string }).psiId); return { outcome: "saved", entry: { ok: 1 }, callsUsed: 1 }; },
    });
    await runBudgeted(tasks, { maxCalls: 9, dryRun: false, log: quiet });
    expect(posted).toEqual(["PSI-25"]);
    expect(Object.keys(file.summaries)).toEqual(["PSI-98@1.0.0-seed", "PSI-25@1.0.0-seed"]);
  });
});

describe("offline ranking (pnpm eval:rank)", () => {
  const questions = questionsJson.questions as EvalQuestion[];
  const out = rankingFor(ds, index, questions, (q) => scenarios.find((s) => s.id === scenarioIdFor(q, null))!);
  const known = new Set(ds.investigations.map((i) => i.psiId));

  it("covers every question with at most 5 known psiIds per system", () => {
    expect(out.questions.map((q) => q.qid)).toEqual(questions.map((q) => q.id));
    for (const q of out.questions) {
      for (const list of [q.keyword, q.flameatlas]) {
        expect(list.length).toBeLessThanOrEqual(RANK_K);
        expect(list.every((id) => known.has(id))).toBe(true);
      }
      expect(q.flameatlas).toHaveLength(RANK_K);
    }
  });

  it("flags labelled ids that no system can rank because they are not in the dataset", () => {
    expect(out.questions.find((q) => q.qid === "q6")?.relevantNotInDataset).toEqual(["PSI-69"]);
    expect(out.questions.find((q) => q.qid === "q7")?.relevantNotInDataset).toEqual(["PSI-101", "PSI-47"]);
  });
});
