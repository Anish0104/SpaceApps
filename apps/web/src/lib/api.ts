import type { AskResponse, RankedResult, SearchRequest } from "@flameatlas/engine";
import { dataset } from "./data";

/**
 * UI development only (`pnpm dev:web:mock`): api.ask() returns canned MOCK answers from ./mockAsk
 * and never calls the worker, so no Gemini quota is spent.
 */
export const MOCK_ASK = import.meta.env.VITE_MOCK_ASK === "1";

/**
 * Where the worker lives. Empty in local dev, so "/api/..." goes through the Vite proxy to
 * localhost:8787. The production build sets it in apps/web/.env.production (the workers.dev URL).
 */
export const API_BASE = String(import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
