# Deploying FlameAtlas (free tier only)

FlameAtlas is **one Cloudflare Worker** on the **Workers Free** plan. It serves the website (Workers static
assets, from `apps/web/dist`) and the API (`/api/*`) from the same URL:

```
https://flameatlas.<your-subdomain>.workers.dev
```

Gemini is the **AI Studio free tier**. Workers AI, Vectorize and KV are on their free allocations. Nothing here
enables billing; don't add a payment method or paid add-ons. See [CLOUDFLARE.md](CLOUDFLARE.md) for every
Cloudflare product used and the free-plan limits.

Run every command from the repo root. Wrangler (4.86, the last release that runs on Node 20) comes from the
worker package, so it is called as `pnpm --filter @flameatlas/worker exec wrangler ...`.

> **`pnpm run deploy`, not `pnpm deploy`.** `pnpm deploy` is a built-in pnpm command (it copies a workspace
> package somewhere) and ignores our script.

| Step | Once or every time | Gemini calls | Workers AI calls |
|---|---|---|---|
| 0. Log in to Cloudflare | once | 0 | 0 |
| 1. One-time resources (Vectorize index, KV namespace) | once, already done | 0 | 0 |
| 2. Store the Gemini key | once | 0 | 0 |
| 3. Build and deploy | every release | 0 | 0 |
| 4. Smoke test | after each deploy | 0 | 0 to 1 |
| 5. Re-index after a data release | each new data version | 0 | 2 + 2 |

## 0. Log in to Cloudflare (once)

```bash
pnpm --filter @flameatlas/worker exec wrangler login
pnpm --filter @flameatlas/worker exec wrangler whoami
```

## 1. One-time resources (already created for this account)

Listed so a fresh account can be set up. Each is referenced from `apps/worker/wrangler.toml`.

```bash
# Vectorize index + the metadata index used to filter by data version (create the metadata index BEFORE any vectors)
pnpm --filter @flameatlas/worker exec wrangler vectorize create flameatlas-records --dimensions=1024 --metric=cosine
pnpm --filter @flameatlas/worker exec wrangler vectorize create-metadata-index flameatlas-records --property-name=dataVersion --type=string

# KV namespace for the answer cache and the query-vector cache; paste the printed id into wrangler.toml [[kv_namespaces]]
pnpm --filter @flameatlas/worker exec wrangler kv namespace create ANSWERS

# Embed the corpus and upsert it (needs `pnpm dev:worker` running; 2 Workers AI calls for data 1.2.0)
pnpm index:vectors
```

## 2. Store the Gemini key as a secret (once)

```bash
pnpm --filter @flameatlas/worker exec wrangler secret put GEMINI_API_KEY
```

Paste the key when asked. It is stored encrypted by Cloudflare and never goes in `wrangler.toml` or git
(`apps/worker/.dev.vars` is only for `pnpm dev:worker` and is gitignored). If Wrangler says the Worker
`flameatlas` does not exist yet, answer **yes** to create it.

## 3. Build and deploy

```bash
pnpm run deploy
```

This builds `apps/web` (into `apps/web/dist`) and runs `wrangler deploy`, which uploads the Worker and the
static assets together. The first time, if your account has no workers.dev subdomain yet, Wrangler asks you
to pick one: that is the `<your-subdomain>` part of the URL. Note the URL it prints.

How requests are routed (all in `apps/worker/wrangler.toml`):

- `/api/*` runs the Worker (`run_worker_first = ["/api/*"]`).
- Every other path is a static file from `apps/web/dist`. A path that is not a file (a deep link such as
  `/investigation/PSI-98` or `/dashboard`) gets `index.html` (`not_found_handling = "single-page-application"`),
  and the app's router takes over.
- Static asset requests are free and do not count against the Workers request limit.

The site calls the API on its own origin (`/api/...`), so production needs no CORS setup: `VITE_API_BASE` in
`apps/web/.env.production` stays empty and `ALLOWED_ORIGIN` stays `""`. Both still work for local
development (`pnpm dev:web` on `http://localhost:5173` is always allowed).

To redeploy the Worker without rebuilding the site (for example after changing a var): `pnpm deploy:worker`.

### Custom domain (later)

When a domain is on this Cloudflare account, uncomment the `routes` line in `apps/worker/wrangler.toml`, set
the hostname, and run `pnpm run deploy` again:

```toml
routes = [{ pattern = "flameatlas.example.org", custom_domain = true }]
```

## 4. Smoke test

```bash
SITE=https://flameatlas.<your-subdomain>.workers.dev

# API: expect {"ok":true,"dataVersion":"1.2.0","fixture":false,"gemini":true,...}
curl -s $SITE/api/health

# Site and a deep link: expect 200 and text/html for both
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" $SITE/
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" $SITE/investigation/PSI-98

# An unknown API path stays an API 404 (JSON), not the website
curl -s -w " %{http_code}\n" $SITE/api/nope

# Dev routes (they spend quota) exist only on localhost: expect 404
curl -s -o /dev/null -w "%{http_code}\n" -X POST $SITE/api/dev/warm-cache

# Retrieval mode for a question (0 Gemini calls: /api/search never calls Gemini).
# Expect "x-flameatlas-retrieval: keyword". A question with no keyword hits shows "semantic-fallback"
# (1 Workers AI call the first time, then cached in KV for 7 days).
curl -s -D - -o /dev/null -X POST -H "Content-Type: application/json" \
  -d '{"query":"fabric flame spread","scenarioId":"moon-challenge"}' $SITE/api/search | grep -i x-flameatlas-retrieval
```

Then open `$SITE` in a browser. The landing page, dashboard, Research atlas, Mission lab, Referee and the
investigation pages make **no** Gemini calls (they use the dataset bundled into the site). On the Ask page,
a demo question that is in `data/cache/demo-answers.json` for data version `1.2.0` is served from the cache
(0 calls). Any other question costs one Gemini request per model tried (1, or up to 3 if models are out of
quota); validated answers are cached in KV for 7 days.

Logs from the live Worker (retrieval mode, fallbacks, Gemini failures):

```bash
pnpm --filter @flameatlas/worker exec wrangler tail
```

## 5. After a data release (for example 1.3.0)

The scripts read the version from `data/dataset.json`; nothing else needs editing except `DATA_VERSION` in
`wrangler.toml`.

```bash
pnpm dev:worker                 # in another terminal (holds the AI binding for the embedding scripts)
pnpm index:vectors --dry-run    # shows the Workers AI calls it will make
pnpm index:vectors              # embeds new/changed documents, upserts them into Vectorize for the new version
pnpm eval:embed                 # embeds the eval questions for the new version
pnpm eval:rank && pnpm eval:score
pnpm run deploy
```

Old versions' vectors stay in the index; queries are filtered to the served `DATA_VERSION`.

## Local development

```bash
pnpm dev:worker   # http://localhost:8787  (API only)
pnpm dev:web      # http://localhost:5173  (site; /api is proxied to 8787)
```

Wrangler 4 reaches Workers AI through a remote connection, which needs the workers.dev subdomain from step 3,
so `pnpm dev:worker` works after the first deploy. Local dev has no Vectorize index, so semantic paths fall
back to keyword there (logged); add `remote = true` to the `[[vectorize]]` block to query the real index.

## Free-tier notes

See [CLOUDFLARE.md](CLOUDFLARE.md#free-plan-limits). In short: Workers Free allows 100,000 requests per day
and 10 ms of CPU per request (waiting on Gemini, Workers AI or Vectorize does not count); Workers AI has a
daily free allocation and stops, never bills, when it runs out; the Gemini free tier is about 20 requests
per day per model on this key, so use the demo cache for demos.

## Rolling back

```bash
pnpm --filter @flameatlas/worker exec wrangler deployments list
pnpm --filter @flameatlas/worker exec wrangler rollback          # previous version (site and API together)
```

A Worker named `flameatlas-api` from the earlier two-part setup is no longer used. If it exists on the
account, it can be removed with `pnpm --filter @flameatlas/worker exec wrangler delete --name flameatlas-api`.
