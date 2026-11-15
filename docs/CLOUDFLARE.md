# FlameAtlas on Cloudflare

All of FlameAtlas runs as one Cloudflare Worker on the **Workers Free plan**. Billing is never enabled: when
a free allocation runs out, the product stops answering (and FlameAtlas falls back), it does not charge.
How to deploy: [DEPLOY.md](DEPLOY.md).

## One slide

| Cloudflare product | What FlameAtlas uses it for | If it is unavailable |
|---|---|---|
| **Workers** | The whole answer pipeline: `/api/search` and `/api/ask` (keyword retrieval, the rules engine, Gemini proposal, Zod + citation validator, template fallback) | — (this is the app) |
| **Workers static assets** | The website (`apps/web/dist`) on the same URL; deep links get `index.html` | — |
| **Workers AI** (`@cf/baai/bge-m3`) | Embeds the 38 records (offline, once per data version) and a question (only when keyword search finds nothing) | Keyword results only |
| **Vectorize** (`flameatlas-records`, 1024-d cosine) | Semantic fallback for questions with no keyword hits. Hybrid fusion was measured honestly: `rrf` scored 4/18 Top-1 vs 8/18 for keyword, so it is off; a cosine fusion is built and off, to be judged on held-out questions | Keyword results only |
| **KV** (`ANSWERS`) | Cache of validated answers and of question vectors (7 days) | Recomputed each time |
| **Free plan** | 100k Worker requests/day, 10 ms CPU each; static assets free; Workers AI 10k Neurons/day; KV 100k reads, 1k writes/day | Stops, never bills |

## Request flow

```
browser ──► flameatlas.<subdomain>.workers.dev
             ├─ /api/*  ──► Worker
             │              ├─ keyword search (MiniSearch, bundled)      ─┐
             │              ├─ [no hits] Workers AI embed ─► Vectorize ──┤─► rules engine ranking
             │              │      (question vector cached in KV)        ─┘
             │              └─ /api/ask: KV answer cache ─► Gemini proposes ─► validator ─► answer or template
             └─ anything else ──► static assets (the React site; SPA fallback to index.html)
```

`SEARCH_MODE` in `apps/worker/wrangler.toml` picks how semantic results are used:

| `SEARCH_MODE` | Behaviour | Status |
|---|---|---|
| `keyword` | Keyword only; semantic results only when keyword finds nothing (`semantic-fallback`) | **shipped** |
| `hybrid` | Keyword + semantic fused by `rrf()` | measured on data 1.2.0: Top-1 4/18, Top-3 10/18 (keyword 8/18, 12/18). Off |
| `hybrid-cosine` | Keyword score averaged with min-max-normalised cosine | built, off; not quoted on the 18 development questions it was designed after; judged on `data/eval/heldout.json` |

Every response says which path it took in the `X-FlameAtlas-Retrieval` header. Any Workers AI or Vectorize
failure, missing binding, or a semantic step slower than 1.5 s falls back to keyword results; it is logged and
never fails the request. The `/api/ask` request and response shapes, the six-part answer, the citation
validator and the template fallback do not depend on the search mode: search only changes which records are
retrieved.

## Free-plan limits

Figures are Cloudflare's published free allocations at the time of writing; check the dashboard if in doubt.

| Product | Free allocation | FlameAtlas usage |
|---|---|---|
| Workers | 100,000 requests/day; 10 ms CPU per request (time waiting on Gemini, Workers AI or Vectorize is not CPU) | One request per search or question; the site's pages do not call the API |
| Static assets | Requests are free and unlimited; up to 20,000 files, 25 MiB each | 57 files, about 90 KiB gzipped |
| Workers AI | 10,000 Neurons/day | Indexing a data version takes 2 calls (38 documents on 1.2.0); benchmark questions 2 calls; live only on a keyword miss, once per question per 7 days |
| Vectorize | Free tier covers millions of stored and queried dimensions per month | 38 vectors × 1024 dimensions per data version |
| KV | 100,000 reads/day, 1,000 writes/day, 1 GB | One read per question; writes only for new answers and new question vectors |

Gemini (Google AI Studio free tier, about 20 requests per day per model on this key) is outside Cloudflare;
the Ask page's demo questions are served from a cache so a demo spends none of it.
