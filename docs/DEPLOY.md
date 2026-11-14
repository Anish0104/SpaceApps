# Deploying FlameAtlas (free tier only)

The worker goes to **Cloudflare Workers Free** and the web app to **Cloudflare Pages** (free). Gemini is
the **AI Studio free tier**. Nothing here enables billing; don't add a payment method or paid add-ons.

Run every command from the repo root. Wrangler comes from the worker package, so it is called as
`pnpm --filter @flameatlas/worker exec wrangler ...`.

| Step | Uses Cloudflare login | Gemini calls |
|---|---|---|
| 0. Log in | yes | 0 |
| 1. Store the Gemini key | yes | 0 |
| 2. Deploy the worker | yes | 0 |
| 3. Create the Pages project | yes | 0 |
| 4. Point the two halves at each other, redeploy the worker | yes | 0 |
| 5. Deploy the web app | yes | 0 |
| 6. Smoke test | no | 0 for curl; **each new question asked on the live site may use 1 to 3** |

## 0. Log in to Cloudflare (once)

```bash
pnpm --filter @flameatlas/worker exec wrangler login
```

Opens a browser to authorise Wrangler on your free account.

## 1. Store the Gemini key as a worker secret

```bash
pnpm --filter @flameatlas/worker exec wrangler secret put GEMINI_API_KEY
```

Paste the key when asked. It is stored encrypted by Cloudflare and never goes in `wrangler.toml` or git.
(`apps/worker/.dev.vars` is only for `pnpm dev:worker` and is gitignored.) If Wrangler says the worker
does not exist yet, answer yes to create it, or run step 2 first and then this step.

## 2. Deploy the worker

```bash
pnpm deploy:worker
```

Note the URL it prints: `https://flameatlas-api.<your-subdomain>.workers.dev`. The first time, Wrangler
may ask you to pick the `<your-subdomain>` part for workers.dev.

The bundle is about 273 KiB (52 KiB gzipped) against the Workers Free limit of 3 MB gzipped. The dataset
(`data/dataset-v1.0.json`), scenarios and the demo-answer cache are bundled into it; nothing is fetched at
runtime except Gemini.

## 3. Create the Pages project (once)

```bash
pnpm --filter @flameatlas/worker exec wrangler pages project create flameatlas --production-branch main
```

Your site will be `https://flameatlas.pages.dev`. If the name is taken, Cloudflare gives a different
`*.pages.dev` name: use that one below, and change `--project-name flameatlas` in the root `deploy:web` script.

`deploy:web` passes `--branch main`, so every deploy goes to the production URL. Without it Wrangler uses
your current git branch and makes a preview URL like `https://anish.flameatlas.pages.dev`, which CORS
would refuse.

## 4. Point the two halves at each other

1. `apps/web/.env.production`: set the worker URL from step 2 (no trailing slash).
   ```
   VITE_API_BASE=https://flameatlas-api.<your-subdomain>.workers.dev
   ```
   This is not a secret: it ends up in the public JavaScript.
2. `apps/worker/wrangler.toml`: set the Pages URL from step 3 (no trailing slash).
   ```toml
   ALLOWED_ORIGIN = "https://flameatlas.pages.dev"
   ```
3. Redeploy the worker so it picks up `ALLOWED_ORIGIN` (vars are fixed at deploy time):
   ```bash
   pnpm deploy:worker
   ```

`http://localhost:5173` is always allowed, so local development keeps working.

## 5. Deploy the web app

```bash
pnpm deploy:web
```

This builds `apps/web` with `.env.production` and uploads `apps/web/dist`. Note the `pages.dev` URL it prints.

## 6. Smoke test

```bash
WORKER=https://flameatlas-api.<your-subdomain>.workers.dev
SITE=https://flameatlas.pages.dev

# expect {"ok":true,"dataVersion":"1.0.0-seed","fixture":false,"gemini":true}
curl -s $WORKER/api/health

# expect the header "access-control-allow-origin: https://flameatlas.pages.dev"
curl -s -o /dev/null -D - -H "Origin: $SITE" $WORKER/api/health | grep -i access-control-allow-origin

# expect 404: dev routes (they spend Gemini quota) exist only on localhost
curl -s -o /dev/null -w "%{http_code}\n" -X POST $WORKER/api/dev/warm-cache
```

Then open `$SITE`. Home, Research atlas, Mission lab, Referee and the investigation pages make **no**
Gemini calls (they use the bundled dataset in the browser). On the Ask page, a demo question that is in
`data/cache/demo-answers.json` for data version `1.0.0-seed` is served from the cache (0 calls). Any other
question costs one request per model tried (1, or up to 3 if models are out of quota). Repeats of the same
question are cached in memory only while that worker instance stays warm.

## Free-tier notes

- **Workers Free:** 100,000 requests per day. CPU time per request is limited (10 ms on Free); waiting
  on Gemini does not count as CPU time. If a page shows error 1102 (CPU exceeded), tell the team rather
  than upgrading.
- **Workers AI:** the `AI` binding in `wrangler.toml` is declared but not called by any code yet
  (semantic search is a TODO). On the Free plan Workers AI has a daily free allocation and stops
  rather than bills when it runs out.
- **KV:** the `ANSWERS` namespace is commented out in `wrangler.toml`, so answers are cached in memory only.
- **Gemini free tier:** about 20 requests per day per model on this key. Use the demo cache for demos.

## Rolling back

```bash
pnpm --filter @flameatlas/worker exec wrangler rollback          # previous worker version
pnpm --filter @flameatlas/worker exec wrangler pages deployment list --project-name flameatlas
```

Pages keeps every deployment; promote an older one from the Cloudflare dashboard if needed.
