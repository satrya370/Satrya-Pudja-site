# AWS Free Tier Deployment Guide — Portfolio + n8n + Academic Review Assistant

**Status:** planning document, nothing provisioned yet.
**Companion to:** `PRP.md` (requirements, decision register, risks) and
`TODOS.md` (formal CP checklist for the n8n/itinerary track). This document
is the practical runbook — what to actually click/type, in order — and it
adds the one piece the original PRP didn't cover: deploying the **Academic
Review Assistant** (a separate Node.js/Express + MongoDB + React app, not an
n8n workflow) alongside the portfolio and n8n.

---

## 1. What's being deployed

| Piece | What it is today | Where it runs after this guide |
|---|---|---|
| Portfolio + 7 case-study pages | Static HTML/CSS/JS, zero build step (`satryapudja-site/site/`, `.../kura2bus-site/`, etc.) | S3 + CloudFront |
| n8n (7 showcase workflows) | Local n8n on `localhost:5678`, exposed today via ngrok tunnel | EC2, Docker |
| Academic Review Assistant | `d:/application/academic-review` (Express API + MongoDB) and `academic-review-fe` (React/Vite) — currently only runs locally, no live demo | Same EC2 (API), MongoDB Atlas (free, separate from AWS), React build → S3 + CloudFront (or same EC2/Nginx) |

Everything else in the repo (30 non-showcase n8n workflows, other prototype
folders) stays local — not part of this deployment (`PRP.md` D5).

---

## 2. Architecture

```
                         ┌───────────────────────────────┐
 satryapudja.site ──────▶│  CloudFront + ACM (us-east-1) │
 www./kura2bus./         │  origin: S3 (private, OAC)    │
 haribersama./itinerary. └───────────────────────────────┘
 swot./receipt-ocr./         static: portfolio + all
 geo-builder./                case-study pages
 academic-review. (FE) ──────────────┐
                                      │
                                      ▼
                         ┌───────────────────────────────┐
 n8n.satryapudja.site ──▶│  EC2 t3.micro + Caddy (TLS)   │
 api.satryapudja.site ──▶│                                │
                         │  Docker Compose on one box:   │
                         │   - n8n (custom image + Chromium, for PDF nodes)
                         │   - academic-review-api (Node/Express)
                         │  Caddy reverse-proxies both by subdomain
                         └───────────────────────────────┘
                                      │
                                      ▼
                         MongoDB Atlas M0 (free forever,
                         separate from AWS — keeps the
                         1 GB EC2 box from also running Mongo)
```

**Why MongoDB Atlas instead of self-hosting Mongo on the EC2 box:** the
t3.micro instance already has to run n8n (~400 MB) plus Chromium spikes for
PDF rendering (~500 MB) inside 1 GB of RAM — see `PRP.md` R1. Adding MongoDB
on top of that is the fastest way to OOM the box. Atlas's M0 tier is free
forever (not a 12-month trial), lives outside AWS entirely, and removes a
whole service from the memory budget.

**Why the Academic Review frontend can go to S3/CloudFront, not the EC2
box:** the React app (`academic-review-fe`) builds to static files
(`npm run build` → `dist/`) — it doesn't need a Node process at runtime, only
the API does. Treat it exactly like the portfolio: build once, upload to S3,
serve via CloudFront. Only the Express API needs the EC2 box.

---

## 3. Free tier cost model

| Item | Expected cost |
|---|---|
| EC2 t3.micro, 750 h/month | $0 for the first 12 months |
| EBS gp3 30 GB | $0 for the first 12 months |
| S3 (portfolio + case studies + Academic Review FE build, < 1 GB) | $0 for the first 12 months |
| CloudFront (< 1 TB/month out) | $0 — perpetual free tier |
| ACM certificates | $0 always |
| MongoDB Atlas M0 (512 MB) | $0 forever (separate from AWS) |
| Route 53 hosted zone | $0.50/month — not free |
| **Expected total** | **≈ $0.50/month for the first 12 months** |

Same caveat as `PRP.md` §4.2: AWS's free-tier terms changed for accounts
created in 2025+ (time-limited credits instead of the classic 12-month
allowances in some cases). Verify actual entitlement in the Billing console
before relying on this table, and set the budget alarm in Phase A regardless.

---

## Phase A — AWS account baseline (do this first, before anything else)

1. **Billing alarm before touching any service.** AWS Console → Billing →
   Budgets → create a budget alarm at, say, $5/month. This is the single
   cheapest insurance against a misconfiguration burning money unnoticed.
2. **Create an IAM user for deployment work** — do not use the root account
   day to day. Attach only what's needed: S3, CloudFront, EC2, ACM, Route 53.
3. **Install and configure the AWS CLI locally** (`aws configure`) with that
   IAM user's access key.
4. **Region choice:** ACM certificates for CloudFront *must* be requested in
   `us-east-1` regardless of where everything else lives. Keep EC2 in
   whichever region is closest to your actual users (e.g. `ap-southeast-1`
   Singapore, for Indonesia-based traffic) to cut latency — this can differ
   from the ACM region without issue.

---

## Phase B — DNS and TLS

Two options (`PRP.md` D9 already flags this as an open call):

- **Route 53 hosted zone (recommended).** Create it, copy the 4 NS records to
  wherever `satryapudja.site` is registered, and manage every subdomain from
  Route 53 afterwards. Costs $0.50/month, but makes ACM DNS validation and
  CloudFront alias records trivial.
- **Keep the external registrar.** Add CNAME/A records manually for every
  subdomain plus ACM validation records. Free, but check the registrar
  supports ALIAS/ANAME flattening at the apex (`satryapudja.site` itself, not
  `www.`) before committing to this path — not all do.

Subdomains needed by the end of this guide:

```
satryapudja.site, www.                    → portfolio (S3/CloudFront)
kura2bus.satryapudja.site                 → case study (S3/CloudFront)
haribersama.satryapudja.site              → case study (S3/CloudFront)
itinerary.satryapudja.site                → case study (S3/CloudFront)
swot.satryapudja.site                     → case study (S3/CloudFront)
receipt-ocr.satryapudja.site              → case study (S3/CloudFront)
geo-builder.satryapudja.site              → case study (S3/CloudFront)
academic-review.satryapudja.site          → case study + app FE (S3/CloudFront)
n8n.satryapudja.site                      → EC2 (Caddy → n8n)
api.satryapudja.site                      → EC2 (Caddy → academic-review API)
```

Request one ACM certificate covering `satryapudja.site` + `*.satryapudja.site`
(a wildcard SAN) — one certificate for every subdomain above instead of nine
separate ones.

---

## Phase C — Static hosting: portfolio + all case-study pages

1. **One S3 bucket per site, or one bucket with folders + multiple CloudFront
   behaviours** — for 9 static sites, folders in a single bucket
   (`/`, `/kura2bus/`, `/haribersama/`, ...) with one CloudFront distribution
   and path-based origins is simpler to manage than 9 buckets. Pick folders
   unless you specifically want independent cache-invalidation per site.
2. Bucket: **block all public access**, private. CloudFront reaches it via
   **Origin Access Control (OAC)**, not a public bucket policy.
3. Create the CloudFront distribution:
   - Origin: the S3 bucket (OAC).
   - Alternate domain names (CNAMEs): every subdomain from Phase B that maps
     to a static site.
   - Attach the wildcard ACM cert from Phase B.
   - Default root object: `index.html`.
   - Cache behaviour: standard static-site caching is fine; these are
     hand-edited files, not build artefacts that change every deploy — a
     short TTL (5–15 min) keeps updates visible without needing an
     invalidation on every change, though you can also just invalidate
     `/*` after each `aws s3 sync`.
4. **Before the first upload — fix the local-testing links.** Every
   case-study page currently links to its siblings with **relative paths**
   (`../kura2bus-site/`, `../receipt-ocr-site/`, etc.) — this was a
   deliberate temporary convenience for testing everything together via
   `npx serve` on `localhost:8080`. In production these are separate
   origins/subdomains, so every one of these must become an absolute URL
   (`https://kura2bus.satryapudja.site/`) before deploy. Same for the
   `DEMO_URL`/`CTA_URL` JS constants in `receipt-ocr-site`, `swot-site`, and
   `geo-builder-site` — swap the ngrok tunnel URL for
   `https://n8n.satryapudja.site/form/...` once Phase E is live.
5. Upload:
   ```bash
   aws s3 sync satryapudja-site/site/               s3://<bucket>/ --delete
   aws s3 sync satryapudja-site/kura2bus-site/       s3://<bucket>/kura2bus/ --delete
   aws s3 sync satryapudja-site/haribersama-site/    s3://<bucket>/haribersama/ --delete
   aws s3 sync satryapudja-site/itinerary-site/      s3://<bucket>/itinerary/ --delete
   aws s3 sync satryapudja-site/swot-site/           s3://<bucket>/swot/ --delete
   aws s3 sync satryapudja-site/receipt-ocr-site/    s3://<bucket>/receipt-ocr/ --delete
   aws s3 sync satryapudja-site/geo-builder-site/    s3://<bucket>/geo-builder/ --delete
   aws s3 sync satryapudja-site/academic-review-site/ s3://<bucket>/academic-review/ --delete
   ```
   (Adjust to per-bucket-per-site if that's the path chosen in step 1.)
6. Invalidate CloudFront (`aws cloudfront create-invalidation --paths "/*"`)
   after each sync.

---

## Phase D — EC2 host for n8n + the Academic Review API

1. Launch **one** t3.micro (free-tier eligible), Ubuntu 22.04/24.04 LTS,
   30 GB gp3 EBS (also free-tier eligible up to 30 GB).
2. Security group: only **22 (SSH, restricted to your IP)**, **80**, **443**
   open. Nothing else — n8n's port 5678 and the API's port stay behind Caddy,
   never exposed directly.
3. Add a **2 GB swapfile** immediately — a 1 GB instance running n8n +
   Chromium + a Node API needs the headroom (`PRP.md` R1):
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
4. Install Docker + Docker Compose.
5. Install **Caddy** (handles TLS certificate issuance/renewal automatically
   via Let's Encrypt — far less manual than certbot + nginx for a
   multi-subdomain box).

### Caddy config sketch (`/etc/caddy/Caddyfile`)

```
n8n.satryapudja.site {
    reverse_proxy localhost:5678
}

api.satryapudja.site {
    reverse_proxy localhost:4000
}
```

Caddy handles the ACME challenge and certificate renewal for both subdomains
on its own — no separate ACM/EC2 TLS setup needed here (ACM in Phase B is
only for the CloudFront/S3 side).

---

## Phase E — n8n on the EC2 box

Carried over from `PRP.md` §4/§8 (D2, D6, R1, R2) — the points that matter
for actually doing it:

1. **Custom n8n image with Chromium baked in** — the itinerary product's PDF
   generation (CP011 in `TODOS.md`) needs a headless browser; the stock n8n
   Docker image doesn't include one.
2. **SQLite, not Postgres** — stays inside the 1 GB budget (`PRP.md` D6
   explicitly accepts this trade-off; revisit only if you upsize the
   instance).
3. **Environment variables — get this right the first time** (this is the
   exact mistake made during local tunnel testing this session): set only
   `WEBHOOK_URL` and `N8N_EDITOR_BASE_URL` to the full
   `https://n8n.satryapudja.site` URL. Do **not** set `N8N_PORT` to 443 or
   anything other than n8n's actual internal bind port (5678) — that setting
   controls the real listener, not just the advertised URL, and doing so
   broke the tunnel locally in exactly this way before.
4. **Chromium flags for a 1 GB box:** `--single-process --no-zygote
   --disable-dev-shm-usage`, and cap PDF-rendering executions to
   **concurrency 1** in n8n's execution settings.
5. **Migrate only the 7 showcase workflows** (`PRP.md` §3 table) — export
   from local n8n, import here. The other 30 stay local.
6. **Every OAuth credential needs re-authorization against the new domain**
   — this is the slowest part, not the server setup. Google Sheets/Drive,
   Gmail, WordPress, Notion, Slack: each provider's console has
   `localhost:5678` as the redirect URI today; update every one to
   `https://n8n.satryapudja.site/rest/oauth2-credential/callback` and
   re-consent each credential. Do this provider by provider, and expect the
   same "Unauthorized" symptom seen during local tunnel testing if a browser
   session and the callback domain don't match — always start the OAuth flow
   from a fresh tab already logged into the production n8n URL, not a tab
   still pointed at `localhost`.
7. **Demo-safe variants** (`PRP.md` §5.2) — the workflows behind GEO Article
   Builder, SWOT Generator, and Meeting Notes currently write to your
   personal WordPress/Gmail/Notion/Slack when run. Before exposing their
   `/form/...` URLs publicly on the new domain, confirm each is (or has) a
   demo variant that returns output to the visitor instead of writing to
   your accounts — otherwise every visitor's demo run lands in your own
   WordPress drafts, Gmail, or Notion.
8. **Rate limits and a daily cap** at Caddy/n8n for every public
   `/form/*` and `/webhook/*` path — public demo buttons on 8 landing pages
   all point here, and each run spends real AI tokens as OpenRouter/KobiIllm
   spend that AWS's own budget alarm cannot see (`PRP.md` R7).

---

## Phase F — Academic Review Assistant

This is the piece the original PRP left as an open item (O2/D13) — it's now
resolved: real code at `d:/application/academic-review` (API) and
`academic-review-fe` (React/Vite).

### F1 — Database: MongoDB Atlas (not self-hosted)

1. Create a free M0 cluster on MongoDB Atlas (any nearby region).
2. Network access: allow only the EC2 box's static IP (or Elastic IP —
   attach one to the instance so this doesn't break on reboot).
3. Create a database user, grab the connection string for `.env`.

### F2 — API on the EC2 box (Docker, alongside n8n)

1. Add the API as a second service in the same `docker-compose.yml` already
   running n8n — same box, same Caddy, different subdomain (`api.`).
2. Required env vars (from the API's `.env.example`): MongoDB connection
   string (Atlas, from F1), the KoboIllm embeddings key, the Adacode/Claude
   LLM key, Azure Document Intelligence key (OCR fallback), and whichever of
   Mendeley/Semantic Scholar/Gemini TTS keys the features you want live need
   — check `ACADEMIC_REVIEW_SDD.md`'s env var table for the full list.
3. `PDF_MAX_SIZE_MB` and any rate limiting matter here too — this API accepts
   file uploads from the public internet once its landing page's demo (if
   you choose to add one later) is live.
4. Point Caddy's `api.satryapudja.site` block at this container's port.

### F3 — Frontend build → S3/CloudFront (same as Phase C, one more site)

```bash
cd academic-review-fe
npm run build
aws s3 sync dist/ s3://<bucket>/academic-review-app/ --delete
```
Point the frontend's API base URL (build-time env var, check
`FRONTEND_API_SPEC.md`) at `https://api.satryapudja.site` before building.

Add `academic-review-app.satryapudja.site` (or reuse
`academic-review.satryapudja.site` if the case-study page and the live app
are meant to be the same origin) as another CloudFront alternate domain name.

### F4 — Decide what "live" means for this one

Unlike the n8n workflows, the Academic Review Assistant has services marked
`NOT STARTED` in its own `TODOs.md` (tag extraction, Mendeley OAuth sync —
see the "In progress" card already on its landing page). Decide before
launch: ship with only the features that are actually done (summary, review,
Q&A, comparison, export, TTS, citation enrichment), and keep the landing
page's "In progress" badge accurate — don't let the deployed app imply more
than the case-study page already promises.

---

## Phase G — Cutover checklist

Run through this before calling any of it done:

- [ ] Budget alarm active (Phase A)
- [ ] Every relative link (`../kura2bus-site/`, etc.) replaced with its
      absolute `https://<subdomain>.satryapudja.site/` URL
- [ ] Every `DEMO_URL`/`CTA_URL` JS constant points at
      `https://n8n.satryapudja.site/...`, not the ngrok/devtunnel URL
- [ ] All 9 static sites resolve over HTTPS on their intended subdomain
- [ ] n8n reachable at `https://n8n.satryapudja.site`, editor access
      restricted (IP allow-list or equivalent — `PRP.md` O5)
- [ ] Every OAuth credential re-authorized against the new domain, tested
      with one real run per workflow
- [ ] Demo-safe variants confirmed for GEO Article Builder, SWOT Generator,
      Meeting Notes — a public run does not write to your personal accounts
- [ ] Rate limit + daily cap verified by actually exceeding them once, not
      just reading the config
- [ ] Academic Review API reachable at `https://api.satryapudja.site/health`
- [ ] Academic Review frontend can upload a real PDF end-to-end against the
      deployed API and Atlas
- [ ] One EBS snapshot taken after everything is stable (`PRP.md` R5 — no
      formal backup workstream exists beyond this single snapshot habit)

---

## 4. What this guide deliberately leaves out

Matches `PRP.md` §1/§12 scope: no Secrets Manager migration, no monitoring
stack, no CI/CD pipeline for the static syncs (manual `aws s3 sync` is fine
at this scale), no blog/Article API rebuild. Add these later if the
portfolio starts getting real traffic — not before.
