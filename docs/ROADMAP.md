# Build roadmap — Alchemy AI Lab (`alchemy-studio`)

Check off items as you complete them. Tell AI in a new chat: *"Continue Phase X from docs/ROADMAP.md"*.

**Status (2026-07):** Auth, token billing (Stripe), library (Mongo + R2), captions, edit-image, Pro canvas, legal pages, and transactional email are **shipped**. Remaining work is polish, ops, and launch.

---

## Phase 1 — Guided MVP ✅

- [x] Wizard UI (template → image → video → download)
- [x] Marketing templates + micro-wizard paths
- [x] fal image/video pipeline (Nano Banana / Seedance)
- [x] Brand: Alchemy AI Lab (`lib/brand.ts`)

---

## Phase 2 — Polish guided experience (partial)

- [x] Simplified ad style picker
- [x] Built-in reference clip library structure (`public/references/`)
- [ ] Add 2–3 MP4 reference clips to `public/references/` *(optional — research/upload is the main path)*
- [ ] Better error messages (map fal errors to plain English / 中文)
- [ ] Loading progress + estimated time on video step
- [ ] Template preview thumbnails (static examples)
- [ ] Wire or remove unused `TemplateGallery.tsx` on landing

---

## Phase 3 — AI assistant ✅ (core)

- [x] `/api/assistant` + sidebar coach on wizard
- [x] Assistant can set template / product text / prompts
- [x] Locale strings (EN / 繁中 / 简中)
- [ ] Stronger “explain this error” on every generation failure

---

## Phase 4 — Pro + post-gen tools ✅ (core)

- [x] `/pro` node canvas (upload → image → video)
- [x] `/captions` burn / soft captions (R2 for large uploads)
- [x] `/edit-image` Konva canvas + library handoff
- [x] Hide `/captions/visual` + `/ugc` unless `NEXT_PUBLIC_ENABLE_BETA_SURFACES=1`
- [ ] Fix Pro `costHint` copy (tokens only — not “API credits on credentials”)
- [ ] Link or merge — decide if `seadance-video` is retired

---

## Phase 5 — Projects & history ✅ (core)

- [x] Mongo projects + assets library
- [x] Durable media via R2 (`persistAndDurablize`)
- [x] Done → captions / edit-image handoffs
- [ ] Ensure every save prefers R2 URLs (no silent fal-only fallback in prod)
- [ ] Duplicate project as new template run

---

## Phase 6 — Public beta / SaaS ✅ (core) — ops remaining

- [x] Auth (Clerk)
- [x] Credits / subscription + top-ups (Stripe webhook + portal)
- [x] Terms, privacy, refund pages (EN / 繁中 / 简中)
- [x] Landing + pricing
- [x] Welcome / purchase / subscription-ended email (Resend → Reply-To `support@alchemyailab.com`)
- [ ] Per-user rate limits + cost cap *(deferred by choice)*
- [ ] Confirm fal.ai commercial / resale terms with counsel
- [ ] Cookie consent if required for your region
- [ ] Self-serve account / data deletion (beyond mailto)

---

## Phase 7 — Marketing launch (in progress)

- [ ] 5 example videos for landing page (durable assets, not fal CDN)
- [x] `robots.txt` + sitemap + Open Graph / Twitter images
- [x] Content-Security-Policy header
- [ ] Mixpanel + Sentry DSN on production
- [ ] Public `/api/health` (uptime; not Clerk-gated)
- [ ] FB/IG ad / waitlist or soft launch
- [ ] Onboard 10–20 SMB beta users
- [ ] Iterate from feedback

---

## Ops checklist (before calling “production ready”)

| Item | Why |
|------|-----|
| Mongo + R2 live | Library URLs must not be fal-CDN-only (those expire) |
| Stripe live prices + webhook | Grants tokens after pay |
| Resend + verified From | Signup / checkout emails actually send |
| `NEXT_PUBLIC_APP_URL` | Correct links in email + Stripe redirects |
| Smoke: signup email, paid email, old asset still plays | Proves email + durability |

---

## What stays in `seadance-video`

Use the **old app** only for experimental / power-user work not yet mirrored here. Do **not** delete it unless you explicitly retire it.
