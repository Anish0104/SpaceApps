/**
 * Contract 2: search(query, scenario, filters) -> RankedResult[]
 *
 * The question score fed into the rules engine comes from one of:
 *   keyword            MiniSearch + synonyms (the shipped default; see eval/README.md)
 *   semantic-fallback  keyword found nothing: bge-m3 / Vectorize results, by normalised cosine
 *   hybrid             keyword + semantic fused by rrf (measured on data 1.2.0: worse, not used)
 *   hybrid-cosine      keyword + semantic fused by normalised cosine scores (built, off; to be judged on a held-out set)
 * The engine (scenario match, Cannot assess, safety role) is the same in every mode.
 */
import MiniSearch from "minisearch";
import {
  inferSafetyRole, rankInvestigations, type Dataset, type Investigation, type RankedResult, type Scenario, type SearchRequest,
} from "@flameatlas/engine";
import synonyms from "../../../data/synonyms.json";
import { semanticScores, type SemanticDeps } from "./semantic";

const SYN: Record<string, string[]> = synonyms;

/** Expand a query with synonyms in both directions (key <-> variants). */
export function expandQuery(q: string): string {
  const lower = q.toLowerCase();
  const extra = new Set<string>();
  for (const [key, variants] of Object.entries(SYN)) {
    const group = [key, ...variants];
    if (group.some((t) => lower.includes(t))) group.forEach((t) => extra.add(t));
  }
  return [q, ...extra].join(" ");
}

function docText(inv: Investigation): string {
  return [inv.acronym, inv.name, inv.objectives, inv.approach, inv.earthBenefits, inv.hardware]
    .filter(Boolean).join(" ");
}

export function buildIndex(ds: Dataset) {
  const ms = new MiniSearch<{ id: string; text: string }>({
    fields: ["text"], storeFields: ["id"], searchOptions: { prefix: true, fuzzy: 0.2 },
  });
  ms.addAll(ds.investigations.map((inv) => ({ id: inv.psiId, text: docText(inv) })));
  return ms;
}

/** Normalized 0..1 keyword scores per psiId. */
export function keywordScores(ms: MiniSearch, query: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!query.trim()) return out;
  const hits = ms.search(expandQuery(query), { combineWith: "OR" });
  const max = hits[0]?.score ?? 1;
  hits.forEach((h) => out.set(String(h.id), h.score / max));
  return out;
}

/** Reciprocal rank fusion of several score maps -> 0..1 normalized. */
export function rrf(maps: Map<string, number>[], k = 60): Map<string, number> {
  const fused = new Map<string, number>();
  for (const m of maps) {
    [...m.entries()].sort((a, b) => b[1] - a[1]).forEach(([id], rank) => {
      fused.set(id, (fused.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  const max = Math.max(...fused.values(), 1e-9);
  return new Map([...fused].map(([id, v]) => [id, v / max]));
}

/** Min-max normalise to 0..1 (all equal -> 1), so cosine scores keep their spread. */
export function normalise(m: Map<string, number>): Map<string, number> {
  if (!m.size) return new Map();
  const vals = [...m.values()];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return new Map([...m].map(([id, v]) => [id, hi > lo ? (v - lo) / (hi - lo) : 1]));
}

/**
 * Cosine fusion: the mean of the keyword score and the normalised cosine score (an id missing from a list
 * counts 0 there). With no keyword hits it is just the normalised cosine score. No weights to tune.
 */
export function fuseCosine(kw: Map<string, number>, semantic: Map<string, number>): Map<string, number> {
  const sem = normalise(semantic);
  if (!kw.size) return sem;
  const ids = new Set([...kw.keys(), ...sem.keys()]);
  return new Map([...ids].map((id) => [id, ((kw.get(id) ?? 0) + (sem.get(id) ?? 0)) / 2]));
}

export type Fusion = "rrf" | "cosine";

export function search(
  ds: Dataset, ms: MiniSearch, scenario: Scenario, req: SearchRequest,
  semantic?: Map<string, number>, fusion: Fusion = "rrf",
): RankedResult[] {
  const kw = keywordScores(ms, req.query);
  const q = !semantic ? kw : fusion === "cosine" ? fuseCosine(kw, semantic) : rrf([kw, semantic]);
  let invs = ds.investigations;
  if (req.filters.fuelPhase) invs = invs.filter((i) => i.fuelPhase === req.filters.fuelPhase);
  if (req.filters.hardware) invs = invs.filter((i) => i.hardware?.includes(req.filters.hardware!));
  const inputs = invs.map((inv) => ({
    investigation: inv,
    runs: ds.runs.filter((r) => r.psiId === inv.psiId),
    questionScore: q.get(inv.psiId) ?? 0,
  }));
  // an explicit filter wins; otherwise take the safety role the question itself names, if it names exactly one
  const role = req.filters.safetyRole ?? inferSafetyRole(req.query);
  return rankInvestigations(inputs, scenario, role).slice(0, req.limit);
}

// ---------- retrieval mode per question ----------

export type SearchModeSetting = "keyword" | "hybrid" | "hybrid-cosine";
export type RetrievalLabel = "keyword" | "semantic-fallback" | "hybrid" | "hybrid-cosine";

export interface RetrievalPlan {
  label: RetrievalLabel;
  semantic?: Map<string, number>;
  fusion: Fusion;
  /** why it is keyword-only, when it is */
  reason?: string;
}

export const searchModeOf = (v?: string): SearchModeSetting => (v === "hybrid" || v === "hybrid-cosine" ? v : "keyword");

/**
 * Which scores to rank with. Keyword when it has hits and SEARCH_MODE is keyword (no AI call at all).
 * When keyword finds nothing, the Vectorize results are used instead (semantic-fallback). SEARCH_MODE
 * hybrid / hybrid-cosine always ask Vectorize. Any AI/Vectorize failure or the 1.5 s timeout -> keyword.
 */
export async function planRetrieval(ds: Dataset, ms: MiniSearch, question: string, mode: SearchModeSetting, deps: SemanticDeps): Promise<RetrievalPlan> {
  const keywordEmpty = keywordScores(ms, question).size === 0;
  if (mode === "keyword" && !keywordEmpty) return { label: "keyword", fusion: "rrf", reason: "SEARCH_MODE is keyword" };
  const r = await semanticScores(ds, question, deps);
  if (r.mode === "keyword") return { label: "keyword", fusion: "rrf", reason: r.reason };
  if (keywordEmpty) return { label: "semantic-fallback", semantic: r.scores, fusion: "cosine" };
  return mode === "hybrid-cosine"
    ? { label: "hybrid-cosine", semantic: r.scores, fusion: "cosine" }
    : { label: "hybrid", semantic: r.scores, fusion: "rrf" };
}
