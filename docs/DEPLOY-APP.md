# Deploying the Oxyflame app (the mobile PWA)

Oxyflame (`apps/mobile`) is an **installable web app (PWA)** — a static site, not a native app, so there
is **no Play Store / App Store**. People open a URL (or scan a QR), then "Add to Home Screen" to get an
icon that opens full-screen and works offline. Hosting it is the same as hosting any static site: build
it, upload the `dist/` folder to Cloudflare Pages.

It shares the **same worker API** as the website. Only the **Ask** chat calls the worker (`/api/ask`);
Home, Atlas, Lab, Settings and Saved all run offline from the bundled dataset.

> Prerequisite: the worker must be deployed and you need its URL. If you haven't deployed it yet, do
> steps 0–2 of [DEPLOY.md](DEPLOY.md) first (Cloudflare login, Gemini secret, `pnpm run deploy`).
> All commands below run from the **repo root** and stay on Cloudflare/Gemini **free tiers**.

| Step | Cloudflare login | Gemini calls |
|---|---|---|
| 1. Point the app at the worker (`.env.production`) | no | 0 |
| 2. Create the Pages project (once) | yes | 0 |
| 3. Allow the app's origin on the worker, redeploy | yes | 0 |
| 4. Deploy the app | yes | 0 |
| 5. Smoke test + open on your phone | no | a live Ask question may use 1–3 |

---

## 1. Point the app at the worker

Edit [`apps/mobile/.env.production`](../apps/mobile/.env.production) and set `VITE_API_BASE` to your
worker URL from `pnpm run deploy` (no trailing slash):

```
VITE_API_BASE=https://flameatlas.<your-subdomain>.workers.dev
```

This is **not a secret** — it ends up in the public JavaScript. (`http://localhost:5173` is always
allowed by the worker, so local dev keeps working without any change.)

## 2. Create the Pages project (once)

```bash
pnpm --filter @flameatlas/worker exec wrangler pages project create oxyflame --production-branch main
```

Your app will live at **`https://oxyflame.pages.dev`**. If that name is taken, Cloudflare gives you a
different `*.pages.dev` name — use that one everywhere below and change `--project-name oxyflame` in the
root `deploy:app` script to match.

## 3. Allow the app's origin on the worker

The worker refuses browser calls from any origin not in `ALLOWED_ORIGIN` (that's why Ask would otherwise
fail). The website is served by the worker itself (same origin, no CORS needed), so only the app's URL goes
in, in
[`apps/worker/wrangler.toml`](../apps/worker/wrangler.toml):

```toml
ALLOWED_ORIGIN = "https://oxyflame.pages.dev"
```

Then redeploy the worker so it picks up the new value (vars are fixed at deploy time):

```bash
pnpm deploy:worker
```

## 4. Deploy the app

```bash
pnpm deploy:app
```

This builds `apps/mobile` with `.env.production` and uploads `apps/mobile/dist` to the `oxyflame` Pages
project on its production URL. Note the `pages.dev` URL it prints. Re-run this one command for every
future update.

## 5. Smoke test, then open on your phone

```bash
WORKER=https://flameatlas.<your-subdomain>.workers.dev
APP=https://oxyflame.pages.dev

# worker healthy — expect {"ok":true,...}
curl -s $WORKER/api/health

# CORS allows the app — expect "access-control-allow-origin: https://oxyflame.pages.dev"
curl -s -o /dev/null -D - -H "Origin: $APP" $WORKER/api/health | grep -i access-control-allow-origin

# app is live — expect 200
curl -s -o /dev/null -w "%{http_code}\n" $APP
```

On your phone, open `$APP` in Safari (iOS) or Chrome (Android), then:

- **iOS:** Share → **Add to Home Screen**
- **Android:** menu (⋮) → **Install app** / **Add to Home Screen**

You now have the Oxyflame icon; it opens full-screen and works offline (except live Ask answers).

---

## QR code (how people open it without a store)

A QR code just encodes the URL; scanning it opens the app in the phone browser. Generate one from
whatever URL you're sharing (`oxyflame.pages.dev`, a custom domain, or a temporary tunnel):

```bash
# no install needed — prints to the terminal and/or saves a PNG
npx qrcode "https://oxyflame.pages.dev" -o oxyflame-qr.png

# or, if you have it: brew install qrencode
qrencode -o oxyflame-qr.png "https://oxyflame.pages.dev"
```

Drop `oxyflame-qr.png` on a slide or a "Scan to open Oxyflame" card for the demo.

---

## Optional: a custom subdomain (app.yourdomain.com)

If your GoDaddy domain uses **Cloudflare for DNS** (nameservers pointed at Cloudflare; GoDaddy stays the
registrar):

1. Cloudflare dashboard → **Workers & Pages** → `oxyflame` → **Custom domains** → add `app.yourdomain.com`
   (Cloudflare creates the DNS record automatically).
2. Change `VITE_API_BASE` to your API subdomain if you also map one (e.g. `https://api.yourdomain.com`),
   and add `https://app.yourdomain.com` to the worker's `ALLOWED_ORIGIN`, then `pnpm deploy:worker` and
   `pnpm deploy:app` again.

Use a **subdomain** (`app.`), not a subpath (`/app`): the PWA manifest's `scope`/`start_url` are `/`, so a
subdomain needs zero extra config, while a subpath would require a `base` in `vite.config.ts` and manifest edits.

---

## Show it on a phone *right now*, before deploying (for a quick demo)

- **Same Wi-Fi:** `pnpm --filter @flameatlas/mobile dev -- --host`, then open the printed `http://192.168.x.x:5273`
  on your phone. (Ask needs the worker; the rest works.)
- **Instant public HTTPS link + QR:** `cloudflared tunnel --url http://localhost:5273` (or `ngrok http 5273`)
  gives a temporary `https://…` URL you can QR-encode and open on any phone, PWA install and all.

---

## Free-tier notes

Same limits as the website — see the "Free-tier notes" and "Rolling back" sections of [DEPLOY.md](DEPLOY.md).
The app and website are two Pages projects sharing one worker; nothing here enables billing.
