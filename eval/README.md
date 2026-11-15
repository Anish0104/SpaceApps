# Evaluation

Owner: Juvana. Questions: Navneet (`data/eval/questions.json`, frozen before tuning search).

Systems compared on the same questions:

1. Keyword: MiniSearch BM25 (+ synonyms)
2. Hybrid: keyword + bge-m3 semantic scores (Workers AI, Vectorize), fused by `rrf()` and fed into the rules engine (`apps/worker/src/semantic.ts`); measured below, not shipped
3. Plain RAG: top-k records + LLM, no rules or validator (`apps/worker/src/plainRag.ts`)
4. FlameAtlas: search + rules engine + citation validator (`apps/worker/src/ask.ts`)

Report Top-1 / Top-3, citation precision, unsupported-claim count, correct abstentions, Referee
accuracy, adversarial catches, skeptic catches. Always with sample size, denominator and failures.

## Producing the raw outputs

| Command | Gemini requests | What it writes |
|---|---|---|
| `pnpm eval:rank` | 0 (offline, no worker needed) | `eval/runs/<data-version>/ranking.json` |
| `pnpm eval:record --dry-run` | 0 | nothing (prints the plan) |
| `pnpm eval:record` | at most `--max-calls` (default 10) | `eval/runs/<data-version>/<system>/<qid>.json` |

`pnpm eval:record` needs `pnpm dev:worker` running (it holds the key). It asks each question once per
system: `flameatlas` (the real pipeline with every cache bypassed) and `plain_rag` (same records, same
models, prompt "Answer the question using the records below.", no scenario block, no validator, no
template fallback). Each system normally costs 1 request per question; a model that is out of quota
makes it try the next one (up to 3). The full set is 24 questions x 2 systems = **48 requests at best**,
so with the free tier (about 20 per model per day) record it over three days or more, 10 requests per run:

```bash
pnpm eval:record --dry-run                  # see the plan
pnpm eval:record --questions q1,q2,q3,q4,q5 # 10 requests at best
pnpm eval:record                            # each later run: only the missing ones are asked, up to 10
```

Already-recorded outputs are skipped. Nothing is retried. An output is saved only if a Gemini model
answered (a quota failure is not a result); FlameAtlas answers that the validator rejected and
replaced with the template **are** saved, because that is what the system shows.

Scenario: each question is asked under its own `scenarioId` if it has one, else `--scenario <id>`,
else `moon-challenge`. Both systems always see the same scenario and the same records.

### What each file holds

```jsonc
{
  "qid": "q3", "system": "plain_rag", "question": "...", "scenarioId": "moon-challenge",
  "dataVersion": "1.2.0", "recorded": true, "model": "gemini-3.8-flash", "callsUsed": 1,
  "systemPrompt": "Answer the question using the records below.",
  "records": "[PSI-98] Saffire-I ...\n  [SAF-I-1] run of PSI-98 ...",   // exactly what Gemini saw
  "recordIds": ["PSI-98", "SAF-I-1", "..."],                              // ids in those records
  "output": { "status": "answered", "sentences": [ ... ], ... },          // raw (plain_rag) or final (flameatlas)
  "log": ["ask: dropped \"...\" (number 99 not in cited records)"]        // flameatlas: what the validator removed
}
```

## Scoring

All scoring is offline: it reads the saved files and the dataset, and never calls Gemini.

### One command

```bash
pnpm eval:rank    # refresh ranking.json after any ranking change
pnpm eval:score   # offline; prints the table and writes eval/runs/<data-version>/scores.json
```

`pnpm eval:score` (`apps/worker/src/evalScore.ts`) never calls Gemini. It reports, each with its
denominator and failures:

- **Top-1 / Top-3** for keyword and FlameAtlas, and which questions were left out and why.
- **Referee**: verdict and named reason on the hand-built pairs (`data/demo-pairs.json` plus
  `data/eval/referee-pairs.json`). The expected answers were worked out from the documented run
  conditions, not read from the engine; a second person should review them before they are quoted.
- **Adversarial**: the five traps (kPa vs psi, mole fraction vs partial pressure, CFI-G burner O2 vs
  cabin O2, liquid vs solid fuel, missing airflow). Three spring the trap on purpose with altered
  copies of real records (CFI-G with its burner range entered as chamber air, a run marked liquid, a
  run with airflow removed); the output marks them "synthetic". They are written by the engine's
  author, so they show the rules behave as intended, not that they generalise.
- **Recorded answers**, per system, once `pnpm eval:record` has saved any: unsupported sentences shown,
  off-record citations, what FlameAtlas's validator caught, malformed answers, correct abstentions.

Skeptic catches are not scored yet (the skeptic AI is not connected).

Known limit of the number check: the validator reads the "-2" in a run name such as "Saffire VI-2" or
"SAF-IV-1" as a number, so a sentence that names a run that way is counted as unsupported. This affects
both systems' scores until the validator ignores run names.

### Unsupported numbers per answer

Run the citation validator over each saved answer, against the dataset version in the file:

```ts
import { Dataset, Scenario } from "@flameatlas/engine";
import { validateSentences } from "../apps/worker/src/validator";

const { dropped } = validateSentences(ds, out.output.sentences ?? [], scenario);
const unsupported = dropped.length;                      // sentences with an untraceable number or unknown id
const offRecord = (out.output.sentences ?? []).filter((s) =>
  s.recordIds.some((id) => !id.startsWith("SCENARIO:") && !out.recordIds.includes(id))).length; // cites ids Gemini was not sent
```

Report two numbers for FlameAtlas, because its saved output is already validated:

- **shown to the user**: `validateSentences` on `output` (0 by construction; a non-zero value is a bug), and
- **caught by the validator**: the `dropped "..."` lines in `log`.

For plain RAG, `output` is raw: count it as is. If its JSON does not have `sentences`, count the answer
as malformed (do not repair it).

### Correct abstention

Compare `output.status` with the question's `expect`. A correct abstention is `"cannot_confirm"` where
`expect` is `"cannot_confirm"`. In the frozen file that is **q1, q10, q18 and q20**. **q5** is labelled `expect: "answered"`
with `use: "honest_limit"`: it should answer, but say that lunar or Mars gravity is not covered (score
its `limit`, not its status). Confirm with Navneet before scoring q5 as an abstention.

### Top-1 / Top-3 from ranking.json

`ranking.json` has, per question, the top-5 `keyword` and `flameatlas` psiIds and the labelled
`relevantPsiIds`. A question is a Top-k hit if any relevant id is in the first k. Questions with no
labelled relevant ids are left out of the denominator; say so. `relevantNotInDataset` lists labelled ids
that are not in the dataset: no system can rank them, so report Top-k both with and without those
questions. In data `1.1.0` and `1.2.0` it is empty for every question (1.0.0-seed lacked PSI-69, PSI-101, PSI-47).

Seen in the `1.1.0` ranking (`eval/runs/1.1.0/ranking.json`): on the detection questions (q7, q11, q12,
q21) keyword search puts PSI-102 / PSI-101 / PSI-47 in its top 3, while FlameAtlas fills its top 4 with
investigations that have run data (SAFFIRE-IVVI, PSI-98, PSI-25, PSI-100), because the scenario match
and completeness outweigh the question match. Worth reporting as a failure, not tuning away before the
questions are frozen. The `1.0.0-seed` ranking is kept for comparison. The `1.2.0` ranking
(`eval/runs/1.2.0/ranking.json`) has the same top-5 lists as `1.1.0` for every question, and the same scores.

Update (branch `juvana`): that failure is reported, and one rule was then changed *after* seeing it.
When no safety-role filter is set, the ranking now reads the role from the question's own words
(`inferSafetyRole` in `packages/engine/src/ranking.ts`: smoke / detector / dust mean detection, extinguish
means suppression, and so on; a question naming none or more than one role is left alone, and the
flame-physics terms "smoke point" and "re-ignite" are not read as role words). Weights are unchanged.
Against the labelled investigations' roles the rule is right on 7 of the 7 questions where it names a
role and labels exist; it names no role on q14 and q16, which FlameAtlas still misses. On the 18 questions with labelled ids:

| System | Top-1 | Top-3 | Top-3 misses |
|---|---|---|---|
| Keyword | 8/18 | 12/18 | q2, q8, q14, q16, q19, q24 |
| FlameAtlas before the rule (ranking.json on `main` at 20c9886) | 6/18 | 10/18 | q7, q11, q12, q14, q15, q16, q17, q21 |
| FlameAtlas with the rule, data before the verification fixes | 10/18 | 14/18 | q14, q15, q16, q17 |
| FlameAtlas with the rule, after the data corrections | 7/18 | 13/18 | q13, q14, q15, q16, q17 |
| FlameAtlas with the rule extended to flame physics and extinction (current ranking.json) | 8/18 | 16/18 | q14, q15 |

The last row is the one that describes the shipped system. The row above it shows what two data changes did: SAME / SAME-R / DAFT
lost their O2 and pressure ranges (not source-backed), and verification removed the inferred 101.3 kPa
from the six Saffire I-III runs. Investigations whose O2 and pressure are both undocumented still show
"Cannot assess", and are placed by their documented terms (question, role, fuel, completeness) rescaled
without the mission-match term (`sortKey` in `ranking.ts`); without that they would all rank last.

The rule was then extended, again after seeing the misses: a question in flame-physics terms (cool
flames, diffusion flames, electric field, soot, smoke point, gas jet) and no other role's words is a
physics question, and "extinction" counts as a suppression word. Against the labelled investigations'
roles the rule is right on all 10 questions where it names a role and labels exist.

**How to read these numbers.** The rule has now been adjusted three times against these 24 questions,
so the current row measures how well the rule fits this set, not how it would do on new questions. The
honest claims are: (1) before any change FlameAtlas ranked worse than keyword search (10/18 vs 12/18
Top-3), because the mission-match term outweighed the question; (2) reading the safety role from the
question fixes that on this set; (3) a fresh set of questions, written by someone who has not seen the
rule, is needed before quoting 16/18 as a result.

Quote the "before the rule" row and the current row, and say the rule came after the first ranking. A higher question weight
(0.25 to 0.40, renormalised) was also tried: 9/18 and 13/18, with a new miss on q19, so it was not adopted.

### Hybrid semantic search (data 1.2.0)

Added after the rows above: `@cf/baai/bge-m3` embeddings (Workers AI) of one document per investigation and
per run (`apps/worker/src/corpus.ts`), the top 20 by cosine (Vectorize in production; computed offline here
from `data/cache/embeddings-1.2.0.json` and `data/cache/eval-query-embeddings-1.2.0.json`), run hits
counted for their investigation, fused with the keyword scores by the existing `rrf()` (k = 60), and fed into
the same rules engine as the question score. Same 18 labelled questions; `pnpm eval:rank && pnpm eval:score`.
Workers AI calls: 2 to embed the 38 corpus documents, 2 to embed the 24 questions; none at scoring time.

| System | Top-1 | Top-3 | Top-1 misses | Top-3 misses |
|---|---|---|---|---|
| Keyword | 8/18 | 12/18 | q2, q4, q8, q14, q15, q16, q17, q19, q22, q24 | q2, q8, q14, q16, q19, q24 |
| Engine-only (keyword into the engine; shipped) | 8/18 | 16/18 | q2, q4, q8, q14, q15, q16, q17, q19, q22, q24 | q14, q15 |
| Hybrid (keyword + bge-m3, `rrf`, into the engine) | 4/18 | 10/18 | q3, q4, q6, q7, q9, q11, q12, q14, q15, q16, q17, q21, q22, q24 | q7, q11, q12, q14, q15, q16, q17, q21 |

Referee 10/10 (named reason 5/5) and adversarial traps 5/5 are unchanged: neither uses retrieval scores.

**Result: hybrid is worse, so it is not used.** `SEARCH_MODE = "keyword"` in `apps/worker/wrangler.toml`. The
hybrid code path stays in the worker behind that switch (with its keyword fallback), so it can be re-measured.

Why, from the cached vectors (a diagnosis, not a change):

- The embeddings themselves retrieve well. bge-m3 alone (top-20 by cosine, no engine) gets **Top-1 10/18,
  Top-3 14/18**, the best Top-1 of any system here; it ranks the labelled investigation first on q7, q16 and
  q17, which Hybrid misses.
- The loss comes from the fusion. `rrf()` turns ranks into nearly flat scores (in one list of 18, rank 1
  normalises to 1.00 and rank 18 to 0.78), and the semantic top 20 covers a median of 20 of the 25
  investigations. So almost every investigation gets a question score between about 0.78 and 1, and the
  engine's scenario-match and completeness terms decide the order: SAFFIRE-IVVI, PSI-25 and PSI-20, the
  investigations with run data, come out on top for nearly every question.

Nothing was tuned to these questions. A different fusion (for example passing cosine scores, or a rank scale
that keeps its spread, instead of `rrf`) is the obvious next step, but it would be designed after seeing these
18 questions, so it must be checked on questions that were not used to choose it before it is quoted or
switched on.

### What ships now, and what is still to be measured

- **Semantic fallback (on).** In `keyword` mode, a question with no keyword hits at all gets the Vectorize
  results instead of an empty list (`X-FlameAtlas-Retrieval: semantic-fallback`). Every question in
  `data/eval/questions.json` has keyword hits (a test checks this), so the benchmark above is unchanged by it.
- **Hybrid-cosine (built, off).** `SEARCH_MODE = "hybrid-cosine"` fuses by averaging the keyword score with
  the min-max-normalised cosine score instead of `rrf()`. It was designed after seeing the 18 questions above,
  so its numbers on them are not quoted (`pnpm eval:score` leaves it out on the development set). It will be
  judged on held-out questions:

  ```bash
  pnpm dev:worker                            # another terminal; holds the AI binding
  pnpm eval:embed data/eval/heldout.json     # 1 Workers AI call per 20 new questions
  pnpm eval:score data/eval/heldout.json     # offline; writes eval/runs/<version>/scores-heldout.json
  ```

  `pnpm eval:score [file]` scores any question file in the same format; with no argument it scores the
  development set and also reports the recorded answers.

**These numbers are for data 1.2.0. They will be re-run on 1.3.0** (`pnpm index:vectors`, `pnpm eval:embed`,
`pnpm eval:rank`, `pnpm eval:score`; the scripts read the version from `data/dataset.json`).
