/**
 * Gemini call for /api/ask. Gemini only PROPOSES the six-beat answer; the caller then
 * Zod-checks it, runs the citation validator, and falls back to the template if needed.
 */
import { KPA_PER_ATM, O2_PARTIAL_FORMULA, kPaToPsi, o2PartialKPa, type Dataset, type Investigation, type RankedResult, type Run, type Scenario } from "@flameatlas/engine";
import { scenarioRecordId } from "./validator";

/** Tried in order; ask() moves to the next one when a model is gone, out of quota, overloaded or slow. */
export const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
/** Parses the comma-separated GEMINI_MODELS var; falls back to DEFAULT_MODELS when unset or empty. */
export function parseModels(csv?: string): string[] {
  const models = (csv ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return models.length ? models : DEFAULT_MODELS;
}
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export const SYSTEM_PROMPT = `You are FlameAtlas, an assistant that interprets NASA microgravity combustion data for fire-safety research.

Rules (all mandatory):
1. Use ONLY the RECORDS provided. Never use outside knowledge for facts or numbers.
2. Every factual sentence must list the record ids it relies on in "recordIds". Use only ids that appear in RECORDS, plus the SCENARIO id under rule 11.
3. Any number you write, in ANY field, must appear in RECORDS or in the SCENARIO, with the same unit. In "sentences" it must appear in a record that sentence cites (or in the cited SCENARIO, rule 11). Do not compute new numbers.
4. "verdict" rates EVIDENCE STRENGTH (green = direct match, yellow = analog only or partial, red = insufficient). It is never a safety rating. Never say a material is safe or unsafe.
5. If the records cannot answer the question, set status "cannot_confirm", verdict "red", explain in "limit", and list the needed fields in "missingFields".
6. Name what differs between the evidence and the question's scenario in "differs" (gravity, oxygen, pressure, material, fuel phase, apparatus).
7. Earth (1 g) and orbit (~0 g) results do NOT bound lunar or Martian behavior; lunar gravity may be more flammable. Say so in "limit" when gravity differs, in words ("Earth gravity", "microgravity", "lunar gravity"); write a g-value only if it appears in RECORDS or the SCENARIO. "sentences" hold only facts backed by the ids they cite.
8. Gas flowing from a burner is not a cabin atmosphere; liquid droplets are not solid fabric. Flag such mismatches.
9. "next.kind" is "missing_experiment" when a gap remains, "evidence_now" when the evidence answers the question, else "none".
10. "scope" is one short sentence such as "In our curated dataset; illustrative, not an approved NASA plan."
11. The SCENARIO is tagged with its own id, [SCENARIO:<id>]. Its values are ASSUMED inputs, not evidence. If a sentence quotes a scenario value (O2, pressure, gravity, O2 partial pressure), add that SCENARIO id to the sentence's "recordIds" and word the value as an assumed scenario input (e.g. "the assumed 34 mol% O2"), never as a measurement and never as a property of a NASA record.
12. Apart from the rule 7 caveat, "limit" may only describe what the RECORDS lack or how they differ from the SCENARIO. Never claim tests, gravity levels or conditions that are not in RECORDS (for example, do not mention Earth-gravity tests unless a record documents one). The same holds for "differs" and "next.target".
Keep 2-5 sentences. Plain, precise language.`;

/** JSON schema for Gemini structured output (OpenAPI subset). */
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["answered", "cannot_confirm"] },
    verdict: { type: "STRING", enum: ["green", "yellow", "red"] },
    sentences: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          recordIds: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["text", "recordIds"],
      },
    },
    differs: { type: "ARRAY", items: { type: "STRING" } },
    limit: { type: "STRING" },
    next: {
      type: "OBJECT",
      properties: {
        kind: { type: "STRING", enum: ["missing_experiment", "evidence_now", "none"] },
        target: { type: "STRING" },
      },
      required: ["kind"],
    },
    scope: { type: "STRING" },
    missingFields: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["status", "verdict", "sentences", "differs", "limit", "next", "scope", "missingFields"],
} as const;

const v = (x: { value: unknown; unit?: string }) => (x.value === null ? "not documented" : `${x.value}${x.unit ? " " + x.unit : ""}`);

/** The records that go to the LLM: the top-k ranked investigations, each with up to 6 runs. */
function selectRecords(ds: Dataset, ranked: RankedResult[], k: number) {
  return ranked.slice(0, k).flatMap((r) => {
    const inv = ds.investigations.find((i) => i.psiId === r.psiId);
    return inv ? [{ r, inv, runs: ds.runs.filter((x) => x.psiId === inv.psiId).slice(0, 6) }] : [];
  });
}

/** Ids of every record buildRecords() puts in the prompt; the validator checks uncited fields against these. */
export function sentRecordIds(ds: Dataset, ranked: RankedResult[], k = 5): string[] {
  return selectRecords(ds, ranked, k).flatMap(({ inv, runs }) => [inv.psiId, ...runs.map((run) => run.id)]);
}

/** Compact, id-tagged context: only the top-ranked investigations and their runs. */
export function buildRecords(ds: Dataset, ranked: RankedResult[], k = 5): string {
  return selectRecords(ds, ranked, k).flatMap(({ r, inv, runs }) => recordLines(inv, runs, r)).join("\n");
}

/** The same record text for one investigation and its runs, without the ranking line (used for summaries). */
export function recordsFor(ds: Dataset, inv: Investigation): { text: string; ids: string[] } {
  const runs = ds.runs.filter((x) => x.psiId === inv.psiId).slice(0, 6);
  return { text: recordLines(inv, runs).join("\n"), ids: [inv.psiId, ...runs.map((run) => run.id)] };
}

function recordLines(inv: Investigation, runs: Run[], r?: RankedResult): string[] {
  const lines: string[] = [];
  {
    const rg = inv.ranges;
    lines.push(
      `[${inv.psiId}] ${inv.acronym} (${inv.name}); type ${inv.projectType}; role ${inv.safetyRole}; fuel ${inv.fuelPhase ?? "unknown"}; ` +
      `hardware ${inv.hardware ?? "unknown"}; objectives: ${inv.objectives}` +
      (rg ? `; documented ranges: ${JSON.stringify({ o2MolPct: rg.o2MolPct, pressureKPa: rg.pressureKPa, flowCmS: rg.flowCmS, gravityG: rg.gravityG })}` : "") +
      (r ? `; ranking reasons: ${r.reasons.join(", ") || "none"}; not documented: ${r.notDocumented.join(", ") || "none"}` : ""),
    );
    for (const run of runs) {
      lines.push(
        `  [${run.id}] run of ${inv.psiId} (${run.status}): material ${v(run.material)}, geometry ${v(run.geometry)}, fuel ${run.fuelPhase}, ` +
        `O2 ${v(run.o2MolPct)}, pressure ${v(run.pressureKPa)}, O2 partial pressure ${v(run.o2PartialKPa)} (computed), ` +
        `flow ${v(run.flowCmS)} ${run.flowDirection.value ?? ""}, gravity ${v(run.gravityG)}, apparatus ${v(run.apparatus)}, ` +
        `outcomes: ${run.outcomes.map((o) => `${o.label} ${v(o.value)}`).join("; ") || "none"}`,
      );
    }
  }
  return lines;
}

const round = (x: number, digits: number) => Number(x.toFixed(digits));

export function buildUserPrompt(question: string, sc: Scenario, records: string): string {
  const id = scenarioRecordId(sc);
  const p = sc.pressureKPa;
  return `QUESTION: ${question}

SCENARIO [${id}] (ASSUMED inputs, not evidence): ${sc.name}; O2 ${sc.o2MolPct} mol%; pressure ${p} kPa (${round(kPaToPsi(p), 1)} psi, ${round(p / KPA_PER_ATM, 2)} atm); O2 partial pressure ${round(o2PartialKPa(sc.o2MolPct, p), 2)} kPa (COMPUTED: ${O2_PARTIAL_FORMULA}); gravity ${sc.gravityG} g; material ${sc.material ?? "any"}; source: ${sc.source}
If a sentence quotes one of these scenario values, cite "${id}" in its recordIds and word it as an assumed scenario input, not evidence.

RECORDS:
${records || "(none)"}`;
}

export interface GeminiOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Structured-output schema; defaults to the six-beat answer (RESPONSE_SCHEMA). */
  schema?: object;
}

export const GEMINI_TIMEOUT_MS = 60_000;

/** A failed Gemini call. `status` is the HTTP status, if there was a response. */
export class GeminiError extends Error {
  constructor(message: string, readonly status?: number, readonly timedOut = false) {
    super(message);
    this.name = "GeminiError";
  }
  /** True when another model may still answer: model closed/gone (404), out of quota (429), overloaded (503), or timed out. */
  get tryNextModel(): boolean {
    return this.timedOut || this.status === 404 || this.status === 429 || this.status === 503;
  }
}

/** Returns the parsed JSON object Gemini produced, or throws. One request, no retries. Shape is checked by the caller. */
export async function callGemini(system: string, user: string, opts: GeminiOptions): Promise<unknown> {
  const f = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? GEMINI_TIMEOUT_MS;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await f(ENDPOINT(opts.model ?? DEFAULT_MODELS[0]), {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2, responseMimeType: "application/json", responseSchema: opts.schema ?? RESPONSE_SCHEMA,
          // Flash models "think" by default, which adds latency; the answer is a constrained
          // extraction over the given records, so thinking is switched off.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!res.ok) throw new GeminiError(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
    const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new GeminiError("gemini: empty response");
    return JSON.parse(text);
  } catch (e) {
    const aborted = ctrl.signal.aborted || (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError"));
    if (aborted) throw new GeminiError(`gemini timeout after ${timeoutMs / 1000} s`, undefined, true);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export type ModelsResult =
  | { ok: true; raw: unknown; model: string }
  | { ok: false; reason: "fatal" | "exhausted" };

/**
 * One request per model, in order, no retries. Moves to the next model only when another model could
 * still answer (404 closed/gone, 429 quota, 503 overloaded, timeout); any other error stops ("fatal").
 * `onFail` hears about every failed request. Used by ask(), the plain-RAG baseline and summaries,
 * so all three spend quota the same way.
 */
export async function callModels(
  system: string, user: string,
  opts: { apiKey: string; models: string[]; fetchImpl?: typeof fetch; schema?: object; onFail?: (model: string, e: unknown, tryNext: boolean) => void },
): Promise<ModelsResult> {
  for (const model of opts.models) {
    try {
      const raw = await callGemini(system, user, { apiKey: opts.apiKey, model, fetchImpl: opts.fetchImpl, schema: opts.schema });
      return { ok: true, raw, model };
    } catch (e) {
      const tryNext = e instanceof GeminiError && e.tryNextModel;
      opts.onFail?.(model, e, tryNext);
      if (!tryNext) return { ok: false, reason: "fatal" };
    }
  }
  return { ok: false, reason: "exhausted" };
}

/**
 * Stable cache key for (question, scenario id, data version). Case and whitespace are normalised
 * so a retyped demo question still hits. The model is not part of the key: any validated answer serves.
 */
export async function cacheKey(...parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.map((p) => p.trim().replace(/\s+/g, " ").toLowerCase()).join("␟"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return "ask:" + [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
