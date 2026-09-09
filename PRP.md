# PRP — satryapudja.site: AI Automation Portfolio + AWS Deployment

**Status:** requirements agreed, not yet executed
**Created:** 2026-09-08
**Process authority:** `itinerary-engine/RULES.md` (the same six-phase CP process
used by every product in this repo — Diskusi → Planning → Working → Review →
Test → Revise). This PRP is the requirement source; `TODOS.md` in this
directory is the CP order and status.

---

## 1. Purpose

Turn `satryapudja.site` into the owner's **primary landing page and portfolio
as an AI automation engineer**, where each showcased n8n workflow has its own
landing page **and a demo a visitor can actually run**. Deploy the showcase
workflows to AWS so the demos work without the owner's laptop being on.

This replaces the current `repeatable/` site. `repeatable.co` was framed as a
micro-SaaS template catalog; that framing and **all of its existing page
content is dropped**. Only the underlying design system and self-hosted assets
are candidates for reuse (see §9, open item O1).

### Not the goal

- Not a template marketplace, not a product-sales site.
- Not a blog platform. The Article API integration is deliberately **not**
  rebuilt (see D8).
- Not a migration of all 37 local workflows (see D5).

---

## 2. Decision register

All decisions below came from structured Ask Question rounds on 2026-09-08
(`RULES.md` §4). They are binding for planning; changing one requires a new
question round, not a silent edit.

| ID | Decision | Rationale / consequence |
|---|---|---|
| D1 | `satryapudja.site` domain is **already owned but has no content**; build from scratch | The `Satryapudja Article API` credential in `Credential_information.md` refers to a plan that was never built. No live site to avoid breaking. |
| D2 | n8n on **EC2 + Docker Compose** | Cheapest with full control; needs a custom image because CP011 (PDF) requires Chromium, which the stock n8n image lacks. |
| D3 | Subdomains: root = portfolio, `itinerary.` = product, `n8n.` = n8n | Brochure output served under the itinerary subdomain/path (see §4). |
| D4 | **Deploy infrastructure first**, then finish itinerary CP011/CP012 *on* AWS | Both depend on the cloud environment (Chromium in container, S3 links, SES). Building them locally first would mean rewriting the storage and email layers. |
| D5 | Migrate **only the 7 showcase workflows**, not all 37 | The other 30 (Canva refresh, Gmail builder, connector stubs, TEMP tests) stay on the local n8n. Keeps a 1 GB instance viable and avoids re-authorising unrelated OAuth credentials. |
| D6 | **t3.micro + 2 GB swap + SQLite** (no Postgres) | Stays inside free tier. Explicitly accepts the trade-offs in §8 R1 — this is the single riskiest decision in this PRP. |
| D7 | Every showcased workflow gets **its own landing page and a runnable demo** | Verbatim requirement: *"user bisa melakukan demo terhadap workflow ku dan tiap workflow nanti ada landing page"*. Drives the whole demo-safety and cost-guard design in §5. |
| D8 | For `Aritcle Geo Builder`, create a **duplicate demo workflow whose output is DOCX**, not an Article API / WordPress publish | Verbatim: *"buat duplikatnya aja karena nanti outputnya berupa docx bukan article api atau wordpress"*. Removes the dependency on a backend the static site would not have. |
| D9 | Domain DNS is at an **external registrar** | Plan must cover creating a Route 53 hosted zone and switching nameservers, or alternatively adding records at the registrar (§4.3). |
| D10 | Email delivery via **Amazon SES** | Native, cheap, DKIM/SPF on own domain. Sandbox exit must be requested early — it gates itinerary CP012. |
| D11 | Static hosting: **whatever fits the AWS free trial** | Resolved to S3 + CloudFront + ACM: CloudFront's 1 TB/month tier is perpetually free, S3 is free-tier for 12 months, and the site stays up when the EC2 instance is restarted for n8n maintenance. |
| D12 | In scope beyond infra: **CP016 public self-serve form only** | Explicitly **out of scope**: blog/Article API, credential hardening to Secrets Manager, and backup/monitoring as a dedicated workstream. See §8 R5/R6 for the residual risk this leaves. |
| D13 | "Academic review" is a **separate non-n8n program** | Not found among the 37 workflows. It gets a portfolio page but its demo mechanism is unresolved — open item O2. |

---

## 3. Current-state findings (verified, not assumed)

Established by direct inspection on 2026-09-08, not from memory:

**Local n8n:** 37 workflows, 28 active, running from a global npm install
(`n8n@2.23.2`) on `localhost:5678`.

**The 7 showcase workflows all already have public entry points** — this is
the most consequential finding for the demo requirement, because it means
demos do **not** need custom forms built from scratch:

| # | Workflow | id | Nodes | Trigger | Credentials it needs |
|---|---|---|---|---|---|
| 1 | Itinerary Brochure Engine - Foundation | `GRuSSwnW38U1HNgK` | 60 | `formTrigger` | KobiLLM, OpenRouter |
| 2 | ig Content Builder For Demo | `V8VbQm1KWpe7jj7Y` | 74 | `formTrigger` + 4× `respondToWebhook` | Google Sheets OAuth2, Telegram, KobiLLM, Gmail |
| 3 | Aritcle Geo Builder | `rwIbdIkIhoVE8nkG` | 60 | `formTrigger` | OpenRouter, Groq, OpenCode Zen, WordpressApi, Google Drive OAuth2, **Satryapudja Article API**, Google Sheets OAuth2, Telegram |
| 4 | SWOT Generator | `11NzqN1dZ0JNt0el` | 34 | `formTrigger` | Groq, KobiLLM, OpenRouter, Gmail |
| 5 | Meeting Notes — Main Pipeline | `XscXJksppe3HR3tS` | 47 | `formTrigger` | Notion, Slack, OpenRouter, KobiLLM, SMTP |
| 6 | Receipt OCR Core - Canonical JSON v2 | `rQVONGkNNcefuSM8` | 20 | `webhook:receipt-ocr-core` | OpenRouter |
| 7 | Receipt to Excel - AI OCR Trial | `kLyiJeZEwLikYWu7` | 36 | `webhook:receipt-to-excel` | OpenRouter |
| — | Receipt Upload Form UI | `K2Oo2jlkM9s8fPFm` | 6 | `formTrigger` | none (front door for #6/#7) |

**Notable:** `ig Content Builder For Demo` is already a demo-safe duplicate of
the production `ig Content Builder` — the pattern D8 asks for already exists in
this repo and should be applied consistently (§5.2).

**Itinerary product state:** CP001–CP010 and CP014/CP015 complete; **CP011
(PDF), CP012 (publish + delivery), CP013 (E2E), CP016 (web form) still
pending**. The workflow is `active: false` and must stay that way until its own
CP013 passes (`RULES.md` §11).

**Existing site:** `repeatable/` is plain static HTML/CSS/JS — no build step,
no framework, self-hosted IBM Plex fonts, zero CDN dependencies. `repeatable.co`
appears in `index.html` JSON-LD, `robots.txt`, and all 9 `sitemap.xml` entries;
these are the concrete strings to change.

**Git risk (verified):** `.gitignore` covers `node_modules/`, `.DS_Store`,
`Thumbs.db`, `*.log`, `.env` — but **not `Credential_information.md`**, which
contains plaintext API keys for KobiLLM, OpenRouter, Groq, Z.ai, OpenCode,
Google, Semantic Scholar, and WordPress OAuth. A single `git add .` would push
them to GitHub. Mitigation is one line and is included in CP001 despite D12
placing broader credential work out of scope — the two are different problems.

---

## 4. Target architecture

### 4.1 Topology

```
                        ┌──────────────────────────────┐
  satryapudja.site ────▶│ CloudFront + ACM (us-east-1) │
  www.satryapudja.site  │   origin: S3 (OAC, private)  │
                        └──────────────────────────────┘
                                     │  static: portfolio + per-workflow
                                     │  landing pages + demo entry links
                                     ▼
                        ┌──────────────────────────────┐
  itinerary.satryapudja │ CloudFront (2nd distribution │
  .site ───────────────▶│ or additional behaviour)     │
                        │   /            → landing     │
                        │   /app/form    → CP016 form  │
                        │   /b/<token>   → brochures   │
                        └──────────────────────────────┘
                                     │ POST (CORS)
                                     ▼
                        ┌──────────────────────────────┐
  n8n.satryapudja.site ▶│ EC2 t3.micro + Caddy (TLS)   │
                        │  ├ /            editor UI    │
                        │  │              (IP-allow +  │
                        │  │               n8n auth)   │
                        │  ├ /form/*      public demos │
                        │  └ /webhook/*   public demos │
                        │                              │
                        │  Docker Compose:             │
                        │   n8n (custom img + Chromium)│
                        │   SQLite on EBS + 2GB swap   │
                        └──────────────────────────────┘
                                     │
                        ┌────────────┴───────────────┐
                        ▼                            ▼
                   S3 (brochures,              SES (email +
                   demo outputs)               PDF attachment)
```

### 4.2 Free-tier cost model

| Item | Expected cost |
|---|---|
| EC2 t3.micro, 750 h/month | $0 for the first 12 months |
| EBS gp3 30 GB (incl. 2 GB swapfile) | $0 for the first 12 months |
| S3 (< 1 GB) | $0 for the first 12 months |
| CloudFront (< 1 TB/month out) | $0 — perpetual free tier, not time-limited |
| ACM certificates | $0 always |
| **Route 53 hosted zone** | **$0.50/month — not free** |
| SES | $0 within the free allowance; verify current terms |
| **Expected total** | **≈ $0.50/month during the first 12 months** |

**Caveat, stated plainly:** AWS restructured its free tier during 2025 (new
accounts may receive time-limited credits instead of the classic 12-month
service allowances, and SES/EC2 allowances differ between the old and new
programs). Do **not** treat the table above as authoritative — verify the
actual entitlements in the AWS Billing console before relying on them. CP001
includes a budget alarm precisely because this table might be wrong.

### 4.3 DNS (external registrar, D9)

Two viable paths; CP002 picks one at its Discuss phase:

- **Route 53 hosted zone** (recommended): create the zone, copy its four NS
  records to the registrar, manage everything in AWS afterwards. Costs
  $0.50/month. Cleanest for ACM DNS validation and alias records to CloudFront.
- **Keep registrar DNS**: add CNAME/A records for the apex, `www`,
  `itinerary`, and `n8n` plus the ACM validation CNAMEs manually. Free, but
  apex-to-CloudFront needs registrar support for ALIAS/ANAME flattening, which
  not every registrar offers — check before committing to this path.

---

## 5. Demo layer design

This section exists because D7 (visitors run real demos) is the requirement
that carries the most risk: **every demo submission spends the owner's AI
tokens and runs on a 1 GB instance.** Treating this as an afterthought is how
a portfolio turns into an unbounded bill.

### 5.1 Entry points

Demos use the **existing n8n form and webhook URLs** under
`n8n.satryapudja.site`, linked or embedded from each workflow's landing page.
No custom form is built per workflow.

The one exception is the itinerary product: n8n's `formTrigger` v2.5 cannot
generate per-day route rows from a previously submitted value
(`displayOptions` can only key off a field's own `fieldType`), which is exactly
why itinerary CP016 specifies a custom form. That form is in scope (D12); the
other six demos are not affected.

### 5.2 Demo-safe variant rule

A workflow may only be exposed publicly if it does **not** write into the
owner's private integrations. Where it does, a duplicate demo variant is
created and only the variant is exposed:

| Workflow | Private side effect today | Demo variant needed |
|---|---|---|
| Itinerary Brochure Engine | none (email goes to submitter) | No |
| ig Content Builder | Google Sheets, Telegram, Gmail | **Already exists** — `ig Content Builder For Demo` |
| Aritcle Geo Builder | WordPress + Article API publish, Drive, Sheets, Telegram | **Yes — D8**: duplicate, final output DOCX returned to visitor, no publish |
| SWOT Generator | Gmail send | **Yes** — return DOCX/PDF to visitor instead of emailing the owner's account |
| Meeting Notes | Notion page, Slack message, SMTP | **Yes** — return the notes document; no Notion/Slack write |
| Receipt OCR Core | none — returns JSON | No |
| Receipt to Excel | none — returns a file | No |

The original workflows stay untouched and stay local (D5 moves only what is
needed; the demo variants are what get deployed for #3, #4, #5).

### 5.3 Guards (mandatory, not optional)

- **Per-IP rate limit** at Caddy on `/form/*` and `/webhook/*`.
- **Daily global cap** per demo workflow; past the cap, the form returns a
  friendly "demo quota reached, here is a sample output" response pointing at
  a pre-rendered example rather than calling any model.
- **Concurrency 1** for anything invoking Chromium (PDF), enforced by n8n
  execution settings — a 1 GB instance cannot render two PDFs at once (§8 R1).
- **Payload caps** already exist per-field in the itinerary product
  (`config.json → limits`); the other demos need equivalent input caps.
- **Honeypot field** on the CP016 form; no captcha initially.
- **AWS budget alarm** (CP001) plus manual review of model-provider dashboards
  — note that AI spend happens at KobiLLM/OpenRouter/Groq, which AWS budgets
  cannot see. This is a real blind spot; the daily cap is the actual control.

---

## 6. Site information architecture

```
satryapudja.site/
  /                        Portfolio home — positioning as AI automation
                           engineer, showcase grid of 8, about, contact
  /w/itinerary-brochure/   ─┐
  /w/ig-content-builder/    │  Per-workflow landing page (D7):
  /w/geo-article-builder/   │   problem → approach → architecture →
  /w/swot-generator/        │   real output sample → "Run the demo" CTA
  /w/meeting-notes/         │   pointing at the n8n form/webhook URL
  /w/receipt-ocr-excel/    ─┘
  /w/academic-review/      Non-n8n program (D13, demo TBD — open item O2)
  /about/, /contact/
  /sitemap.xml, /robots.txt

itinerary.satryapudja.site/
  /                        Itinerary product landing (adapted from the
                           existing repeatable/t/itinerary-generator.html,
                           de-branded from Repeatable)
  /app/                    CP016 self-serve form
  /b/<token>               Generated brochure (CP012, 6–12 month lifetime)
```

The existing `repeatable/t/itinerary-generator.html` is the **only** page whose
content survives — it was polished and verified this month and is genuinely
about the itinerary product. Its Repeatable branding, catalog cross-links, and
`hello@repeatable.co` capture form must be replaced. The other five `t/*.html`
template pages are dropped per §1.

---

## 7. Success criteria

1. `satryapudja.site` resolves over HTTPS and presents the AI automation
   portfolio; no Repeatable branding or template-catalog framing remains.
2. Each of the 8 showcase items has its own landing page with a real output
   sample, and 7 of them have a demo a visitor can actually run end to end.
3. Demo abuse guards demonstrably work: exceeding the per-IP limit and the
   daily cap both return the intended graceful response, verified by test, not
   by reading config.
4. The 7 showcase workflows run on AWS with their credentials working,
   including every OAuth credential re-authorised against the new domain.
5. Itinerary CP011/CP012/CP013/CP016 pass **on AWS**: a real submission through
   the public form produces a PDF, a long-lived link, and an SES email with the
   PDF attached.
6. Rendered visual verification of both the site and the PDF output at phone
   and desktop widths (`RULES.md` §11a) — screenshots recorded in the CP logs.
7. Monthly AWS spend matches §4.2 (≈$0.50) or the deviation is understood and
   recorded.
8. The local n8n keeps running the other 30 workflows, unaffected.

---

## 8. Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **t3.micro 1 GB OOM.** n8n ≈400 MB + Chromium spike ≈500 MB exceeds RAM. Public demos make the load unpredictable, which is worse than the internal-only case this sizing was estimated against. | **High** | 2 GB swap, SQLite instead of Postgres, Chromium `--single-process --no-zygote --disable-dev-shm-usage`, PDF concurrency 1, daily caps. Escape hatch: EC2 instance type can be changed in place (stop → change → start) to t3.small/t4g.small for ~$12–16/month if OOM persists. Measure before deciding. |
| R2 | **OAuth redirect URIs are all `localhost:5678`.** Google Drive/Sheets, WordPress, and others will fail on the new host until each provider's console is updated and each credential re-consented. | High | CP011 treats this as its main body of work, provider by provider, with a checklist per credential. Expect this to be the slowest step, not the EC2 setup. |
| R3 | **SES sandbox.** A new SES identity can only send to verified addresses until production access is granted (typically 1–2 business days, sometimes longer). This gates itinerary CP012. | Medium | Request domain verification and production access in CP002, in parallel with everything else, long before CP012 needs it. |
| R4 | **Single instance, no redundancy.** EC2 restart or failure takes all demos down. | Medium | Accepted deliberately: the static portfolio is on CloudFront and stays up, so a visitor sees the site and case studies even when demos are unavailable. Demo pages should degrade to the sample output rather than an error. |
| R5 | **No backup workstream** (D12). The n8n SQLite file holds every workflow and credential; losing the EBS volume loses all of it. | Medium | Out of scope by decision, but CP009 includes taking one EBS snapshot after setup and one before each subsequent change — the minimum that prevents total loss. Recommend revisiting D12 afterwards. |
| R6 | **Plaintext credentials in `Credential_information.md`, not gitignored**, in a repo with a GitHub remote. | **High** (accidental exposure) | CP001 adds the file to `.gitignore` and verifies `git check-ignore` passes. This is distinct from the Secrets Manager work D12 excluded. The file itself is marked "Only write by user" and will not be edited. |
| R7 | **Demo AI spend is invisible to AWS billing** — it lands at KobiLLM/OpenRouter/Groq. | Medium | Daily per-workflow caps (§5.3) are the real control; AWS budget alarms will not catch this. |
| R8 | **Free-tier terms uncertainty** (§4.2). | Low–Medium | Budget alarm in CP001; verify entitlements in the Billing console rather than trusting this document. |

---

## 9. Open items to resolve at each CP's Discuss phase

These are deliberately left open rather than guessed:

- **O1 — Visual identity.** All Repeatable *content* is dropped (§1), but its
  design system (Carbon Copy tokens, self-hosted IBM Plex, `note-card`/`btn`
  components) is well built and dependency-free. Reuse it with a new identity,
  or design a fresh one? Affects CP005 significantly.
- **O2 — Academic review demo.** It is a separate non-n8n program (D13) whose
  location is not established in this repo. Does it get a live demo, a video,
  or a static case study only?
- **O3 — Which extra projects appear.** The repo also contains
  `web-scoping-engine`, `website-research-engine`, `telco-churn-advisor`, and
  `TourDriver`, none of which the owner named in the showcase list. Include
  them as secondary entries, or leave them out?
- **O4 — Content language.** The itinerary landing page is `lang="id"`. Is the
  portfolio Indonesian, English, or bilingual? This affects audience
  (Indonesian clients vs. international recruiters) and every page's copy.
- **O5 — n8n editor exposure.** IP allow-list is assumed, but the owner's home
  IP may be dynamic. Fall back to n8n's own auth plus a non-obvious path, or
  use a VPN/SSH tunnel and keep the editor entirely off the public internet?
