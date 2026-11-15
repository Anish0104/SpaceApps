/**
 * Offline ranking comparison for the benchmark (`pnpm eval:rank`, no Gemini): for every eval question,
 * the top-5 investigations by
 *   - keyword:    keyword search alone (MiniSearch BM25 + synonyms)
 *   - flameatlas: "Engine-only": the same keyword score fed into the rules engine with the scenario
 *   - hybrid:     keyword and bge-m3 semantic scores fused by rrf, fed into the same engine (only when the
 *                 cached corpus and question vectors exist; computed offline, no network)
 * for Top-1 / Top-3 scoring.
 */
import { SearchRequest, type Dataset, type Scenario } from "@flameatlas/engine";
import type MiniSearch from "minisearch";
import { keywordScores, search } from "./search";

export const RANK_K = 5;

export interface EvalQuestion { id: string; question: string; relevantPsiIds?: string[]; scenarioId?: string }

export interface RankingEntry {
  qid: string;
  question: string;
  scenarioId: string;
  relevantPsiIds: string[];
  /** Labelled relevant ids that are not in this dataset: no system can rank them. */
  relevantNotInDataset: string[];
  keyword: string[];
  flameatlas: string[];
  /** Present when cached embeddings were available for this question. */
  hybrid?: string[];
  /** Hybrid-cosine top-5; only computed when asked for (it is judged on held-out questions, not this set). */
  hybridCosine?: string[];
}

/** Keyword-only order: highest normalised BM25 score first; ties broken by id so the file is stable. */
export function keywordTop(index: MiniSearch, query: string, k = RANK_K): string[] {
  return [...keywordScores(index, query)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k).map(([id]) => id);
}

export function rankingFor(
  ds: Dataset, index: MiniSearch, questions: EvalQuestion[], scenarioFor: (q: EvalQuestion) => Scenario,
  semanticFor?: (q: EvalQuestion) => Map<string, number> | undefined,
  opts: { cosine?: boolean } = {},
): { dataVersion: string; k: number; questions: RankingEntry[] } {
  const known = new Set(ds.investigations.map((i) => i.psiId));
  return {
    dataVersion: ds.version,
    k: RANK_K,
    questions: questions.map((q) => {
      const sc = scenarioFor(q);
      const relevant = q.relevantPsiIds ?? [];
      const req = SearchRequest.parse({ query: q.question, scenarioId: sc.id });
      const semantic = semanticFor?.(q);
      return {
        qid: q.id,
        question: q.question,
        scenarioId: sc.id,
        relevantPsiIds: relevant,
        relevantNotInDataset: relevant.filter((id) => !known.has(id)),
        keyword: keywordTop(index, q.question),
        flameatlas: search(ds, index, sc, req).slice(0, RANK_K).map((r) => r.psiId),
        ...(semantic ? { hybrid: search(ds, index, sc, req, semantic, "rrf").slice(0, RANK_K).map((r) => r.psiId) } : {}),
        ...(semantic && opts.cosine ? { hybridCosine: search(ds, index, sc, req, semantic, "cosine").slice(0, RANK_K).map((r) => r.psiId) } : {}),
      };
    }),
  };
}
