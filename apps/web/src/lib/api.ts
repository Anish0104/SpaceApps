import type { AskResponse, RankedResult, SearchRequest } from "@flameatlas/engine";
import { dataset } from "./data";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  search: (req: Partial<SearchRequest> & { scenarioId: string }) => post<RankedResult[]>("/api/search", req),
  ask: (question: string, scenarioId: string) =>
    post<AskResponse>("/api/ask", { question, scenarioId, dataVersion: dataset.version }),
};
