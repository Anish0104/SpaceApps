# FlameAtlas

Mission-aware fire-safety intelligence from NASA's microgravity combustion data.
NASA Space Apps Challenge 2026: Flame in Freefall.

FlameAtlas ranks NASA's 24 PSI combustion investigations for a chosen crew environment
(spacecraft, station, Moon, Mars, rover), shows which results can fairly be compared, and
names the experiment that would close the gap. Every number links to its NASA source.

> We don't tell NASA a material is safe. We show what the evidence supports, and what to test next.

## Repository layout

```
ingest/            Python, offline: scrape PSI, parse PDFs, extract, normalize, release
data/              fixtures, scenarios, tolerances, synonyms, eval questions, releases
packages/engine/   TypeScript rules engine: schema, units, ranking, Referee (+ Vitest)
apps/web/          React + Vite frontend
apps/worker/       Cloudflare Worker: /api/search, /api/ask, citation validator
eval/              baselines and scoring scripts
docs/CONTRACTS.md  the three contracts everyone builds against
```

## Quick start

```bash
# JavaScript (Node 20+, pnpm 9+)
pnpm install
pnpm test            # engine unit tests
pnpm dev:web         # frontend on http://localhost:5173 (uses data/fixtures.json)
pnpm dev:worker      # worker on http://localhost:8787

# Python (3.11+)
cd ingest
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
python scrape_psi.py --ids PSI-26            # try one investigation first
python scrape_psi.py --all                   # all 24
```

## Data rules

- PSI is the source of record (cite each investigation's DOI). NTRS reports supply run conditions.
- Every value carries a source and page. Missing values are `null` with a reason, never zero.
- Whoever collects a number never verifies it.
- `data/fixtures.json` contains **fake values for UI development only**. Never cite it.

## Non-claims

FlameAtlas never rates a material safe or unsafe, never assumes the Moon falls between Earth
and orbit, never transfers results across materials without evidence, and never predicts FM2 results.

## Sources

- PSI Combustion Science: https://psi.nasa.gov/physci/repo/search?q=&data_source=psi&data_type=investigation
- NASA PSI on the AWS Registry of Open Data: https://registry.opendata.aws/nasa-psi
- Challenge: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/
