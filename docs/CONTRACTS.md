# The three contracts

Everyone builds against these. Change them only together, in one PR, and tell the team.

## 1. Data format: `dataset.json`

- TypeScript (source of truth): `packages/engine/src/schema.ts` (Zod)
- Python mirror: `ingest/schema.py` (Pydantic)
- Example: `data/fixtures.json` (FAKE values, `"fixture": true`; never cite)

Key rules:

- Every numeric field is a `Value`: `{ value, unit, type, sourceId, page via source, missingReason? }`
- `type` is one of `MEASURED | COMPUTED | ASSUMED | INFERRED | UNKNOWN`. Never show `ASSUMED` as evidence.
- Missing = `value: null` + `missingReason: "not_documented" | "not_applicable"`. Never 0.
- `o2PartialKPa` is always `COMPUTED` with its formula.
- `collectedBy` and `verifiedBy` must be different people. `status: "verified"` only after the cross-check.

## 2. `search(query, scenarioId, filters) -> RankedResult[]`

Request (`SearchRequest` in `packages/engine/src/contracts.ts`):

```json
{ "query": "fabric flame spread", "scenarioId": "moon-challenge",
  "filters": { "safetyRole": null, "fuelPhase": "solid", "hardware": null }, "limit": 24 }
```

Response: `RankedResult[]` (`packages/engine/src/ranking.ts`):

```json
[{ "psiId": "PSI-26", "score": 0.71,
   "contributions": { "M": 0.21, "F": 0.2, "Q": 0.15, "D": 0.15, "C": 0.1 },
   "reasons": ["SAME_MATERIAL", "GRAVITY_DIFFERS"], "notDocumented": [], "cannotAssess": false }]
```

`score: null` + `cannotAssess: true` means O2 and pressure are both undocumented: show
"cannot assess applicability", never a number. The score is relevance, never fire risk.

## 3. `POST /api/ask`

Request: `{ "question": "...", "scenarioId": "moon-fm2", "dataVersion": "v1.0" }`

Response (`AskResponse`), the six beats:

```json
{
  "status": "answered",
  "verdict": "yellow",
  "sentences": [{ "text": "BASS (PSI-26) burned SIBAL fabric in orbit.", "recordIds": ["PSI-26"] }],
  "differs": ["gravity: orbit vs 0.165 g"],
  "limit": "No curated run at lunar gravity; these are analogs.",
  "next": { "kind": "missing_experiment", "target": "SIBAL at 0.165 g" },
  "scope": "In our curated dataset; illustrative, not an approved NASA plan.",
  "missingFields": [],
  "source": "llm",
  "dataVersion": "v1.0"
}
```

- `verdict` = evidence strength (green / yellow / red), never safety.
- Every number in `sentences[].text` must match a stored value on a cited record, or the validator drops the sentence.
- `recordIds` holds run / investigation / source ids. It may also include `"SCENARIO:<id>"` (only the
  request's own scenario): that marks ASSUMED scenario inputs (O2 as percent or fraction, pressure in
  kPa / psi / atm, gravity, and the COMPUTED O2 partial pressure), never evidence. The UI must not style
  it as a measured source.
- Numbers in `limit`, `differs[]` and `next.target` must match a value on a record sent to the LLM or an
  ASSUMED value of the request's scenario. Otherwise `limit` becomes "Among tracked conditions only.",
  the `differs` item is dropped, and `next.target` is dropped (`next.kind` is kept).
- `source` tells the UI whether the answer came from the LLM, the template fallback, or the cache.

## Scenario ids

`earth`, `iss`, `moon-challenge`, `moon-fm2`, `rover`, `mars`, `suit` (see `data/scenarios.json`).
