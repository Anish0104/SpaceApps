import type { AskResponse, RankedResult, SearchRequest } from "@flameatlas/engine";
import { dataset } from "./data";

/**
 * UI development only (`pnpm dev:web:mock`): api.ask() returns canned MOCK answers from ./mockAsk
 * and never calls the worker, so no Gemini quota is spent.
 */
export const MOCK_ASK = import.meta.env.VITE_MOCK_ASK === "1";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  search: (req: Partial<SearchRequest> & { scenarioId: string }) => post<RankedResult[]>("/api/search", req),
  ask: async (question: string, scenarioId: string): Promise<AskResponse> => {
    if (MOCK_ASK) return (await import("./mockAsk")).mockAsk(question); // MOCK, not a real answer
    return post<AskResponse>("/api/ask", { question, scenarioId, dataVersion: dataset.version });
  },
};
