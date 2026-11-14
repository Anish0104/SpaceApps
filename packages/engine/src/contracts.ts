/**
 * Contracts 2 and 3: search() and POST /api/ask. Shared by web and worker.
 */
import { z } from "zod";
import { SafetyRole } from "./schema";

// ---- Contract 2: search(query, scenarioId, filters) -> RankedResult[] ----
export const SearchRequest = z.object({
  query: z.string().default(""),
  scenarioId: z.string(),
  filters: z
    .object({
      safetyRole: SafetyRole.nullable().default(null),
      fuelPhase: z.enum(["solid", "liquid", "gas", "aerosol"]).nullable().default(null),
      hardware: z.string().nullable().default(null),
    })
    .default({}),
  limit: z.number().int().positive().max(50).default(24),
});
export type SearchRequest = z.infer<typeof SearchRequest>;
// Response: RankedResult[] (see ranking.ts)

// ---- Contract 3: POST /api/ask -> six-beat answer ----
export const AskRequest = z.object({
  question: z.string().min(3),
  scenarioId: z.string(),
  dataVersion: z.string(),
});
export type AskRequest = z.infer<typeof AskRequest>;

export const AskSentence = z.object({
  text: z.string(),
  // run/investigation/source ids; empty only for non-factual sentences. May also include
  // "SCENARIO:<id>" (the request's scenario): ASSUMED scenario inputs, never evidence.
  recordIds: z.array(z.string()),
});

export const AskResponse = z.object({
  status: z.enum(["answered", "cannot_confirm"]),
  verdict: z.enum(["green", "yellow", "red"]), // evidence strength, never safety
  sentences: z.array(AskSentence),            // beat 2: receipts
  differs: z.array(z.string()),               // beat 3: what differs or is missing
  limit: z.string(),                          // beat 4: honest limit
  next: z.object({                            // beat 5: bridge to action
    kind: z.enum(["missing_experiment", "evidence_now", "none"]),
    target: z.string().optional(),
  }),
  scope: z.string(),                          // beat 6: scoped wording
  missingFields: z.array(z.string()).default([]),
  source: z.enum(["llm", "template", "cache"]),
  dataVersion: z.string(),
});
export type AskResponse = z.infer<typeof AskResponse>;
