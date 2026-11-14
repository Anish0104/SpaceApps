import { describe, it, expect, beforeEach } from "vitest";
import { AskResponse, Dataset, Scenario, SearchRequest } from "@flameatlas/engine";
import fixtures from "../../../data/fixtures.json";
import releaseJson from "../../../data/dataset-v1.0.json";
import scenarios from "../../../data/scenarios.json";
import demoAnswersJson from "../../../data/cache/demo-answers.json";
import captured from "./captured/gemini-3.5-flash-moon-fm2.json";
import worker from "../src/index";
import { buildIndex, search } from "../src/search";
import { ask, clearAskCache, templateAnswer } from "../src/ask";
import { DEFAULT_MODELS, GEMINI_TIMEOUT_MS, SYSTEM_PROMPT, buildRecords, buildUserPrompt, cacheKey, callGemini, parseModels, sentRecordIds } from "../src/gemini";
import { GENERIC_LIMIT, validateFields, validateSentences } from "../src/validator";
import { DemoCacheFile, loadDemoAnswers, warmCache, type DemoAnswers } from "../src/demoCache";

const ds = Dataset.parse(fixtures);
const index = buildIndex(ds);
const moon = Scenario.parse(scenarios.find((s) => s.id === "moon-challenge"));
const fm2 = Scenario.parse(scenarios.find((s) => s.id === "moon-fm2")); // 34 mol% O2, 56.5 kPa (8.2 psi), 0.165 g

/** Fake fetch that returns a Gemini-shaped response containing `obj` as JSON text. */
const geminiReturns = (obj: unknown, status = 200): typeof fetch =>
  (async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status })) as typeof fetch;

const geminiBody = (obj: unknown) => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });

/**
 * Fake fetch that plays one scripted step per call and records which model each call went to.
 * A step is an HTTP status (error body), "timeout" (the request aborts), or an answer object (HTTP 200).
 * It throws if called more often than scripted, so a test fails on any unexpected extra request.
 */
function scripted(steps: (number | "timeout" | object)[]) {
  const models: string[] = [];
  const fetchImpl = (async (url: unknown) => {
    models.push(/models\/([^:]+):/.exec(String(url))?.[1] ?? "?");
    const step = steps[models.length - 1];
    if (step === undefined) throw new Error("unexpected extra Gemini request");
    if (step === "timeout") throw new DOMException("The operation was aborted.", "AbortError");
    if (typeof step === "number") return new Response(JSON.stringify({ error: { code: step } }), { status: step });
    return new Response(geminiBody(step));
  }) as typeof fetch;
  return { fetchImpl, models };
}

const good = {
  status: "answered", verdict: "yellow",
  sentences: [
    { text: "BASS (PSI-26) burned SIBAL fabric in orbit.", recordIds: ["PSI-26"] },
    { text: "Run FIX-BASS-1 used 21 mol% O2.", recordIds: ["FIX-BASS-1"] },
  ],
  differs: ["gravity: orbit vs 0.165 g"], limit: "No curated lunar-gravity run.",
  next: { kind: "missing_experiment", target: "SIBAL at 0.165 g" },
  scope: "In our curated dataset; illustrative, not an approved NASA plan.", missingFields: [],
};

beforeEach(() => clearAskCache());

describe("ask pipeline", () => {
  it("records context only contains ids from the dataset", () => {
    const rec = buildRecords(ds, [{ psiId: "PSI-26", score: 1, contributions: { M: 0, F: 0, Q: 0, D: 0, C: 0 }, reasons: [], notDocumented: [], cannotAssess: false }]);
    expect(rec).toContain("[PSI-26]");
    expect(rec).toContain("[FIX-BASS-1]");
  });

  it("uses the template when there is no API key", async () => {
    const a = await ask("fabric fire", moon, { ds, index });
    expect(a.source).toBe("template");
  });

  it("returns a validated Gemini answer", async () => {
    const a = await ask("fabric fire on the moon", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns(good) });
    expect(a.source).toBe("llm");
    expect(a.sentences).toHaveLength(2);
  });

  it("drops a sentence with an invented number but keeps the rest", async () => {
    const bad = { ...good, sentences: [...good.sentences, { text: "Flames spread at 7.3 mm/s.", recordIds: ["FIX-BASS-1"] }] };
    const a = await ask("q2", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns(bad) });
    expect(a.sentences.map((s) => s.text)).not.toContain("Flames spread at 7.3 mm/s.");
    expect(a.sentences).toHaveLength(2);
  });

  it("falls back to template when nothing survives validation", async () => {
    const allBad = { ...good, sentences: [{ text: "It burned at 99 kPa.", recordIds: ["NOT-A-RECORD"] }] };
    const a = await ask("q3", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns(allBad) });
    expect(a.source).toBe("template");
  });

  it("falls back to template on a bad schema", async () => {
    const a = await ask("q4", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns({ hello: "world" }) });
    expect(a.source).toBe("template");
  });

  it("falls back to template on HTTP error (rate limit)", async () => {
    const a = await ask("q5", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns({}, 429) });
    expect(a.source).toBe("template");
  });

  it("serves the second identical question from cache", async () => {
    await ask("same question", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns(good) });
    const b = await ask("same question", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns({}, 500) });
    expect(b.source).toBe("cache");
  });

  it("keeps a valid cannot_confirm answer", async () => {
    const cc = { ...good, status: "cannot_confirm", verdict: "red", sentences: [], missingFields: ["o2MolPct"] };
    const a = await ask("pmma above 25% o2", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns(cc) });
    expect(a.status).toBe("cannot_confirm");
    expect(a.source).toBe("llm");
  });

  it("keeps a scenario-cited sentence end to end and still drops a mis-cited one", async () => {
    const answer = {
      ...good,
      sentences: [
        { text: "The assumed habitat air is 34 mol% O2 at 8.2 psi.", recordIds: ["SCENARIO:moon-fm2"] },
        { text: "BASS ran SIBAL at 0.165 g.", recordIds: ["PSI-26"] },
      ],
    };
    const a = await ask("fm2 fabric", fm2, { ds, index, apiKey: "k", fetchImpl: geminiReturns(answer) });
    expect(a.source).toBe("llm");
    expect(a.sentences).toEqual([answer.sentences[0]]);
  });
});

describe("scenario citations (ASSUMED inputs)", () => {
  const validate = (text: string, recordIds: string[], sc: Scenario = fm2) =>
    validateSentences(ds, [{ text, recordIds }], sc);

  it("keeps a sentence citing SCENARIO:moon-fm2 with 34 mol% and 8.2 psi", () => {
    const r = validate("The assumed FM2 habitat air is 34 mol% O2 at 8.2 psi.", ["SCENARIO:moon-fm2"]);
    expect(r.kept).toHaveLength(1);
    expect(r.dropped).toHaveLength(0);
  });

  it("accepts every allowed form of the scenario's values", () => {
    const r = validate(
      "Assumed inputs: 34% O2 (0.34 mole fraction), 56.5 kPa (8.2 psi, 0.56 atm), 0.165 g, O2 partial pressure 19.21 kPa.",
      ["SCENARIO:moon-fm2"],
    );
    expect(r.kept).toHaveLength(1);
  });

  it("drops a sentence citing SCENARIO:moon-fm2 with an invented number", () => {
    const r = validate("The assumed FM2 habitat air is 34 mol% O2 at 9.5 psi.", ["SCENARIO:moon-fm2"]);
    expect(r.kept).toHaveLength(0);
    expect(r.dropped[0].reason).toBe("number 9.5 not in cited records");
  });

  it("does not round scenario values loosely (0.2 g is not 0.165 g)", () => {
    expect(validate("Assumed gravity is 0.2 g.", ["SCENARIO:moon-fm2"]).kept).toHaveLength(0);
  });

  it("drops a sentence citing a NASA record with a scenario number and no SCENARIO id", () => {
    const r = validate("FIX-BASS-1 burned SIBAL at 34 mol% O2.", ["FIX-BASS-1"]);
    expect(r.kept).toHaveLength(0);
    expect(r.dropped[0].reason).toBe("number 34 not in cited records");
  });

  it("drops an unknown SCENARIO id", () => {
    const r = validate("The assumed habitat air is 34 mol% O2.", ["SCENARIO:not-a-scenario"]);
    expect(r.kept).toHaveLength(0);
    expect(r.dropped[0].reason).toBe("unknown scenario id");
  });

  it("drops a real scenario id that is not this request's scenario", () => {
    // moon-challenge is 30 mol% at 70.3 kPa; citing it in an FM2 request is not allowed
    expect(validate("The assumed habitat air is 30 mol% O2.", ["SCENARIO:moon-challenge"]).kept).toHaveLength(0);
  });

  it("drops any SCENARIO id when no scenario is passed to the validator", () => {
    const r = validateSentences(ds, [{ text: "The assumed habitat air is 34 mol% O2.", recordIds: ["SCENARIO:moon-fm2"] }]);
    expect(r.kept).toHaveLength(0);
  });

  it("checks each number against its own source when a sentence cites both", () => {
    const ids = ["FIX-BASS-1", "SCENARIO:moon-fm2"];
    expect(validate("FIX-BASS-1 ran at 21 mol% O2, below the assumed 34 mol%.", ids).kept).toHaveLength(1);
    expect(validate("FIX-BASS-1 ran at 25 mol% O2, below the assumed 34 mol%.", ids).kept).toHaveLength(0);
  });

  it("citing the scenario does not unlock scenario fields outside the allowed set", () => {
    const iss = Scenario.parse(scenarios.find((s) => s.id === "iss")); // flowCmS 10 is not citable
    expect(validate("Assumed cabin flow is 10 cm/s.", ["SCENARIO:iss"], iss).kept).toHaveLength(0);
  });

  it("tags the scenario in the prompt as an assumed, citable input", () => {
    const p = buildUserPrompt("q", fm2, "");
    expect(p).toContain("SCENARIO [SCENARIO:moon-fm2] (ASSUMED inputs, not evidence)");
    expect(p).toContain("56.5 kPa (8.2 psi, 0.56 atm)");
    expect(p).toContain("O2 partial pressure 19.21 kPa (COMPUTED:");
    expect(p).toContain('cite "SCENARIO:moon-fm2"');
  });
});

describe("callGemini request", () => {
  it("allows 60 s per request", () => {
    expect(GEMINI_TIMEOUT_MS).toBe(60_000);
  });

  it("disables thinking to keep latency down", async () => {
    let sent: { generationConfig?: { thinkingConfig?: unknown } } = {};
    const capture = (async (_url: unknown, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }));
    }) as typeof fetch;
    await callGemini("sys", "user", { apiKey: "k", fetchImpl: capture });
    expect(sent.generationConfig?.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });
});

describe("model fallback", () => {
  const [first, second, third] = DEFAULT_MODELS;

  it("first model 429 -> second model answers with source llm", async () => {
    const { fetchImpl, models } = scripted([429, good]);
    const logs: string[] = [];
    const a = await ask("fabric fire on the moon", moon, { ds, index, apiKey: "k", fetchImpl, log: (m) => logs.push(m) });
    expect(a.source).toBe("llm");
    expect(models).toEqual([first, second]); // one request each, third never called
    expect(logs).toContain(`ask: answered by ${second}`);
    expect(logs.some((l) => l.startsWith(`ask: ${first} failed (GeminiError: gemini 429`))).toBe(true);
  });

  it("all models fail -> template, one request per model, no retries", async () => {
    const { fetchImpl, models } = scripted([429, 503, 404]);
    const logs: string[] = [];
    const a = await ask("fabric fire on the moon", moon, { ds, index, apiKey: "k", fetchImpl, log: (m) => logs.push(m) });
    expect(a.source).toBe("template");
    expect(models).toEqual([first, second, third]);
    expect(logs).toContain("ask: all 3 models failed, using template");
  });

  it("a timeout moves on to the next model", async () => {
    const { fetchImpl, models } = scripted(["timeout", good]);
    const a = await ask("fabric fire on the moon", moon, { ds, index, apiKey: "k", fetchImpl });
    expect(a.source).toBe("llm");
    expect(models).toEqual([first, second]);
  });

  it("any other error (HTTP 500) goes straight to the template", async () => {
    const { fetchImpl, models } = scripted([500]);
    const a = await ask("fabric fire on the moon", moon, { ds, index, apiKey: "k", fetchImpl });
    expect(a.source).toBe("template");
    expect(models).toEqual([first]);
  });

  it("uses the configured model order", async () => {
    const { fetchImpl, models } = scripted([503, good]);
    await ask("fabric fire on the moon", moon, { ds, index, apiKey: "k", fetchImpl, models: ["model-b", "model-a"] });
    expect(models).toEqual(["model-b", "model-a"]);
  });

  it("parses GEMINI_MODELS and falls back to the defaults", () => {
    expect(parseModels(" a , b,,c ")).toEqual(["a", "b", "c"]);
    expect(parseModels(undefined)).toEqual(DEFAULT_MODELS);
    expect(parseModels(" , ")).toEqual(DEFAULT_MODELS);
  });
});

describe("limit / differs / next.target number check", () => {
  const sent = ["PSI-26", "FIX-BASS-1"]; // FIX-BASS-1 documents 21 mol% O2
  const check = (over: Partial<Pick<typeof good, "limit" | "differs" | "next">>) =>
    validateFields(ds, { limit: good.limit, differs: good.differs, next: { kind: "missing_experiment" }, ...over } as Parameters<typeof validateFields>[1], sent, fm2);

  it("replaces a limit with an unsupported number", () => {
    const r = check({ limit: "Ground tests at 47.5 kPa already cover this." });
    expect(r.limit).toBe(GENERIC_LIMIT);
    expect(r.notes).toEqual(["limit replaced (number 47.5 not in sent records or scenario)"]);
  });

  it("keeps a valid limit, with or without numbers", () => {
    const withNumbers = "No sent run matches the assumed 0.165 g; FIX-BASS-1 used 21 mol% O2, not the assumed 34 mol%.";
    expect(check({ limit: withNumbers }).limit).toBe(withNumbers);
    expect(check({ limit: good.limit }).limit).toBe(good.limit);
    expect(check({ limit: good.limit }).notes).toEqual([]);
  });

  it("checks against the records sent to Gemini, not the whole dataset", () => {
    const limit = "FIX-BASS-1 used 21 mol% O2.";
    expect(check({ limit }).limit).toBe(limit);
    expect(validateFields(ds, { limit, differs: [], next: { kind: "none" } }, [], fm2).limit).toBe(GENERIC_LIMIT);
  });

  it("drops only the differs item with an unsupported number", () => {
    const r = check({ differs: ["gravity: orbit vs 0.165 g", "pressure: 47.5 kPa vs 56.5 kPa"] });
    expect(r.differs).toEqual(["gravity: orbit vs 0.165 g"]);
  });

  it("drops next.target with an unsupported number but keeps next.kind", () => {
    expect(check({ next: { kind: "missing_experiment", target: "SIBAL at 0.38 g" } }).next).toEqual({ kind: "missing_experiment" });
    const ok = { kind: "missing_experiment", target: "SIBAL at 0.165 g and 34 mol% O2" };
    expect(check({ next: ok }).next).toEqual(ok);
  });

  it("applies the check end to end and logs what it changed", async () => {
    const answer = {
      ...good,
      limit: "Ground tests at 47.5 kPa already cover this.",
      differs: ["gravity: orbit vs 0.165 g", "oxygen: 47.5 mol% tested"],
      next: { kind: "missing_experiment", target: "SIBAL at 0.38 g" },
    };
    const logs: string[] = [];
    const a = await ask("fabric fire on the moon", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns(answer), log: (m) => logs.push(m) });
    expect(a.source).toBe("llm");
    expect(a.limit).toBe(GENERIC_LIMIT);
    expect(a.differs).toEqual(["gravity: orbit vs 0.165 g"]);
    expect(a.next).toEqual({ kind: "missing_experiment" });
    expect(a.sentences).toHaveLength(2);
    expect(logs.filter((l) => /^ask: (limit replaced|differs item|next\.target dropped)/.test(l))).toHaveLength(3);
  });

  it("keeps a valid limit end to end", async () => {
    const a = await ask("fabric fire on the moon", moon, { ds, index, apiKey: "k", fetchImpl: geminiReturns(good) });
    expect(a.limit).toBe(good.limit);
    expect(a.differs).toEqual(good.differs);
    expect(a.next).toEqual(good.next);
  });

  it("tells Gemini what limit may say", () => {
    expect(SYSTEM_PROMPT).toContain('"limit" may only describe what the RECORDS lack or how they differ from the SCENARIO');
    expect(SYSTEM_PROMPT).toContain("Never claim tests, gravity levels or conditions that are not in RECORDS");
  });
});

describe("captured Gemini response (real gemini-3.5-flash output over the FAKE fixture data)", () => {
  it("replays through the pipeline with a fake fetch", async () => {
    const logs: string[] = [];
    const a = await ask("Would fabric burn differently in a lunar habitat?", fm2, {
      ds, index, apiKey: "k", fetchImpl: geminiReturns(captured), log: (m) => logs.push(m),
    });
    expect(a.source).toBe("llm");
    expect(a.sentences.map((s) => s.recordIds)).toContainEqual(["SCENARIO:moon-fm2"]);
    expect(a.next.kind).toBe("missing_experiment");
  });
});

describe("demo cache", () => {
  const question = "Where is the biggest evidence gap for a lunar habitat?";
  const noFetch = (async () => { throw new Error("demo cache hit must not call Gemini"); }) as typeof fetch;
  const entry = (answer: object) => ({ question, scenarioId: moon.id, dataVersion: ds.version, model: "gemini-3.8-flash", answer: { ...answer, source: "llm" as const, dataVersion: ds.version } });
  const demoWith = async (answer: object): Promise<DemoAnswers> =>
    DemoCacheFile.parse({ answers: { [await cacheKey(question, moon.id, ds.version)]: entry(answer) } }).answers;

  it("serves a demo answer with source cache, without a key or a request", async () => {
    const a = await ask(question, moon, { ds, index, demo: await demoWith(good), fetchImpl: noFetch });
    expect(a.source).toBe("cache");
    expect(a.sentences).toEqual(good.sentences);
    expect(a.dataVersion).toBe(ds.version);
  });

  it("matches the question regardless of case and spacing", async () => {
    const a = await ask(`  ${question.toUpperCase().replace(" ", "   ")} `, moon, { ds, index, demo: await demoWith(good), fetchImpl: noFetch });
    expect(a.source).toBe("cache");
  });

  it("is keyed by scenario and data version", async () => {
    const demo = await demoWith(good);
    expect((await ask(question, fm2, { ds, index, demo })).source).toBe("template");
    expect((await ask(question, moon, { ds: { ...ds, version: "other-1.0" }, index, demo })).source).toBe("template");
  });

  it("ignores a demo entry that no longer validates", async () => {
    const stale = { ...good, sentences: [...good.sentences, { text: "Flames spread at 7.3 mm/s.", recordIds: ["FIX-BASS-1"] }] };
    const logs: string[] = [];
    const a = await ask(question, moon, { ds, index, demo: await demoWith(stale), log: (m) => logs.push(m) });
    expect(a.source).toBe("template");
    expect(logs[0]).toMatch(/^ask: demo cache entry ignored, it no longer validates/);
  });

  it("loads the committed file and survives a malformed one", () => {
    expect(loadDemoAnswers(demoAnswersJson)).toBeTypeOf("object");
    const warnings: string[] = [];
    expect(loadDemoAnswers({ answers: { k: { nope: true } } }, (m) => warnings.push(m))).toEqual({});
    expect(warnings).toHaveLength(1);
  });
});

describe("warmCache (what pnpm warm-cache runs inside the worker)", () => {
  const questions = [{ id: "q3", question: "Compare BASS-II and Saffire results" }, { id: "q4", question: "Where is the biggest evidence gap?" }];

  it("asks each question once and saves only validated llm answers", async () => {
    const { fetchImpl, models } = scripted([good, { hello: "world" }]); // q3 answers, q4 fails the schema
    const file = { answers: {} as DemoAnswers };
    const results = await warmCache(questions, fm2, { ds, index, apiKey: "k", fetchImpl }, file);
    expect(models).toHaveLength(2);
    expect(results.map((r) => r.outcome)).toEqual(["saved", "skipped"]);
    expect(results[0].model).toBe(DEFAULT_MODELS[0]);
    expect(results[1].reason).toMatch(/schema fail/);

    const key = await cacheKey(questions[0].question, fm2.id, ds.version);
    expect(Object.keys(file.answers)).toEqual([key]);
    expect(file.answers[key]).toMatchObject({ question: questions[0].question, scenarioId: "moon-fm2", dataVersion: ds.version, model: DEFAULT_MODELS[0] });
    expect(file.answers[key].answer.source).toBe("llm");
    expect(DemoCacheFile.safeParse(file).success).toBe(true);

    // what was saved is served by ask() as a demo answer
    clearAskCache();
    const served = await ask(questions[0].question, fm2, { ds, index, demo: file.answers });
    expect(served.source).toBe("cache");
  });

  it("skips a question that falls back to the template and says why", async () => {
    const { fetchImpl } = scripted([429, 429, 429]);
    const file = { answers: {} as DemoAnswers };
    const [r] = await warmCache(questions.slice(0, 1), fm2, { ds, index, apiKey: "k", fetchImpl }, file);
    expect(r.outcome).toBe("skipped");
    expect(r.reason).toMatch(/all 3 models failed/);
    expect(file.answers).toEqual({});
  });

  it("does not ask a question that is already in the file", async () => {
    const first = scripted([good]);
    const file = { answers: {} as DemoAnswers };
    await warmCache(questions.slice(0, 1), fm2, { ds, index, apiKey: "k", fetchImpl: first.fetchImpl }, file);
    clearAskCache();
    const second = scripted([]); // any request would throw
    const [r] = await warmCache(questions.slice(0, 1), fm2, { ds, index, apiKey: "k", fetchImpl: second.fetchImpl }, file);
    expect(r.outcome).toBe("already_cached");
    expect(second.models).toHaveLength(0);
  });
});

describe("POST /api/dev/warm-cache route", () => {
  const env = { DATA_VERSION: "test" }; // no GEMINI_API_KEY: the pipeline stops before any request
  const post = (origin: string, body: unknown) =>
    worker.fetch(new Request(`${origin}/api/dev/warm-cache`, { method: "POST", body: JSON.stringify(body) }), env);
  const body = { scenarioId: "moon-fm2", questions: [{ id: "q4", question: "Where is the biggest evidence gap?" }] };

  it("does not exist outside localhost", async () => {
    expect((await post("https://flameatlas-api.example.workers.dev", body)).status).toBe(404);
  });

  it("reports a skipped question and returns no answers when there is no key", async () => {
    const res = await post("http://localhost:8787", body);
    expect(res.status).toBe(200);
    const out = (await res.json()) as { results: { outcome: string; reason?: string }[]; answers: object };
    expect(out.results).toEqual([expect.objectContaining({ id: "q4", outcome: "skipped", reason: "no GEMINI_API_KEY, using template" })]);
    expect(out.answers).toEqual({});
  });

  it("rejects a malformed body and an unknown scenario", async () => {
    expect((await post("http://localhost:8787", { scenarioId: "moon-fm2", questions: [] })).status).toBe(400);
    expect((await post("http://localhost:8787", { ...body, scenarioId: "nope" })).status).toBe(404);
  });
});

describe("template answer on the released dataset (dataset-v1.0.json)", () => {
  const release = Dataset.parse(releaseJson);
  const releaseIndex = buildIndex(release);
  const QUESTIONS = ["Would a cotton fabric fire spread differently here?", "What is the nearest tested condition?"];
  const cases = scenarios.map((s) => Scenario.parse(s)).flatMap((sc) => QUESTIONS.map((q) => [sc.id, q, sc] as const));

  it.each(cases)("%s: \"%s\" keeps its receipts after validation", (_id, question, sc) => {
    const ranked = search(release, releaseIndex, sc, SearchRequest.parse({ query: question, scenarioId: sc.id }));
    const t = AskResponse.parse(templateAnswer(release, sc, ranked));
    const { kept, dropped } = validateSentences(release, t.sentences, sc);
    expect(dropped.map((d) => `${d.sentence.text} => ${d.reason}`)).toEqual([]); // nothing is lost, not just "something survives"
    if (t.status === "answered") expect(kept.length).toBeGreaterThanOrEqual(1);
    else expect(t.status).toBe("cannot_confirm");
    expect(validateFields(release, t, sentRecordIds(release, ranked), sc).notes).toEqual([]);
  });

  it("sentences use readable labels, never raw reason codes", () => {
    for (const sc of scenarios.map((s) => Scenario.parse(s))) {
      const ranked = search(release, releaseIndex, sc, SearchRequest.parse({ query: QUESTIONS[0], scenarioId: sc.id }));
      const t = templateAnswer(release, sc, ranked);
      for (const text of [...t.sentences.map((x) => x.text), ...t.differs]) expect(text).not.toMatch(/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b|\b(?:o2MolPct|pressureKPa|flowCmS|gravityG|thicknessMm|sizeMm|ductSize|flowDirection)\b/);
    }
  });

  it("quotes only measured values that are on the cited runs", () => {
    const moon = Scenario.parse(scenarios.find((s) => s.id === "moon-challenge"));
    const ranked = search(release, releaseIndex, moon, SearchRequest.parse({ query: QUESTIONS[0], scenarioId: moon.id }));
    const saffire1 = templateAnswer(release, moon, ranked).sentences.find((x) => x.recordIds[0] === "PSI-98");
    expect(saffire1).toEqual({
      text: "Saffire-I (PSI-98) matches on O2 partial pressure and material, but was tested in orbit, not at the scenario's gravity; its runs measured oxygen 21.5 to 21.7 mol%, flow speed 20 cm/s, gravity 0 g.",
      recordIds: ["PSI-98", "SAF-I-1", "SAF-I-2"],
    });
    expect(saffire1?.text).not.toMatch(/101\.3/); // Saffire-I pressure is INFERRED, so it is not quoted
  });

  it("the no-key pipeline returns those sentences for every scenario", async () => {
    for (const sc of scenarios.map((s) => Scenario.parse(s))) {
      const a = await ask(QUESTIONS[0], sc, { ds: release, index: releaseIndex });
      expect(a.source).toBe("template");
      if (a.status === "answered") expect(a.sentences.length, sc.id).toBeGreaterThanOrEqual(1);
    }
  });
});
