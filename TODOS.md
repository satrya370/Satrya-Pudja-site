# satryapudja.site — Checkpoints

**Authority:** `PRP.md` in this directory defines requirements and decisions;
`itinerary-engine/RULES.md` defines the process (six phases per CP, Ask
Question gate before every plan, completion log before the next CP starts).

**Legend:** `pending` | `in_progress` | `blocked` | `completed`

Every CP needs `plans/cpNNN_implementation-plan_<object>.md` in this directory
before any AWS resource, DNS record, page, or workflow change is made for it.

---

## Status Overview

| CP | Object | Depends on | Status |
|---|---|---|---|
| CP001 | aws-account-baseline-and-repo-safety | — | pending |
| CP002 | dns-certificates-and-ses-identity | CP001 | pending |
| CP003 | static-hosting-s3-cloudfront | CP002 | pending |
| CP004 | static-deploy-pipeline | CP003 | pending |
| CP005 | site-shell-and-design-system | CP004 | pending |
| CP006 | portfolio-home | CP005 | pending |
| CP007 | per-workflow-landing-pages | CP006 | pending |
| CP008 | seo-metadata-and-sitemap | CP007 | pending |
| CP009 | ec2-n8n-host-provisioning | CP002 | pending |
| CP010 | n8n-image-with-chromium | CP009 | pending |
| CP011 | showcase-workflow-migration | CP010 | pending |
| CP012 | demo-safe-workflow-variants | CP011 | pending |
| CP013 | demo-abuse-and-cost-guards | CP012 | pending |
| CP014 | itinerary-subdomain-and-landing | CP003, CP007 | pending |
| CP015 | itinerary-pdf-generation-in-cloud | CP010 | pending |
| CP016 | itinerary-publish-link-and-ses-delivery | CP015, CP002 | pending |
| CP017 | itinerary-self-serve-form | CP014, CP016 | pending |
| CP018 | itinerary-end-to-end-verification-on-aws | CP017 | pending |
| CP019 | cutover-and-repeatable-decommission | CP008, CP018 | pending |

Only one CP may be `in_progress` unless parallel execution is explicitly
authorised (`RULES.md` §9). CP009 does not depend on the static-site chain, so
the site track (CP003–CP008) and the n8n track (CP009–CP013) may run in
parallel **if** authorised; otherwise run the site track first.

### Relationship to `itinerary-engine` CPs

CP015/CP016/CP017/CP018 here **execute** the still-pending itinerary CPs, which
keep their own IDs and logs in `itinerary-engine/`:

| Here | itinerary-engine | Note |
|---|---|---|
| CP015 | CP011 (pdf-generation) | Deferred from local to cloud per PRP D4 |
| CP016 | CP012 (publish-link-and-delivery) | Now S3 + CloudFront + SES specifically |
| CP017 | CP016 (web-form-and-webhook-intake) | Now on `itinerary.satryapudja.site` |
| CP018 | CP013 (end-to-end-verification) | Must pass before the itinerary workflow is left active |

Completion logs go in **both** places: here for the deployment work, and in
`itinerary-engine/logs/` for the product CP being closed.

---

## Phase 0 — Foundation

### CP001 — AWS Account Baseline and Repo Safety

**Status:** pending

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] Confirm which AWS free-tier programme the account is actually on
      (Billing console) and record the real entitlements — do not trust
      `PRP.md` §4.2
- [ ] AWS Budgets alarm at a threshold the owner chooses, with email alert
- [ ] IAM: stop using root for daily work; admin user + MFA; a separate
      least-privilege deploy identity for `s3 sync` + CloudFront invalidation
- [ ] Pick and record the AWS region (single region; note that the CloudFront
      certificate must be in `us-east-1` regardless)
- [ ] **Add `Credential_information.md` to `.gitignore`** and verify with
      `git check-ignore -v` (PRP R6) — do not edit the file itself
- [ ] Verify no secret is already committed in git history
- [ ] Completion log

### CP002 — DNS, Certificates, and SES Identity

**Status:** pending · **Depends on:** CP001

- [ ] Ask Question gate — Route 53 zone vs. registrar DNS (PRP §4.3), incl.
      whether the registrar supports apex ALIAS/ANAME flattening
- [ ] Implementation plan
- [ ] DNS zone chosen and authoritative for `satryapudja.site`
- [ ] ACM certificate in `us-east-1` covering apex + `www` + `itinerary`
      (+ `n8n` if it is to be fronted by CloudFront; Caddy issues its own
      Let's Encrypt certificate if not)
- [ ] DNS validation records in place; certificate status `Issued`
- [ ] **SES: verify the domain identity, set up DKIM + SPF, and submit the
      production-access (sandbox exit) request now** — PRP R3; this gates
      CP016 and takes days, so it must not wait
- [ ] Verify: certificate issued; `dig` shows the expected nameservers
- [ ] Completion log recording the SES request date and its outcome

---

## Phase 1 — Static site

### CP003 — Static Hosting: S3 + CloudFront

**Status:** pending · **Depends on:** CP002

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] Private S3 bucket (no public ACLs); CloudFront **Origin Access Control**
- [ ] CloudFront distribution for apex + `www`, HTTPS-only redirect, default
      root object, and a sensible cache policy
- [ ] `www` → apex redirect (or the reverse — decide once, record it)
- [ ] SPA-style 404 handling **not** assumed; this is a multi-page static site
- [ ] Second distribution (or behaviour) reserved for
      `itinerary.satryapudja.site` — created in CP014
- [ ] Verify: a placeholder page loads over HTTPS on both apex and `www`
- [ ] Verify: the S3 bucket is not directly reachable
- [ ] Completion log

### CP004 — Static Deploy Pipeline

**Status:** pending · **Depends on:** CP003

- [ ] Ask Question gate — script-based `aws s3 sync` vs. GitHub Actions on push
- [ ] Implementation plan
- [ ] Repeatable deploy that syncs the site directory and invalidates
      CloudFront only for changed paths
- [ ] Correct `Cache-Control`: long-lived for `assets/*`, short for HTML
- [ ] Deploy identity uses the least-privilege credentials from CP001, never
      root keys, and no secret is committed
- [ ] Verify: a text change reaches production and is visible after
      invalidation
- [ ] Completion log

### CP005 — Site Shell and Design System

**Status:** pending · **Depends on:** CP004

- [ ] Ask Question gate — **resolves PRP O1** (reuse the Carbon Copy system
      with a new identity vs. design fresh) and **O4** (language)
- [ ] Implementation plan
- [ ] Header, footer, and page shell for the new site
- [ ] Design tokens and self-hosted fonts (no CDN, matching the existing
      zero-external-request property)
- [ ] Favicon and OG image assets
- [ ] Verify: no external stylesheet/font/script request, from the network log
- [ ] **Rendered visual verification** at 390×844 and 1440×1000
      (`RULES.md` §11a)
- [ ] Completion log with the visual evidence

### CP006 — Portfolio Home

**Status:** pending · **Depends on:** CP005

- [ ] Ask Question gate — **resolves PRP O3** (whether web-scoping-engine,
      website-research-engine, telco-churn-advisor, TourDriver appear)
- [ ] Implementation plan
- [ ] Hero positioning as an AI automation engineer
- [ ] Showcase grid linking to each `/w/<slug>/` page
- [ ] About and contact sections
- [ ] Anti-slop rules hold, same as the existing site's standard: no invented
      metrics, no fake testimonials, no logo wall; every claim traceable to
      something real in this repo
- [ ] **Rendered visual verification** at both widths
- [ ] Completion log

### CP007 — Per-Workflow Landing Pages

**Status:** pending · **Depends on:** CP006

**This is the CP that satisfies PRP D7.** One page per showcase item.

- [ ] Ask Question gate — **resolves PRP O2** (academic review demo form)
- [ ] Implementation plan
- [ ] A shared page template: problem → approach → architecture → real output
      sample → "Run the demo" CTA
- [ ] Pages: itinerary-brochure, ig-content-builder, geo-article-builder,
      swot-generator, meeting-notes, receipt-ocr-excel, academic-review
- [ ] Every page embeds or links a **real** output artifact produced by that
      workflow, not a mockup — the itinerary product already has verified PDFs
      in `itinerary-engine/output/` to draw on
- [ ] Demo CTAs point at the deployed n8n form/webhook URLs (needs CP011); use
      a "coming soon" state until then rather than a dead link
- [ ] Each page states plainly what the demo will and will not do (e.g. that
      the Geo Article Builder demo returns a DOCX and publishes nothing)
- [ ] Verify: no dead links; no page claims a demo that is not deployed
- [ ] **Rendered visual verification** at both widths
- [ ] Completion log

### CP008 — SEO Metadata and Sitemap

**Status:** pending · **Depends on:** CP007

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] Per-page title/description/canonical/OG
- [ ] JSON-LD: `Person` for the portfolio owner, plus per-project structured
      data where it is honest to do so
- [ ] `sitemap.xml` and `robots.txt` for the **new** domain — none of the nine
      `repeatable.co` URLs may survive (PRP §3)
- [ ] Verify: no `repeatable.co` string remains anywhere in the deployed site
- [ ] Completion log

---

## Phase 2 — n8n on AWS

### CP009 — EC2 n8n Host Provisioning

**Status:** pending · **Depends on:** CP002

- [ ] Ask Question gate — **resolves PRP O5** (how the editor UI is protected
      given a possibly dynamic home IP)
- [ ] Implementation plan
- [ ] EC2 t3.micro, EBS 30 GB gp3, security group: 80/443 open, 22 restricted
- [ ] **2 GB swapfile**, persistent across reboot (`/etc/fstab`), with
      `vm.swappiness` tuned (PRP D6/R1)
- [ ] Docker + Docker Compose
- [ ] Caddy reverse proxy, automatic TLS for `n8n.satryapudja.site`
- [ ] n8n with **SQLite** on an EBS-backed volume path (no Postgres, PRP D6)
- [ ] `N8N_ENCRYPTION_KEY` set and recorded somewhere safe **before** any
      credential is created — changing it later makes stored credentials
      unreadable
- [ ] `WEBHOOK_URL` / `N8N_HOST` / `N8N_PROTOCOL` set so form and webhook URLs
      generate correctly against the public hostname
- [ ] Editor UI protected per the O5 decision; `/form/*` and `/webhook/*` stay
      public
- [ ] Timezone set to match the local instance so schedules behave predictably
- [ ] **One EBS snapshot after setup** (PRP R5 minimum)
- [ ] Verify: n8n editor reachable over HTTPS; a trivial test workflow's form
      URL resolves publicly
- [ ] Verify: `free -h` shows swap active; reboot survives
- [ ] Completion log

### CP010 — n8n Image with Chromium

**Status:** pending · **Depends on:** CP009

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] Custom image: n8n + Chromium/Playwright, ARM/x86 matching the instance
- [ ] Chromium launched with `--single-process --no-zygote
      --disable-dev-shm-usage` and `printBackground: true` preserved
      (`RULES.md` §11a)
- [ ] n8n execution concurrency limited to 1 for PDF work (PRP §5.3)
- [ ] Verify: **render a real brochure HTML to PDF inside the container** and
      confirm the process does not OOM — measure peak memory with swap in play
- [ ] Verify: the PDF has backgrounds/gradients intact (the classic
      `printBackground` failure)
- [ ] Record the measured headroom; if it is marginal, escalate the
      instance-size decision (PRP R1) rather than hoping
- [ ] Completion log with the memory measurements

### CP011 — Showcase Workflow Migration

**Status:** pending · **Depends on:** CP010

**Expect this to be the longest CP** — the OAuth re-authorisation, not the
export/import, is the work (PRP R2).

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] Export the 7 showcase workflows from local n8n (ids in `PRP.md` §3)
- [ ] Import to the AWS instance; keep them **inactive** until verified
- [ ] Recreate credentials on the new instance (never copy encrypted values
      between instances with different encryption keys):
  - [ ] KobiLLM, OpenRouter, Groq, OpenCode Zen — header auth, straightforward
  - [ ] Google Sheets OAuth2 — add the new redirect URI in Google Cloud
        console, re-consent
  - [ ] Google Drive OAuth2 — same
  - [ ] Gmail — same
  - [ ] Telegram Bot — token only
  - [ ] Notion, Slack — re-authorise against the new host
  - [ ] SMTP (Meeting Notes) — reconsider vs. SES once CP016 exists
  - [ ] WordPress OAuth — redirect URI is currently
        `http://localhost:5678/rest/oauth2-credential/callback`; must be
        updated or the credential dropped if the demo variant no longer
        publishes (PRP D8)
- [ ] Verify **each** workflow with one real run on AWS before activating it
- [ ] Verify: the local n8n still runs its other 30 workflows unaffected
- [ ] Completion log with a per-credential outcome table

### CP012 — Demo-Safe Workflow Variants

**Status:** pending · **Depends on:** CP011

Implements PRP §5.2. Originals are never exposed publicly.

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] `Aritcle Geo Builder — Demo`: duplicate; final output **DOCX returned to
      the visitor**; WordPress publish, Article API post, Drive/Sheets/Telegram
      writes all removed (PRP D8)
- [ ] `SWOT Generator — Demo`: duplicate; return the document instead of
      emailing the owner's Gmail
- [ ] `Meeting Notes — Demo`: duplicate; no Notion page, no Slack message, no
      SMTP send; return the notes document
- [ ] `ig Content Builder For Demo`: already demo-safe — **verify** that claim
      node by node rather than assuming it, since it still carries Sheets,
      Telegram, and Gmail credentials
- [ ] Itinerary, Receipt OCR Core, Receipt to Excel: confirmed no private side
      effects; no variant needed
- [ ] Verify: for each exposed workflow, a demo run writes to **no** private
      integration — checked in the execution data, not inferred from the graph
- [ ] Completion log with the per-workflow side-effect audit

### CP013 — Demo Abuse and Cost Guards

**Status:** pending · **Depends on:** CP012

Implements PRP §5.3. **No demo URL is published until this passes.**

- [ ] Ask Question gate — the actual daily cap numbers and the owner's
      tolerance for demo spend
- [ ] Implementation plan
- [ ] Per-IP rate limit at Caddy on `/form/*` and `/webhook/*`
- [ ] Per-workflow daily cap; on exceeding it, return a graceful "quota
      reached, here is a sample output" response that calls **no** model
- [ ] Input size caps for the six non-itinerary demos (the itinerary product
      already has `config.json → limits`)
- [ ] Honeypot on the CP017 form
- [ ] Verify: exceeding the per-IP limit returns the intended response —
      **tested**, not configured-and-assumed (`RULES.md` §5a phase 5)
- [ ] Verify: exceeding the daily cap serves the sample and triggers no
      provider call, confirmed from the execution log
- [ ] Completion log

---

## Phase 3 — Itinerary product on AWS

### CP014 — Itinerary Subdomain and Landing Page

**Status:** pending · **Depends on:** CP003, CP007

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] CloudFront distribution/behaviour + DNS for `itinerary.satryapudja.site`
- [ ] Port `repeatable/t/itinerary-generator.html` — the one page whose content
      survives (PRP §6) — de-branded from Repeatable, catalog links removed,
      `hello@repeatable.co` capture form replaced
- [ ] Keep the fixes verified in September 2026: pill highlights, aligned FAQ,
      working CTA target
- [ ] **Rendered visual verification** at both widths
- [ ] Completion log

### CP015 — Itinerary PDF Generation in Cloud

**Status:** pending · **Depends on:** CP010
**Closes:** `itinerary-engine` CP011

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] Playwright HTML → PDF inside the CP010 container, `printBackground: true`
- [ ] Temp file names use `$execution.id`, never `Date.now()`
      (`SPEC.md` §9.1.8)
- [ ] `Handle PDF Failure` branch; HTML retained on failure
- [ ] Verify: `break-inside: avoid` holds — **confirmed from a rendered
      multi-page PDF**, which already found real problems in this product
      before (the September 2026 revision found day cards fitting only after
      inspection)
- [ ] Verify: page count within `SPEC.md` §4.3 for each mode
- [ ] Verify: the known pagination inefficiency (near-empty pages after the
      hero and day index, recorded in `cp009_completion-log`) is either fixed
      here or explicitly re-accepted
- [ ] **Rendered visual verification of the PDF specifically**
- [ ] Completion log **in both** `satryapudja-site/logs/` and
      `itinerary-engine/logs/` (revision entry on CP011)

### CP016 — Itinerary Publish Link and SES Delivery

**Status:** pending · **Depends on:** CP015, CP002
**Closes:** `itinerary-engine` CP012

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] Brochure HTML + PDF stored in S3 under an unguessable token
- [ ] Served at `itinerary.satryapudja.site/b/<token>`, **6–12 month
      lifetime — explicitly not the 24-hour pattern** from Website Research
      Engine (`SPEC.md` D5)
- [ ] Retention/cleanup policy decided and written down
- [ ] SES email to the agent's address, PDF attached, link included, body in
      the resolved output language
- [ ] Attachment verified present and non-zero length
- [ ] `Handle Delivery Failure` — generated files retained
- [ ] Verify: the link resolves and **still resolves well beyond 24 hours**
- [ ] Verify: the token cannot be guessed or enumerated
- [ ] Verify: SES is out of sandbox (CP002) — otherwise this is `blocked`, not
      "works for my own address"
- [ ] Completion log in both places (revision entry on itinerary CP012)

### CP017 — Itinerary Self-Serve Form

**Status:** pending · **Depends on:** CP014, CP016
**Closes:** `itinerary-engine` CP016 (the only extra scope item per PRP D12)

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] `itinerary.satryapudja.site/app/` — `noindex`, same shell as the landing
- [ ] Full `SPEC.md` §12 field set plus `routePlan`
- [ ] **Per-day route rows generated from `tripScope` + `durationDays`** — the
      thing n8n's `formTrigger` architecturally cannot do, which is the entire
      reason this form exists
- [ ] Rows serialised into the **exact** CP014 grammar — one grammar, one
      parser, asserted against CP014's own fixtures
- [ ] Webhook node + `Normalize Webhook Payload` converging into the existing
      `Validate and Normalize Input`; the Form Trigger stays for internal
      testing
- [ ] CORS + `OPTIONS` preflight; honeypot; rate limit from CP013
- [ ] Client validation mirrors `LIMITS` but is never trusted
- [ ] Verify: **CORS preflight from the real page origin in a browser**, not
      curl
- [ ] Verify: oversized field rejected server-side with client JS disabled
- [ ] Verify: webhook and Form Trigger produce equivalent normalised output
- [ ] Verify: no credential in page source
- [ ] Completion log in both places

### CP018 — Itinerary End-to-End Verification on AWS

**Status:** pending · **Depends on:** CP017
**Closes:** `itinerary-engine` CP013

- [ ] Ask Question gate
- [ ] Implementation plan
- [ ] Full run in **each of the 4 modes** through the public form
- [ ] Indonesian and English submissions
- [ ] 14-day `multi_day` run — condensing verified
- [ ] High-spot-count guide run — grouping verified, not thinned
- [ ] `heroPhotoUrl` supplied — photo search skipped
- [ ] Obscure destination — gradient fallback, not a wrong photo
- [ ] Impossible-itinerary and 10-hour `half_day` fixtures — both rejected
- [ ] Confirm no monetary value, no opening hours or ticket prices, no OTA
      product-page tell
- [ ] Confirm the September 2026 output-completeness fixes still hold live on
      AWS: activity times and durations present, meal chips, transport notes,
      block tips, `localTips` topic labels, differentiated highlight icons
- [ ] **Rendered visual verification of final HTML and PDF**
- [ ] Only after all of the above passes: leave the itinerary workflow active
      (`RULES.md` §11)
- [ ] Completion log in both places

---

## Phase 4 — Cutover

### CP019 — Cutover and Repeatable Decommission

**Status:** pending · **Depends on:** CP008, CP018

- [ ] Ask Question gate — what happens to `repeatable.co` itself (let it
      lapse, redirect it, or keep it parked) and whether `repeatable/` stays in
      the repo as history or is deleted
- [ ] Implementation plan
- [ ] All demo CTAs on `/w/*` pages switched from "coming soon" to live URLs
- [ ] Final pass: no `repeatable.co` reference anywhere in the deployed site
- [ ] EBS snapshot taken; AWS budget alarm confirmed active and tested
- [ ] Verify: every success criterion in `PRP.md` §7 is met, item by item
- [ ] Verify: the other five products in this repo are unchanged
- [ ] Completion log

---

## Follow-ups (not yet CPs)

Recorded so they are not silently absorbed into an active CP
(`RULES.md` §10).

- Revisit PRP D12: credential hardening (Secrets Manager) and a real
  backup/monitoring workstream. Both were declined for this round; PRP R5/R6
  explain the residual exposure.
- Instance right-sizing after CP010's measurements (PRP R1) — decide with data
  whether t3.micro survives public demos or t3.small/t4g.small is needed.
- Blog / Article API, if the Geo Article Builder demo makes it worth having
  (PRP D8 removed the dependency for now).
- Move Meeting Notes off SMTP to SES once CP016 proves the SES path.
- CAPTCHA on demo forms if the honeypot plus rate limits prove insufficient.
- A second AWS region or any redundancy — deliberately absent (PRP R4).
