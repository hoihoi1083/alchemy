# OfferToday-Style SaaS Pre-Roll Playbook

**Alchemy Studio `/studio` wizard — Path 10 (primary) & Path 8 (alternative)**

*Target: ~30s YouTube pre-roll for HR / recruitment SaaS (e.g. OfferToday — “AI精準配對理想人才”)*

**Last updated:** 2026-07-12 · Spec v0.5

---

## 1. Reference ad structure

| # | Beat | Visual | Role |
|---|------|--------|------|
| 1 | Hands typing fast | B-roll stress | Problem hook |
| 2 | Office worker, papers flying | Chaos metaphor | Problem |
| 3 | Close-up tired HR worker | Emotional beat | Problem |
| 4 | Phone on desk — lock-screen notification | Product hero | Solution reveal |
| 5 | Hand holding phone — candidate cards / AI match UI | Product demo | Solution |
| 6 | Young professional in café using app | Lifestyle payoff | CTA mood |

**Recommended path:** **Path 10 — Concept / Combined / Cinematic stitch**

Multi-beat story, generic professionals (not celebrities), service/concept promo, ~8s × 4–6 scenes → stitch ≈ 30–48s.

| Goal | Path | When |
|------|------|------|
| Build from scratch (no reference MP4) | **Path 10** | Default for this ad type |
| Match pacing of existing SaaS ad MP4 | **Path 8** | You have a similar pre-roll to upload |
| Single 8–12s hero clip only | Path 9 | Quick test, one beat |

---

## 2. Critical rules

| Rule | Detail |
|------|--------|
| **AI generates** | People, environment, blank/blurred phone |
| **You composite in post** | App UI, notifications, candidate cards, logos, readable text |
| **Reference = style only** | Reference MP4/image = pacing & look; your `conceptIdea` = content topic |
| **No celebrities** | Generic faces only — model filters + product policy |
| **Textless phone beats** | Set `imageTextMode: textless` — Seedance cannot do readable UI |

---

## 3. Path 10 — micro-step map

```
Start
└── 圖片+影片 [combined]                    → workflowMode: combined
    └── 概念 [concept]                      → promotionMode: concept
        └── 概念助手 [required]             → conceptIdea + optional fields
            └── 直接創作                       → direct intake
                └── 內容與生成設定             → headline / subline / offer / business
                    └── 創意簡介             → creativeVideoBrief (6-beat script)
                    └── 電影感 4–6 scenes      → cinematicSceneCount
                    └── 畫面風格 寫實          → artStyleId: realistic
                    └── 影片設定 8s × N        → videoSettings
                        └── 生成電影感場景圖    → Image step: plan + generate stills
                            └── 影片 stitch     → Video step: Seedance × N → one MP4
                                └── 完成匯出      → Done → CapCut UI composite
```

---

## 4. Beat → scene → AI wiring

| Beat | Scene role | Image (Nano Banana) | Video (Seedance) | User input weight |
|------|------------|---------------------|------------------|-------------------|
| 1 Typing | hook / stress | Hands on keyboard, office bokeh, textless | Subtle motion, shallow DOF | `creativeVideoBrief` + `subjectFraming: hands-only` |
| 2 Papers | chaos | Woman at desk, papers mid-air | Dynamic ambient motion | Concept metaphor in brief |
| 3 Close-up | pain | Generic HR worker, tired expression | Slow push-in | Avoid celebrity names |
| 4 Phone desk | product-hero | Phone on notebook, blank/blurred screen | Slow push-in on device | **Composite UI in post** |
| 5 App UI | demo | Hand + phone, textless screen | Minimal motion | Figma mock → overlay |
| 6 Café | payoff | Young professional in café | Gentle lifestyle motion | `conceptIdea` anchors message |

---

## 5. Complete path — all user inputs (Path 10)

**Target output:** ~32–40s stitched pre-roll (4–5 × 8s clips) + post composite for phone UI.

### Step 0 — Entry

| User action | Required |
|-------------|----------|
| Open `/studio` or Start from landing | — |

### Step 1 — Setup: output & subject

| # | UI | User picks | State field | OfferToday example | Req |
|---|-----|------------|-------------|-------------------|-----|
| 1.1 | Workflow | 圖片+影片 Both | `workflowMode` | `combined` | ✓ |
| 1.2 | Promotion mode | 概念 Concept | `promotionMode` | `concept` | ✓ |
| 1.3 | Path shortcut | 電影感 Cinematic | `visualStyleId` | `concept-cinematic` | ✓ |
| 1.4 | Scene count | 4 or 5 scenes | `cinematicSceneCount` | `5` → 40s | ✓ |

**Do not pick:** 平台研究, 參考短片 MP4, Ship-it, storyboard-video, product-assistant.

### Step 2 — 概念助手

| # | Field | State | OfferToday example | Req | → AI |
|---|-------|-------|-------------------|-----|------|
| 2.1 | Concept idea | `conceptIdea` | OfferToday — AI 招聘 App，幫 HR 精準配對理想人才 | ✓ | Cinematic plan, copy |
| 2.2 | Audience | `conceptAudience` | 香港中小企 HR、招聘經理 | — | plan-concept |
| 2.3 | Pain | `conceptPain` | 履歷太多、篩選慢、錯配 | — | plan-concept |
| 2.4 | Promise | `conceptPromise` | AI 秒級配對合適人選 | — | plan-concept |
| 2.5 | Proof | `conceptProof` | 已服務 500+ 企業 | — | plan-concept |
| 2.6 | CTA | `conceptCta` | 免費試用 / 立即下載 | — | plan-concept |
| 2.7 | Visual metaphor | `conceptVisualMetaphor` | 由文件風暴 → 手機一則通知解決 | — | plan-concept |
| 2.8 | AI 分析概念 (optional) | fills headline, subline, offer | — | — | Gemini vision |

**Gate:** At least one of `conceptIdea`, `headline`, `creativeVideoBrief` before generate.

### Step 3 — 內容與生成設定

| # | Field | State | OfferToday example | Req | → AI |
|---|-------|-------|-------------------|-----|------|
| 3.1 | Headline / Hook | `headline` | AI精準配對理想人才 | Rec | Planners, ad pack |
| 3.2 | Subline | `subline` | 履歷海淹沒你？一則通知配對合適人選 | — | Planners |
| 3.3 | Business | `business` | OfferToday | — | Brand, planners |
| 3.4 | Offer / CTA | `offer` | 免費試用 · 立即下載 | — | Ad pack |
| 3.5 | Market | `promptMarket` | hk / tw / cn | Def hk | Copy tone |
| 3.6 | Brand kit | `brandKit` | logo, #0066FF | — | Nano Banana |
| 3.7 | Advanced prompt | `promptExtra` | Extra art direction | — | effectivePromptExtra() |

### Step 4 — 創意簡介

| # | Field | State | Req | → AI |
|---|-------|-------|-----|------|
| 4.1 | Creative video brief | `creativeVideoBrief` | ✓ | `/api/plan-cinematic-reel` |

**Paste this story script:**

```text
Beat 1 — Stress: Fast hands typing on keyboard, HR overwhelmed.
Beat 2 — Chaos: Office worker at desk, papers flying in slow-motion metaphor.
Beat 3 — Pain: Close-up tired HR manager, blue office light, no celebrity likeness.
Beat 4 — Product: Smartphone on desk, lock screen glow (NO readable UI — blank for post composite).
Beat 5 — Demo: Hand holding phone, candidate profile cards (textless — UI in CapCut).
Beat 6 — Payoff: Young professional in bright café, smiling at phone, relief mood.
Tone: Premium SaaS TVC, photorealistic, cool blues → warm café ending.
Do NOT use famous faces or real brand logos on phone.
```

### Step 5 — Visual & video settings

| # | UI | State | OfferToday pick | Req | → AI |
|---|-----|-------|-----------------|-----|------|
| 5.1 | 畫面風格 | `artStyleId` | realistic | Def | Nano Banana + Seedance |
| 5.2 | 影片時長 | `videoSettings.duration` | 8 per clip | ✓ | Each Seedance clip |
| 5.3 | Resolution | `videoSettings.resolution` | 720p / 1080p | Def | fal billing |
| 5.4 | Fast mode | `videoSettings.fast` | On draft / Off final | — | endpoint |
| 5.5 | Aspect ratio | `imageAspectRatio` | 16:9 or 9:16 | Def | Scene stills |
| 5.6 | Image text mode | `imageTextMode` | textless | ✓ | Avoid garbled UI |
| 5.7 | Subject framing | `subjectFraming` | hands-only or auto | — | Planners |

### Step 6 — Optional assets

| # | Asset | State | OfferToday | Req |
|---|-------|-------|------------|-----|
| 6.1 | Reference image | `imageRefPhoto` | Blurred screenshot / mood board | — |
| 6.2 | Product photo | `productPhoto` | None (SaaS) | ✗ |
| 6.3 | Reference MP4 | `referenceAd` | None on Path 10 | ✗ |
| 6.4 | Brand website | `brandWebsiteUrl` | Not for Path 10 | ✗ |

**Continue Setup** → Image step.

### Step 7 — Image step: cinematic scene stills

| # | Action | What happens |
|---|--------|--------------|
| 7.1 | Generate image | Detects `concept-cinematic` |
| 7.2 | Auto plan | `POST /api/plan-cinematic-reel` → DeepSeek scene plan |
| 7.3 | Auto render | `POST /api/generate-cinematic-scenes` → Nano Banana stills |
| 7.4 | Wait | 4–5 stills in variant picker |

**API inputs from Setup:**

| API field | Source state |
|-----------|--------------|
| `creativeBrief` | `creativeVideoBrief` OR join headline, subline, offer, conceptIdea |
| `headline`, `subline`, `offer`, `business` | copy.edit |
| `promptExtra` | effectivePromptExtra() |
| `promptMarket` | promptMarket |
| `artStyleId` | artStyleId |
| `sceneCount` | cinematicSceneCount |
| `referenceImageNote` | conceptImageVisionNote |

**5-scene mapping:**

| Scene | Role | Still content | Text in AI? |
|-------|------|---------------|-------------|
| 1 | hook | Hands + keyboard | No |
| 2 | chaos | Papers flying | No |
| 3 | pain | HR close-up | No |
| 4 | product | Phone on desk | No — composite later |
| 5 | payoff | Café + phone | No — composite later |

### Step 8 — Video step: stitch + ad pack

| # | UI | State / action | OfferToday | Req |
|---|-----|----------------|------------|-----|
| 8.1 | Scene preview | `cinematicScenes[]` | Review 5 stills | ✓ |
| 8.2 | Video settings | `videoSettings` | creativity, motion | — |
| 8.3 | Ad pack | VO, captions, music | zh-HK VO, cinematic BGM | — |
| 8.4 | BGM | `bgmTrack`, `musicMood` | Upbeat → premium | — |
| 8.5 | Generate video | makeCinematicStitchVideo() | 5 × ~8s Seedance | ✓ |

**Per-scene Seedance:** `imageUrl` + `videoMotionPrompt` + `artStyleId` + 8s per clip.

### Step 9 — Done + post-production

| # | Task | Tool |
|---|------|------|
| 9.1 | Download stitched MP4 | Done step (~40s) |
| 9.2 | Design phone UI | Figma / Sketch |
| 9.3 | Composite UI on phone | CapCut / AE / DaVinci |
| 9.4 | Add supers | CapCut — e.g. AI精準配對理想人才 |
| 9.5 | Mix VO + BGM | CapCut or wizard dub |
| 9.6 | Export 16:9 + 9:16 | YouTube pre-roll + Reels |

---

## 6. Printable checklist (Path 10)

```
□ workflowMode: combined
□ promotionMode: concept
□ visualStyleId: concept-cinematic
□ cinematicSceneCount: 4 | 5 | 6
□ conceptIdea: (your app — fixed anchor)
□ headline / subline / offer / business
□ creativeVideoBrief: 6-beat story script
□ artStyleId: realistic
□ imageTextMode: textless
□ imageAspectRatio: 16:9 or 9:16
□ promptMarket: hk
□ videoSettings: resolution + fast
□ brandKit: optional
□ imageRefPhoto: optional mood only
□ Generate cinematic scenes → review stills
□ Generate stitch video
□ Post: composite app UI on phone beats
```

---

## 7. Path 8 alternative (reference SaaS MP4)

Use when you have a **similar ~30s HR/SaaS ad MP4** and want to **match its pacing**.

```
概念 → 概念助手 → 平台研究 (optional) → 上傳參考 MP4 [required]
  → video.settings (duration first)
  → wait.reel_analyze
  → copy.edit (fix copy for YOUR app)
  → 分鏡場景圖 → wait.storyboard_generate
  → 影片 (multi-image R2V) → done → UI composite
```

| Step | User inputs | State fields | Req |
|------|-------------|--------------|-----|
| 1 | Output: 影片 or 圖片+影片 | `workflowMode` | ✓ |
| 2 | Subject: 概念 | `promotionMode: concept` | ✓ |
| 3 | Concept idea + plan-concept | `conceptIdea`, headline, … | ✓ |
| 4 | Upload MP4 | `referenceAd` | ✓ |
| 5 | Duration before analyze | `videoSettings.duration` | ✓ |
| 6 | Reel analyze (auto) | `storyboardPlan` | auto |
| 7 | Fix copy for your app | headline, subline, offer | ✓ |
| 8 | Art style | `artStyleId` | — |
| 9 | Ref image (optional) | `imageRefPhoto` | — |
| 10 | Storyboard stills | `storyboardScenes[]` | ✓ |
| 11 | Multi-image R2V | `videoPrompt` | ✓ |
| 12 | Export + UI composite | — | Post |

**Reel analyze inputs:** effectivePromoteName, conceptIdea, headline, subline, offer, business, effectivePromptExtra(), artStyleId, subjectFraming, output_duration_sec, scene_count.

---

## 8. Capability matrix

| Capability | Supported? |
|------------|------------|
| Multi-scene 30s arc | ✓ Path 10 or Path 8 |
| Generic professional faces | ✓ |
| Famous celebrity faces | ✗ |
| Legible app UI in pure AI video | ✗ — composite in post |
| VO + captions + BGM | ✓ Video step ad pack |
| Hands-only B-roll | ✓ subjectFraming |

---

## 9. v2 micro-step IDs (upcoming UI)

When `NEXT_PUBLIC_WIZARD_V2=1` ships:

| Phase | MicroStepIds |
|-------|----------------|
| Setup | route.output_goal → route.subject → identity.concept → copy.edit → copy.creative_brief → video.settings → image.art_style |
| Scenes | image.generate / wait.image_generate |
| Video | video.generate / wait.video_generate |
| Finish | done.export |

---

*Alchemy Studio — experimental fork. Full spec: `docs/WIZARD_MICRO_STEPS.md` §12.*
