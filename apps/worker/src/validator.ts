/**
 * Citation validator. An answer sentence passes only if:
 *  1. every recordId it cites exists in the dataset (or is the request's own scenario id), and
 *  2. every number in the sentence matches a numeric value stored on a cited record
 *     (within 1% or 0.05 absolute), so the LLM cannot invent or misquote numbers.
 * A sentence may also cite "SCENARIO:<id>" for the scenario of the current request. That admits
 * only the scenario's own ASSUMED inputs (and its COMPUTED O2 partial pressure); it never makes a
 * number count as a property of a NASA record.
 * Failing sentences are dropped; if nothing factual survives, the caller falls back to a template.
 */
import { KPA_PER_ATM, kPaToPsi, o2PartialKPa, type AskResponse, type Dataset, type Scenario } from "@flameatlas/engine";

type Sentence = AskResponse["sentences"][number];

const NUM = /-?\d+(?:\.\d+)?/g;
// numbers that are labels, not measurements (e.g. "PSI-26", "FLEX-2", "Saffire-III", years)
const IGNORE = /\b(?:PSI|FLEX|BASS|SAME|DAFT|ACME|CFI|Saffire|NTRS|STD|FM)[-\s]?\d+[A-Za-z-]*\b|\b(?:19|20)\d{2}\b|\b(?:CO|O|N)2\b|\bpO2\b/gi;

const SCENARIO_PREFIX = "SCENARIO:";
/** Citation id for a scenario's ASSUMED inputs, e.g. "SCENARIO:moon-fm2". */
export const scenarioRecordId = (sc: Scenario) => `${SCENARIO_PREFIX}${sc.id}`;

/**
 * The only numbers a sentence citing the scenario may quote: O2 (percent and fraction), total
 * pressure (kPa, psi, atm), gravity (g), and the computed O2 partial pressure (kPa).
 */
export function scenarioNumbers(sc: Scenario): number[] {
  return [
    sc.o2MolPct, sc.o2MolPct / 100,
    sc.pressureKPa, kPaToPsi(sc.pressureKPa), sc.pressureKPa / KPA_PER_ATM,
    sc.gravityG,
    o2PartialKPa(sc.o2MolPct, sc.pressureKPa),
  ];
}

function recordNumbers(ds: Dataset, id: string): number[] | null {
  const run = ds.runs.find((r) => r.id === id);
  if (run) {
    const vals: number[] = [];
    for (const v of Object.values(run)) {
      if (v && typeof v === "object" && "value" in v && typeof (v as { value: unknown }).value === "number") {
        vals.push((v as { value: number }).value);
      }
    }
    run.outcomes.forEach((o) => o.value.value !== null && vals.push(o.value.value));
    return vals;
  }
  const inv = ds.investigations.find((i) => i.psiId === id);
  if (inv) {
    const r = inv.ranges ?? {};
    return [r.o2MolPct, r.pressureKPa, r.flowCmS, r.gravityG].flatMap((x) => (x ? [...x] : []));
  }
  if (ds.sources.some((s) => s.id === id)) return [];
  return null; // unknown id
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.05, 0.01 * Math.abs(b));
// Scenario values are small (0.165 g, 0.34 fraction), so no 0.05 absolute floor: 1% covers
// rounding like "8.2 psi" for 8.19 without letting "0.2 g" pass as 0.165 g.
const closeAssumed = (a: number, b: number) => Math.abs(a - b) <= 0.01 * Math.abs(b) + 1e-9;

/** The numbers the validator checks in a text (labels like "PSI-26" or "O2" are not counted). */
export const numbersIn = (text: string) => (text.replace(IGNORE, " ").match(NUM) ?? []).map(Number);
/** First number that matches neither a record value nor an assumed scenario value. */
const unsupported = (nums: number[], pool: number[], assumed: number[]) =>
  nums.find((n) => !pool.some((v) => close(n, v)) && !assumed.some((v) => closeAssumed(n, v)));

export interface ValidationResult { kept: Sentence[]; dropped: { sentence: Sentence; reason: string }[] }

/** `scenario` is the scenario of the current request; without it no SCENARIO id is accepted. */
export function validateSentences(ds: Dataset, sentences: Sentence[], scenario?: Scenario): ValidationResult {
  const kept: Sentence[] = [];
  const dropped: ValidationResult["dropped"] = [];
  for (const s of sentences) {
    const scenarioIds = s.recordIds.filter((id) => id.startsWith(SCENARIO_PREFIX));
    if (scenarioIds.some((id) => !scenario || id !== scenarioRecordId(scenario))) {
      dropped.push({ sentence: s, reason: "unknown scenario id" }); continue;
    }
    const pools = s.recordIds.filter((id) => !id.startsWith(SCENARIO_PREFIX)).map((id) => recordNumbers(ds, id));
    if (pools.some((p) => p === null)) { dropped.push({ sentence: s, reason: "unknown record id" }); continue; }
    const nums = numbersIn(s.text);
    if (nums.length && !s.recordIds.length) { dropped.push({ sentence: s, reason: "number without citation" }); continue; }
    const assumed = scenario && scenarioIds.length ? scenarioNumbers(scenario) : [];
    const bad = unsupported(nums, pools.flat() as number[], assumed);
    if (bad !== undefined) { dropped.push({ sentence: s, reason: `number ${bad} not in cited records` }); continue; }
    kept.push(s);
  }
  return { kept, dropped };
}

/** Replacement for a "limit" that quotes a number we cannot trace. */
export const GENERIC_LIMIT = "Among tracked conditions only.";

type CheckedFields = Pick<AskResponse, "limit" | "differs" | "next">;

/**
 * Same number check for the uncited fields (limit, differs[], next.target). They carry no
 * recordIds, so each number must match a value on one of the records actually sent to the LLM
 * (`sentIds`) or an ASSUMED value of the request's scenario. A field with an unsupported number
 * is neutralised: limit -> GENERIC_LIMIT, the differs item is dropped, next.target is dropped
 * (next.kind is kept). `notes` says what was changed and why, for the log.
 * This only checks numbers; it cannot catch a false claim that contains none.
 */
export function validateFields(ds: Dataset, a: CheckedFields, sentIds: string[], scenario: Scenario): CheckedFields & { notes: string[] } {
  const pool = sentIds.flatMap((id) => recordNumbers(ds, id) ?? []);
  const assumed = scenarioNumbers(scenario);
  const bad = (text: string) => unsupported(numbersIn(text), pool, assumed);
  const notes: string[] = [];

  let limit = a.limit;
  const badLimit = bad(limit);
  if (badLimit !== undefined) { notes.push(`limit replaced (number ${badLimit} not in sent records or scenario)`); limit = GENERIC_LIMIT; }

  const differs = a.differs.filter((d) => {
    const n = bad(d);
    if (n !== undefined) notes.push(`differs item "${d.slice(0, 60)}" dropped (number ${n} not in sent records or scenario)`);
    return n === undefined;
  });

  let next = a.next;
  const badTarget = a.next.target === undefined ? undefined : bad(a.next.target);
  if (badTarget !== undefined) { notes.push(`next.target dropped (number ${badTarget} not in sent records or scenario)`); next = { kind: a.next.kind }; }

  return { limit, differs, next, notes };
}
