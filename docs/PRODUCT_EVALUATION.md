# Product evaluation — Alchemy AI Lab (`alchemy-studio`)

*Planning notes + current status. Re-read when deciding what to build next.*

**Last revised: 2026-07-27** — auth, Stripe tokens, library, captions, edit-image, Pro canvas, and legal are **in code**. Gaps below are launch polish / ops, not “SaaS not started.”

---

## 0. Current product status (Alchemy Studio)

| Area | Status |
|------|--------|
| Guided wizard (`/studio`) | ✅ |
| Pro canvas (`/pro`) | ✅ |
| Captions (`/captions`) | ✅ (large uploads need R2) |
| Edit image (`/edit-image`) | ✅ |
| Library / projects (Mongo + R2) | ✅ |
| Auth (Clerk) | ✅ |
| Billing (Stripe plans + top-ups + emails) | ✅ |
| Legal (privacy / terms / refund) | ✅ |
| Support email | ✅ `support@alchemyailab.com` |
| Rate limiting | ⏸ Deferred |
| SEO (robots / sitemap / OG) | ❌ |
| CSP header | ❌ |
| Reference MP4 pack | ❌ structure only |
| Public health probe | ❌ (`/api/db-health` needs login) |

**Rough completion vs full vision: ~70–80%** product + SaaS core; remaining is launch ops, SEO, polish, and growth features.

---

## 1. What you had (`seadance-video`) — technical reality

Original app = **working internal studio**. Alchemy Studio is the **public-facing product** fork (wizard + templates + `/pro`).

| Area | Old app | Alchemy Studio |
|------|---------|----------------|
| Image (Nano Banana) | ✅ | ✅ |
| Video (Seedance) | ✅ | ✅ |
| Clean export | ✅ | ✅ |
| Captions / burn | Post-process | ✅ `/captions` |
| Cost control | Free/Hybrid/Pro presets | ✅ Token plans + top-ups |
| UI for beginners | ⚠️ Long expert page | ✅ Wizard default |
| Templates | ❌ | ✅ |
| AI assistant | ❌ | ✅ Coach |
| Accounts, billing | ❌ | ✅ Clerk + Stripe |
| Project save / history | ❌ | ✅ Library |
| Real timeline editor | ❌ | ❌ Still out of scope |

**Core flow:**

```
Nano Banana image → Seedance video → download / captions / edit-image / library
```

---

## 2. Vision vs current — gap map

| Your goal | Status now | What’s left |
|-----------|------------|-------------|
| Nice, easy UI | **Mostly** | Error copy, progress ETAs, landing demos |
| Image → video pipeline | **Yes** | — |
| Export without subs/voice | **Yes** | — |
| Templates | **Yes** | More templates + real thumbnails |
| AI assistant | **Yes** | Deeper error explain |
| Beginners get good results | **Improving** | Guardrails, retries, plain-language fal errors |
| Public website / SaaS | **Core yes** | Rate limits (deferred), SEO, CSP, cookie/delete tooling |

---

## 3. Competition & public use

**Positioning:** guided marketing studio for SMB (templates + assistant + image→video + captions) — not generic AI video.

**Public launch:** workable as a niche SaaS **if** R2/Mongo durability, Stripe live, and Resend are confirmed in production. Do not launch on fal-CDN-only library URLs.

| Must-have | Status |
|-----------|--------|
| User accounts + token limits | ✅ |
| Payments | ✅ (configure live Stripe) |
| API keys server-side | ✅ |
| Legal pages | ✅ |
| fal commercial terms | ⚠️ still verify with counsel |
| Stable UX on failure | ⚠️ improving |

---

## 4. AI assistant for beginners

**Built:** sidebar coach orchestrates wizard steps / prompts.

**Still useful next:** one-tap “explain this error” on every fal failure; Cantonese-first tip quality.

---

## 5. Templates for SMB marketing

Templates remain **saved configuration** (prompts, ratio, duration, motion). Expand catalog + add static preview thumbnails before heavy ads.

---

## 6. Target product shape

```
Home → Studio wizard (default)
     → Pro canvas (power users)
     → Library / Captions / Edit image
     → Pricing (tokens)
```

**Do not** build Premiere-like editor in v1 — CapCut/export tips are enough.

---

## 7. Scorecard (revised 2026-07)

| Dimension | Score (1–10) | Note |
|-----------|--------------|------|
| Technical pipeline | **8** | Solid fal + compositor |
| UI/UX for public | **7** | Wizard + Pro; polish remaining |
| Beginner success rate | **6** | Assistant helps; error UX still weak |
| Competition differentiation | **7** | Guided SMB + local locales |
| Public SaaS readiness | **7** | Auth/billing/legal in; ops/SEO left |
| SMB marketing fit | **8** | Real opportunity |
| Achievability with current stack | **9** | No vendor swap for v1 |

---

## 8. Recommended next work (not “start SaaS”)

1. Prod smoke: signup email, paid checkout email, library asset after fal would expire  
2. Add reference MP4s or remove the empty picker  
3. SEO pack: robots + sitemap + OG  
4. Mixpanel + Sentry on prod  
5. Ship or hide Beta `/captions/visual` and orphan `/ugc`  
6. Rate limits / spend caps when you want abuse protection  
7. Closed beta with 10–20 SMBs → iterate  

---

## 9. API cost reminder (per ad)

| Item | Approx. cost |
|------|----------------|
| 1× Nano Banana image | ~$0.04–0.08 |
| 6–8 sec Seedance fast 480p | ~$1.45–1.90 |
| 10 sec 720p standard | ~$3+ |

Charge **token / plan prices**, not raw API passthrough. Pro canvas uses the same token billing.

---

## 10. Direct answers (original three questions)

**Public / competition?**  
Strong for **narrow** SMB social ads (esp. Chinese/Cantonese). Hard as generic AI video without templates + assistant — those are now in the product.

**Assistant for beginners?**  
**Yes**, and it exists; keep improving error explain + defaults.

**SMB templates?**  
**Yes**, highly aligned; expand catalog and add real demos on landing.

---

*See also `docs/ROADMAP.md` for phase checkboxes.*
