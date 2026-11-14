/**
 * Contract 2: search(query, scenario, filters) -> RankedResult[]
 * Keyword (MiniSearch + synonyms) ships first. Semantic (bge-small via Workers AI) is fused in
 * with reciprocal rank fusion only if the benchmark shows it helps.
 */
import MiniSearch from "minisearch";
import {
  rankInvestigations, type Dataset, type Investigation, type RankedResult, type Scenario, type SearchRequest,
} from "@flameatlas/engine";
import synonyms from "../../../data/synonyms.json";

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

export function search(
  ds: Dataset, ms: MiniSearch, scenario: Scenario, req: SearchRequest,
  semantic?: Map<string, number>,
): RankedResult[] {
  const kw = keywordScores(ms, req.query);
  const q = semantic ? rrf([kw, semantic]) : kw;
  let invs = ds.investigations;
  if (req.filters.fuelPhase) invs = invs.filter((i) => i.fuelPhase === req.filters.fuelPhase);
  if (req.filters.hardware) invs = invs.filter((i) => i.hardware?.includes(req.filters.hardware!));
  const inputs = invs.map((inv) => ({
    investigation: inv,
    runs: ds.runs.filter((r) => r.psiId === inv.psiId),
    questionScore: q.get(inv.psiId) ?? 0,
  }));
  return rankInvestigations(inputs, scenario, req.filters.safetyRole).slice(0, req.limit);
}
