# Product evaluation — AI Marketing Studio

*Saved from planning session. Re-read when deciding what to build next.*

---

## 1. What you had (`seadance-video`) — technical reality

Your original app is a **working internal studio**, not yet a **public consumer product**.

| Area | Status |
|------|--------|
| **Image (Nano Banana)** | ✅ Step 1 API + UI; hand off URL to video |
| **Video (Seedance)** | ✅ Text / image-to-video / reference modes via fal |
| **Clean export (no AI subs on video)** | ✅ Partially — avoid on-screen text, negative prompt, skip post-process |
| **Post-process (subs / Cantonese dub)** | ✅ Separate section; local Whisper or OpenAI + optional Azure |
| **Cost control** | ✅ Free / Hybrid / Pro presets |
| **UI/UX for beginners** | ⚠️ Weak — one long page, many expert fields |
| **Templates** | ❌ Not in old app (✅ started in new app) |
| **AI assistant** | ❌ Not built |
| **Accounts, billing, limits** | ❌ Not built |
| **Project save / history** | ❌ Not built |
| **Real video editor** | ❌ Only post-process mux, not timeline editing |

**Core flow you wanted already exists:**

```
Nano Banana image → (optional) Seedance image-to-video → (optional) post-process OR download raw MP4
```

What was missing: **product design** — wizard, templates, assistant, error help, multi-user SaaS.

---

## 2. Vision vs current — gap map

| Your goal | Can current stack do it? | What’s missing |
|-----------|-------------------------|----------------|
| Nice, easy UI | **Partly** | Wizard, hide advanced by default, progress bar, previews |
| Image → video pipeline | **Yes** | One-click “Continue to video” (now in new app) |
| Export without subs/voice | **Yes** | Preset “Marketing raw clip” + clear copy |
| Professional tool next step | **Yes** | Download + CapCut/Premiere guidance |
| Templates (edit photo + prompt) | **Started in new app** | More templates + reference photo slots |
| AI assistant (step-by-step) | **Not yet** | Chat + workflow engine |
| Beginners get good results | **Partly** | Guardrails, retries, plain-language errors |
| Public website | **Not yet** | Auth, payments, rate limits, legal, support |

**Rough completion vs full vision: ~25–35%** (strong engine, weak product) → **Phase 1 wizard adds ~10–15%**.

---

## 3. Evaluation #1 — Competition & public use

### Strengths (if positioned correctly)

1. **End-to-end in one place** — image → motion → optional Cantonese finish.
2. **SMB marketing angle** — “FB/IG ad in 10 minutes” beats generic AI video.
3. **Painful details already solved** — motion strength, no on-screen text, cost presets, duration fallback.
4. **Vertical templates** — crystal shop, restaurant, tutor, real estate — competitors rarely nail HK/Cantonese + local ad formats.

### Competition

| Type | Examples | Risk |
|------|----------|------|
| All-in-one design | Canva, CapCut | Easier UX, huge brand |
| AI video only | Runway, Pika, many wrappers | Same APIs |
| Ad-specific AI | Creatify, Omneky | Strong template + script story |
| DIY | User uses fal directly | Power users skip your app |

**Verdict:**

- As **another generic AI video site** → hard to win publicly.
- As **guided marketing studio for SMB** (templates + assistant + image→video + optional subs) → **workable niche**, especially HK / Cantonese / Chinese SMB.

### Public launch workable?

**Yes as a business — not by shipping the old UI as-is.**

| Must-have | Old app | New app (Phase 1) |
|-----------|---------|-------------------|
| User accounts + limits | ❌ | ❌ |
| Payments | ❌ | ❌ |
| API keys server-side | ✅ | ✅ |
| Content policy | ❌ | ❌ |
| fal commercial terms | ⚠️ verify | ⚠️ verify |
| Stable UX on failure | ⚠️ | ⚠️ improving |

**Path:** closed beta → invite SMB → then public SaaS.

---

## 4. Evaluation #2 — AI assistant for beginners

### Can you build an assistant that guides end-to-end?

**Yes — likely your biggest advantage over raw fal.**

Assistant must:

1. Ask intent — product ad? testimonial? language?
2. Pick template — fills aspect ratio, duration, motion, negative prompt.
3. Write prompts — image + video in user’s language.
4. Drive the UI — auto-fill fields, show preview, next step.
5. Explain failures — duration 2s not supported, lower motion, etc.
6. Choose path — clean MP4 vs subtitles vs export SRT for CapCut.

**Tech:** OpenAI / Claude + workflow state machine. Existing APIs stay; assistant orchestrates.

### Why beginners struggled (old app)

| Problem | Cause |
|---------|--------|
| Don’t know where to start | 3 big sections, advanced options visible |
| Unwanted subtitles on AI video | Post-process vs generate confused |
| 2–3 second video fails | API limit; fallback easy to miss |
| Too many fields | Endpoints, reference mode, ASR providers |

**Assistant + Guided mode** fixes most without new AI models.

---

## 5. Evaluation #3 — Templates for SMB marketing

Templates = **saved configuration** (JSON): prompts, 9:16, duration, motion, negative prompt.

User edits: reference photo, short text fields, optional style.

| Template | Who | User edits |
|----------|-----|------------|
| Product showcase 9:16 | Retail, crystal, beauty | Product photo + name |
| Shop announcement | F&B, local store | Photo + offer |
| Testimonial style | Services | Photo + quote |
| Logo + hero | Any SMB | Logo + one line |

**Strong fit** for “save time on marketing materials.” **Compatible** with current fal stack.

---

## 6. Can you achieve the outcome?

| Question | Answer |
|----------|--------|
| Technical foundation enough? | **Yes** |
| Current old app enough for public beginners? | **No** |
| Get there without changing AI vendor? | **Yes** |
| Workable public project? | **Yes in a niche** |
| MVP friendly beta | **~6–10 weeks** focused work after Phase 1 |
| Full public SaaS | **Months** |

### Target product shape

```
Home: "What do you want to make?"
  → AI Assistant (wizard)
  → 1. Image (Nano Banana)
  → 2. Video (Seedance)
  → 3. Finish: A) Download clean  B) Add subs  C) Tips for CapCut
```

**Two modes:** Simple (default) · Pro (old seadance-video features)

---

## 7. Scorecard

| Dimension | Score (1–10) | Note |
|-----------|--------------|------|
| Technical pipeline | **8** | Solid fal integration |
| UI/UX for public | **4** → **6** after Phase 1 wizard | Improving in new app |
| Beginner success rate | **5** | Needs assistant |
| Competition differentiation | **6** | Templates + assistant + niche |
| Public SaaS readiness | **3** | No billing/auth |
| SMB marketing fit | **8** | Real opportunity |
| Achievability with current stack | **9** | No vendor swap for v1 |

---

## 8. Recommended build order

1. **Guided wizard UI** — hide advanced; linear steps; previews *(Phase 1 — started)*
2. **5–10 JSON templates** — expand beyond 4 starters
3. **Assistant v1** — LLM fills prompts + explains errors
4. **Project history** — save URLs + settings per job
5. **Closed beta** — 20 SMB users, charge per pack
6. **Auth, Stripe/credits, rate limits, terms**

**Do not** build Premiere-like editor in v1 — link to CapCut for pro edit.

---

## 9. API cost reminder (per ad)

| Item | Approx. cost |
|------|----------------|
| 1× Nano Banana image | ~$0.04–0.08 |
| 6–8 sec Seedance fast 480p | ~$1.45–1.90 |
| 10 sec 720p standard | ~$3+ |
| Post-process local only | ~$0 |

Charge **service prices** (e.g. HK$300–1500 per ad), not API passthrough.

---

## 10. Direct answers (original three questions)

**First — How good? Public / competition?**  
Very good for **narrow audience** (SMB social ads, Chinese/Cantonese). Hard as generic AI video without templates + assistant.

**Second — Assistant for beginners?**  
**Yes**, if it controls workflow, not only chats. Backend ready; assistant is new product layer. Set expectation: 2–3 tries may be needed.

**Third — SMB templates?**  
**Yes, highly aligned** and achievable on current fal setup.

---

*Last updated: Phase 1 scaffold on Desktop (`ai-marketing-studio`).*
