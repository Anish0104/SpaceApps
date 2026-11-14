/**
 * Citation validator. An answer sentence passes only if:
 *  1. every recordId it cites exists in the dataset, and
 *  2. every number in the sentence matches a numeric value stored on a cited record
 *     (within 1% or 0.05 absolute), so the LLM cannot invent or misquote numbers.
 * Failing sentences are dropped; if nothing factual survives, the caller falls back to a template.
 */
import type { AskResponse, Dataset } from "@flameatlas/engine";

type Sentence = AskResponse["sentences"][number];

const NUM = /-?\d+(?:\.\d+)?/g;
// numbers that are labels, not measurements (e.g. "PSI-26", "FLEX-2", "Saffire-III", years)
const IGNORE = /\b(?:PSI|FLEX|BASS|SAME|DAFT|ACME|CFI|Saffire|NTRS|STD|FM)[-\s]?\d+[A-Za-z-]*\b|\b(?:19|20)\d{2}\b|\b(?:CO|O|N)2\b|\bpO2\b/gi;

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

export interface ValidationResult { kept: Sentence[]; dropped: { sentence: Sentence; reason: string }[] }

export function validateSentences(ds: Dataset, sentences: Sentence[]): ValidationResult {
  const kept: Sentence[] = [];
  const dropped: ValidationResult["dropped"] = [];
  for (const s of sentences) {
    const pools = s.recordIds.map((id) => recordNumbers(ds, id));
    if (pools.some((p) => p === null)) { dropped.push({ sentence: s, reason: "unknown record id" }); continue; }
    const nums = (s.text.replace(IGNORE, " ").match(NUM) ?? []).map(Number);
    if (nums.length && !s.recordIds.length) { dropped.push({ sentence: s, reason: "number without citation" }); continue; }
    const pool = pools.flat() as number[];
    const bad = nums.find((n) => !pool.some((v) => close(n, v)));
    if (bad !== undefined) { dropped.push({ sentence: s, reason: `number ${bad} not in cited records` }); continue; }
    kept.push(s);
  }
  return { kept, dropped };
}
