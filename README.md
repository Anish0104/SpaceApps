# Oxyflame

**How does fire behave in space? Explore NASA combustion experiments and see where the evidence ends.**

NASA Space Apps Challenge 2026: *Flame in Freefall*.

## Try it

| What | Where |
|---|---|
| Website | https://oxyflame.oxyflame.workers.dev |
| Mobile app (installable web app) | https://oxyflame.pages.dev, or scan the QR code below, then "Add to Home Screen" |
| SMS / WhatsApp webhook | Live at `/api/sms` and signature-checked. Demo: `TWILIO_AUTH_TOKEN=… pnpm sms:demo "MOON fabric flammability"` |

<img src="docs/oxyflame-qr.png" alt="QR code for the Oxyflame mobile app at oxyflame.pages.dev" width="160" />

The SMS webhook has no public phone number yet: a real number is pending US carrier registration
(A2P 10DLC) and WhatsApp sender verification. Until then, `pnpm sms:demo` sends a request signed the
same way Twilio signs it and prints the reply.

**A 3-step demo**

1. In the scenario picker, choose **FM2 habitat air** (a Moon habitat, 0.165 g).
2. On **Ask**, type "Would fabric burn differently in a lunar habitat?" and open a citation to see the NASA record behind it.
3. Open **Atlas** for the ranked investigations, then **Missing experiment** for the test that would close the gap.

## The problem

Almost all NASA combustion data comes from orbit (about 0 g) or from Earth (1 g). The Moon (0.165 g)
and Mars (0.38 g) sit in between, with little or no direct data. Partial gravity isn't bounded by
0 g and 1 g results; some materials may burn more readily at partial gravity. Habitat planners need
to know where the evidence ends before they rely on it.

## What Oxyflame does

- **7 crew environments** (Earth, ISS, two Moon cases, pressurized rover, Mars habitat, spacesuit), chosen once in a global scenario picker.
- **Atlas**: the investigations ranked for the chosen scenario. An investigation that documents neither oxygen nor pressure shows **"Cannot assess"** instead of a score.
- **Ask**: an answer in 6 parts: verdict, cited sentences, what differs, limit, next step, scope. Every number is checked against the records it cites. If a check fails, you get a template answer built directly from the records.
- **Referee**: can a difference between two runs be pinned on one variable? Four verdicts: *Can isolate*, *Cannot isolate*, *Can't confirm: missing values*, *No contrast between runs*.
- **Mission lab** and **Missing experiment**: the nearest tested conditions, the evidence map, and the planner's proposed tests (illustrative, not an approved NASA protocol).
- **From space to Earth**: four applications, each with its NASA source: fine water-mist fire extinguishers, a smoke-vs-dust fire detector, firefighter air tanks, firefighter protective clothing.
- **Mobile app** (installable, works offline) and the **SMS / WhatsApp webhook**.

Verdicts and lights rate how strong the evidence is. They never say a material is safe or unsafe.

## How it works

```
data/                  curated NASA records: every value with its source, page and evidence type
   │
packages/engine        ranking, Referee, planner (deterministic TypeScript rules)
   │
apps/worker            Cloudflare Worker: retrieval, Gemini (proposes wording only),
   │                   citation validator, template fallback, answer cache
   ├──► apps/web       website
   ├──► apps/mobile    installable mobile app
   └──► /api/sms       SMS / WhatsApp replies: engine only, no LLM
```

Gemini only proposes an answer. It sees only the retrieved, ID-tagged records, and its answer is used
only if it passes the schema check and every number matches a cited record. Otherwise the template
answer is shown.

## Built on Cloudflare

Everything runs on the free plan, and billing is never enabled. Full details: [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md).

| Cloudflare product | What Oxyflame uses it for |
|---|---|
| **Workers** | The whole answer pipeline: `/api/search`, `/api/ask`, `/api/sms` |
| **Workers static assets** | The website, on the same URL as the API |
| **Workers AI** (`@cf/baai/bge-m3`) | Embeds the records once per data version, and a question only when keyword search finds nothing |
| **Vectorize** | Semantic fallback for questions with no keyword hits |
| **KV** | Cache of validated answers and of question vectors (7 days) |
| **Pages** | The mobile app |

If Workers AI or Vectorize is unavailable, search falls back to keyword results. Free-plan limits we
stay within: 100k Worker requests/day at 10 ms CPU each; static assets free; Workers AI 10k
Neurons/day; KV 100k reads and 1k writes/day.

## The data, and how we checked it

From [data/coverage.json](data/coverage.json) and [data/dataset.json](data/dataset.json), data version 1.3.0:

| Measure | Count |
|---|---|
| Investigations indexed | 25 |
| Investigations with data tables | 20 |
| Runs | 12 |
| Runs verified against their NASA source | 12 of 12 |
| Relationships mapped | 19 |

- Every value carries its source document and page, and an evidence type: **Measured**, **Computed**,
  **Inferred**, **Assumed** or **Unknown**. A missing value is Unknown with a reason, never 0 and never
  guessed. O2 partial pressure is always Computed, with its formula shown.
- **The person who collected a value never verifies it.** Navneet collected the data. Juvana verified it
  independently against the primary NASA PDFs, read directly. Full record: [eval/verification.md](eval/verification.md).
- The audit changed the data. The first check confirmed 3 of 13 runs and flagged 10. Corrections included:
  - A 101.3 kPa pressure that is not in the cited table was removed from the six Saffire I–III runs. It is
    now Unknown (not documented), and so is their computed O2 partial pressure.
  - The two runs attributed to BASS-II were re-attributed. The source labels the 21% O2, 10 cm/s case as
    a **BASS** run (GMT96-T7), and the spread rates that came from a BASS presentation were removed.
  - A second, independent pass then verified all 12 runs.
- All NASA and NTRS sources: [REFERENCES.md](REFERENCES.md).

A gap means "not in our curated dataset", not "never studied". For example, there is no sustained,
spacecraft-based lunar-gravity flame-spread data in PSI.

## How we evaluated (honestly)

From [eval/runs/1.3.0/scores.json](eval/runs/1.3.0/scores.json). Method and history: [eval/README.md](eval/README.md).

| Measure | Result |
|---|---|
| Keyword search (BM25 + synonyms), Top-1 / Top-3 on 18 labelled questions | 8/18 / 12/18 |
| Engine-only (keyword results ranked by the rules engine; shipped), Top-1 / Top-3 | 9/18 / 15/18 |
| Referee on hand-built pairs: correct verdict / correct named reason | 9/9 / 5/5 |
| Adversarial traps caught (kPa vs psi, mole fraction vs partial pressure, burner vs cabin O2, liquid vs solid fuel, missing airflow) | 5/5 |

**Hybrid semantic search** (keyword plus bge-m3 embeddings, fused by `rrf`) was measured on data 1.2.0:
Top-1 4/18 and Top-3 10/18, against 8/18 and 16/18 for keyword plus engine. It lost, so semantic search
ships only as a fallback for questions keyword search can't match. A cosine-fusion version is built but
stays off until it can be judged on a held-out question set.

Caveats:

- The ranking rule (reading the safety role from the question) was added after the first results and
  adjusted three times against these questions. So the engine row measures fit to this set, not
  performance on new questions. Before the rule, the engine ranked worse than keyword (10/18 vs 12/18 Top-3).
- A fresh question set, written by someone who has not seen the rule, is needed before quoting these as results.
- The Referee pairs and traps were written by the engine's author. A second reviewer should check them.
- Grounded-answer metrics against plain RAG (citation precision, unsupported claims, abstention) are not recorded yet.

## Run it locally

```bash
pnpm install
pnpm test                # engine, worker and web tests
pnpm dev:worker          # API on http://localhost:8787
pnpm dev:web:mock        # website on http://localhost:5173 with VITE_MOCK_ASK=1: canned answers, no Gemini calls
```

For real answers, put `GEMINI_API_KEY=…` in `apps/worker/.dev.vars` (gitignored, never committed) and
run `pnpm dev:web` instead. To deploy: [docs/DEPLOY.md](docs/DEPLOY.md) (website and API) and
[docs/DEPLOY-APP.md](docs/DEPLOY-APP.md) (mobile app).

## Repo map

| Path | What it is |
|---|---|
| [apps/web](apps/web) | Website (React, Vite, Tailwind) |
| [apps/mobile](apps/mobile) | Installable mobile app, works offline |
| [apps/worker](apps/worker) | Cloudflare Worker: search, Ask, SMS, citation validator |
| [packages/engine](packages/engine) | Rules engine: schema, units, ranking, Referee, planner |
| [data](data) | Released dataset, scenarios, tolerances, eval questions |
| [ingest](ingest) | Python pipeline: scrape PSI, extract, normalize, release |
| [eval](eval) | Benchmark runs, scores and the verification record |
| [docs](docs) | Contracts, deployment, Cloudflare |

## Limits

- **Not a safety assessment.** Oxyflame rates how much evidence exists and how strong it is, never whether a material is safe.
- **Moon and Mars are not bounded by 0 g and 1 g results.** Fire may behave differently at partial gravity than at either end.
- **Values are only as good as their cited sources.** Each one links to its source so you can check it.
- **The curated dataset is small:** 25 investigations and 12 runs.
- **AI answers are constrained, not neutral.** Every number is checked, but the model still chooses which records to emphasize.

## Team

- **Anish Shirodkar**, AI lead: Ask pipeline, citation validator, Cloudflare Worker, website.
- **Navneet**, data lead: NASA data collection, ingest pipeline, releases.
- **Juvana Khan**, science and evaluation lead: engine, Referee, planner, verification, benchmark, mobile app, SMS.

## Credits and AI use

- Scene photos are NASA public domain: [apps/web/public/scenes/CREDITS.md](apps/web/public/scenes/CREDITS.md)
  and [apps/web/public/journey/CREDITS.md](apps/web/public/journey/CREDITS.md).
- NASA and NTRS sources: [REFERENCES.md](REFERENCES.md).
- AI tools used to build this: AI coding assistants for code and documentation. Inside the app, Google
  Gemini writes the wording of Ask answers, constrained by the citation validator.

Not affiliated with or endorsed by NASA.
