/**
 * /api/ask pipeline:
 *   search -> demo cache? -> cache? -> Gemini (six-beat JSON; models tried in order) -> Zod
 *   -> citation validator (sentences + limit/differs/next.target) -> template fallback -> cache
 */
import { AskResponse, SearchRequest, fieldLabel, reasonLabel, type Dataset, type Investigation, type RankedResult, type Run, type Scenario } from "@flameatlas/engine";
import type MiniSearch from "minisearch";
import { search } from "./search";
import { numbersIn, validateFields, validateSentences } from "./validator";
import { SYSTEM_PROMPT, buildRecords, buildUserPrompt, cacheKey, callGemini, sentRecordIds, DEFAULT_MODELS, GeminiError } from "./gemini";
import type { DemoAnswers } from "./demoCache";

export interface AskDeps {
  ds: Dataset;
  index: MiniSearch;
  apiKey?: string;
  /** Gemini models to try, in order. Each gets one request; the next is tried only on 404/429/503 or timeout. */
  models?: string[];
  /** Committed demo answers (data/cache/demo-answers.json); checked before any other cache. */
  demo?: DemoAnswers;
  kv?: KVNamespace;
  fetchImpl?: typeof fetch;
  log?: (msg: string) => void;
}

const memCache = new Map<string, AskResponse>();

/** Conditions the template quotes, in order, with the unit written after the number. */
const CONDITIONS = [
  { field: "o2MolPct", unit: "mol%" },
  { field: "pressureKPa", unit: "kPa" },
  { field: "flowCmS", unit: "cm/s" },
  { field: "gravityG", unit: "g" },
] as const;

/** "16 to 21" rather than "16-21", which the validator would read as 16 and -21. */
const span = (vals: number[]) => {
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return lo === hi ? String(lo) : `${lo} to ${hi}`;
};

/** "Gravity differs" -> "gravity differs"; "O2 partial pressure close" keeps its capitals. */
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * One template sentence: the investigation, why it ranked (readable labels), and the conditions its
 * runs MEASURED. Every number in the text is a value stored on a cited run or on the investigation's
 * sourced ranges, so the sentence passes the citation validator unchanged. Labels that carry a number
 * of their own (e.g. the 5 mol% tolerance in "Oxygen within 5 mol%") are left out: that number is a
 * rule, not a value on any record. Inferred, assumed and missing values are never quoted.
 */
function templateSentence(inv: Investigation, runs: Run[], r: RankedResult): AskResponse["sentences"][number] {
  const why = r.reasons.map(reasonLabel).filter((l) => numbersIn(l).length === 0).map(lowerFirst);
  const cited = new Set<string>();
  const quoted: string[] = [];
  for (const { field, unit } of CONDITIONS) {
    const measured = runs.filter((run) => run[field].type === "MEASURED" && run[field].value !== null);
    if (measured.length) {
      measured.forEach((run) => cited.add(run.id));
      quoted.push(`${fieldLabel(field).toLowerCase()} ${span(measured.map((run) => run[field].value as number))} ${unit}`);
    }
  }
  let conditions: string;
  if (quoted.length) {
    conditions = `its runs measured ${quoted.join(", ")}`;
  } else if (!runs.length && inv.ranges?.sourceId) {
    // No run-level data: fall back to the investigation's documented, sourced ranges.
    const rg = inv.ranges;
    const parts = CONDITIONS.flatMap(({ field, unit }) => {
      const v = rg[field];
      return v ? [`${fieldLabel(field).toLowerCase()} ${span([...v])} ${unit}`] : [];
    });
    conditions = parts.length ? `it documents ranges of ${parts.join(", ")}` : "no measured conditions are in our curated data";
  } else {
    conditions = "no measured conditions are in our curated data";
  }
  const reasons = why.length ? `ranked for ${why.join(", ")}` : "related by topic";
  return { text: `${inv.acronym} (${inv.psiId}) is ${reasons}; ${conditions}.`, recordIds: [inv.psiId, ...cited] };
}

/** Rules-engine template answer: used when Gemini is unavailable or its answer fails validation. */
export function templateAnswer(ds: Dataset, sc: Scenario, ranked: RankedResult[]): AskResponse {
  const top = ranked.filter((r) => r.score !== null).slice(0, 3);
  if (!top.length) {
    return {
      status: "cannot_confirm", verdict: "red", sentences: [], differs: [],
      limit: "No investigation in our curated data documents the conditions needed for this question.",
      next: { kind: "missing_experiment" }, scope: "In our curated dataset.",
      missingFields: ranked[0]?.notDocumented ?? [], source: "template", dataVersion: ds.version,
    };
  }
  const sentences = top.map((r) => {
    const inv = ds.investigations.find((i) => i.psiId === r.psiId)!;
    return templateSentence(inv, ds.runs.filter((run) => run.psiId === inv.psiId), r);
  });
  const gravityGap = top.every((r) => r.reasons.includes("GRAVITY_DIFFERS"));
  return {
    status: "answered",
    verdict: gravityGap ? "yellow" : "green",
    sentences,
    differs: [...new Set(top.flatMap((r) => r.notDocumented.map((f) => `${fieldLabel(f)} not documented`)))],
    limit: gravityGap
      ? `No curated run matches ${sc.name} gravity; results are analogs, not direct evidence.`
      : "Among tracked conditions only.",
    next: { kind: gravityGap ? "missing_experiment" : "evidence_now" },
    scope: "In our curated dataset; illustrative, not an approved NASA plan.",
    missingFields: [], source: "template", dataVersion: ds.version,
  };
}

/**
 * Citation validation for a Zod-valid answer: drops sentences with unknown ids or untraceable
 * numbers, and neutralises limit / differs / next.target that quote untraceable numbers.
 * `removed` lists every change (empty when the answer passed untouched).
 */
function validateAnswer(ds: Dataset, sc: Scenario, answer: AskResponse, sentIds: string[]): { answer: AskResponse; removed: string[] } {
  const { kept, dropped } = validateSentences(ds, answer.sentences, sc);
  const { notes, ...fields } = validateFields(ds, answer, sentIds, sc);
  return {
    answer: { ...answer, ...fields, sentences: kept },
    removed: [...dropped.map((d) => `dropped "${d.sentence.text.slice(0, 80)}" (${d.reason})`), ...notes],
  };
}

export async function ask(question: string, sc: Scenario, deps: AskDeps): Promise<AskResponse> {
  const { ds, index, log = () => {} } = deps;
  const ranked = search(ds, index, sc, SearchRequest.parse({ query: question, scenarioId: sc.id }));
  const sentIds = sentRecordIds(ds, ranked);
  const key = await cacheKey(question, sc.id, ds.version);

  // 0. committed demo answers (work offline). Re-validated against the current data, so a stale
  //    or hand-edited entry is never served.
  const demo = deps.demo?.[key];
  if (demo) {
    const { removed } = validateAnswer(ds, sc, demo.answer, sentIds);
    if (!removed.length) return { ...demo.answer, source: "cache", dataVersion: ds.version };
    log(`ask: demo cache entry ignored, it no longer validates (${removed[0]})`);
  }

  // 1. cache
  const mem = memCache.get(key);
  if (mem) return { ...mem, source: "cache" };
  if (deps.kv) {
    const hit = await deps.kv.get(key, "json");
    const parsed = AskResponse.safeParse(hit);
    if (parsed.success) { memCache.set(key, parsed.data); return { ...parsed.data, source: "cache" }; }
  }

  const fallback = () => {
    const t = templateAnswer(ds, sc, ranked);
    return { ...t, sentences: validateSentences(ds, t.sentences, sc).kept };
  };

  // 2. Gemini (skip straight to template if no key)
  if (!deps.apiKey) { log("ask: no GEMINI_API_KEY, using template"); return fallback(); }

  // One request per model, in order, no retries. Move on only when another model could still
  // answer (404 closed/gone, 429 quota, 503 overloaded, timeout); anything else goes to the template.
  const prompt = buildUserPrompt(question, sc, buildRecords(ds, ranked));
  const models = deps.models?.length ? deps.models : DEFAULT_MODELS;
  let raw: unknown;
  let answeredBy: string | undefined;
  for (const model of models) {
    try {
      raw = await callGemini(SYSTEM_PROMPT, prompt, { apiKey: deps.apiKey, model, fetchImpl: deps.fetchImpl });
      answeredBy = model;
      break;
    } catch (e) {
      const tryNext = e instanceof GeminiError && e.tryNextModel;
      log(`ask: ${model} failed (${String(e).slice(0, 200)})${tryNext ? "" : ", using template"}`);
      if (!tryNext) return fallback();
    }
  }
  if (!answeredBy) { log(`ask: all ${models.length} models failed, using template`); return fallback(); }
  log(`ask: answered by ${answeredBy}`);

  // 3. shape check
  const parsed = AskResponse.safeParse({ ...(raw as object), source: "llm", dataVersion: ds.version });
  if (!parsed.success) { log(`ask: schema fail ${parsed.error.message.slice(0, 200)}`); return fallback(); }

  // 4. citation validator: drop sentences with unknown ids or numbers not in cited records
  //    (a sentence may cite SCENARIO:<id> for this request's ASSUMED scenario values), and
  //    neutralise limit / differs / next.target that quote numbers not in the sent records or scenario
  const { answer: final, removed } = validateAnswer(ds, sc, parsed.data, sentIds);
  removed.forEach((r) => log(`ask: ${r}`));
  if (final.status === "answered" && final.sentences.length === 0) { log("ask: nothing survived validation, using template"); return fallback(); }

  // 5. cache (only validated LLM answers)
  memCache.set(key, final);
  if (deps.kv) await deps.kv.put(key, JSON.stringify(final), { expirationTtl: 60 * 60 * 24 * 7 });
  return final;
}

export function clearAskCache() { memCache.clear(); }
