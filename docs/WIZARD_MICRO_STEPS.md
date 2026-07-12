# Wizard v2 — Micro-step funnel spec

**Status:** v0.5 — full path catalog (Paths 1–11) incl. concept/video + concept/combined  
**Scope:** Frontend-only refactor. **Minimal backend touch** only for concept research promote-target fix (see §9.5).  
**Goal:** Replace the monolithic Setup step with one-decision-per-screen funnels that write the same `useWizardState` fields and call existing `useStudioWizard` handlers.

---

## 1. Principles

| Rule | Detail |
|------|--------|
| Single source of truth | Keep `hooks/useWizardState.ts` unchanged; micro-steps only set fields + call existing handlers |
| Reuse gates | `evaluateProceedToImageGate`, `canGenerateImage`, `goNextFromSetup` logic, `finishImageStep`, video generate checks — split into per-screen validators, do not reimplement business rules |
| Reuse panels | Extract existing UI from `SetupStep`, `ImageStep`, `VideoStep` into screen components; no duplicate API calls |
| Dynamic step count | Progress bar shows **current index / estimated total**; total changes when branches differ (e.g. storyboard inserts scene-stills step) |
| Explicit wait screens | Any async op gets its own screen or full-screen overlay: `referenceAnalyzeBusy`, `researchReelAnalyzeBusy`, `imageBusy`, `videoBusy` phases |
| Escape hatch | `?wizard=classic` or “Advanced studio” link restores current 4-step wizard |
| Feature flag | `NEXT_PUBLIC_WIZARD_V2=1` or URL `?wizard=v2` until parity |
| Brand kit persistence | On funnel mount: load `brandKit` from localStorage + `/api/brand-kit`; apply silently if user skips UI |

---

## 2. Branch axes (decisions that route the graph)

These are the **user-visible** choices. Each maps to existing state:

| Axis | User label (zh / en) | State field(s) |
|------|----------------------|----------------|
| **A. Output goal** | 圖片 / 影片 / 圖片+影片 | `workflowMode`: `image-only` \| `video-only` \| `combined` |
| **B. Subject** | 產品 / 概念 | `promotionMode`: `physical` \| `concept` |
| **C. Intake path** | 平台研究 / 直接創作 | Branch flag `intakePath`: `research` \| `direct` (UI-only; research sets `promptExtra` marker via `applyContentAngleToWizard`) |
| **D. Image output format** | 單張 / A/B / Campaign 套圖 / 教學輪播 (**四選一**) | `imageOutputMode`: `single` \| `ab` \| `campaign` \| `teaching-carousel` |
| **E. Reference (direct)** | 參考圖 / 參考片 / 無 | `imageRefPhoto`, `referenceAd` + `referenceIsVideo`, `imageCreativeMode`, `videoCreativeMode` |
| **F. Visual style** | Usually **inferred**, not asked | `visualStyleId` — set by path defaults or research angle format |
| **G. Ship-it shortcut** | 一鍵出片 (optional) | `shipItMode` — only when eligible (see §8) |

### Format picker skip rule

Skip `image.output_format` when research angle already set `imageOutputMode` (e.g. teaching-carousel from a carousel post, campaign from a series angle, model-wear). Show a **read-only summary** (“已選：教學輪播”) with option to change.

### Brand kit vs brand website (do not merge)

| | **Brand Kit** (`brandKit`) | **Brand website** (`brandProfile`) |
|---|---------------------------|-------------------------------------|
| What | Logo, colors, fonts, tagline | AI analyze from URL |
| UI location | **Inside `copy.edit`** → collapsible **品牌設定** (optional) | Separate step `asset.brand_website` when style requires |
| Required? | **Never required** — `DEFAULT_BRAND_KIT` works | **Required** for `brand-fit` / `brand-campaign` / `brand-video` (physical) |
| Every path? | **Yes** — same slot on every `copy.edit` screen | **Only** brand-style paths |
| Persistence | Account-level (localStorage + MongoDB) + optional **Settings** link | Per-session analyze result |

**Rule:** Every path that includes `copy.edit` (內容與生成設定) **must** show the optional **品牌設定** section — collapsed by default on Path 2; expanded-by-default when `isBrandVisualStyle(visualStyleId)`.

### Concept identity vs research (Path 3 & 4)

**`identity.concept` = 概念助手（非實體產品）** — not a generic title field. Includes:

| UI | State | Required? |
|----|-------|-----------|
| 概念 idea textarea | `conceptIdea` | ✓ Path 3 & 4 |
| Audience / pain / promise / CTA / metaphor | local → `/api/plan-concept` | Optional |
| AI 分析 button | fills `headline`, `subline`, `offer` | Optional |
| 主標題 | `headline` | Partial (gates) |

**Path 4 is NOT “Path 3 minus research”.** Path 4 = **Path 2 structure + 概念助手** (direct intake, optional user ref upload).

#### Data layers after research (Path 3) — what each field is for

When the user picks a reference post on Path 3, **only style flows from the post**. Topic and copy stay anchored on the user’s concept.

| Layer | Source | Must NOT |
|-------|--------|----------|
| **Topic / concept** | User’s `conceptIdea` from **概念助手** — **fixed anchor** | Be overwritten by reference post title, hook, or engagement bait |
| **Search / post** | Reference **style only** (layout, pacing, visual mood, format) | Become the headline, subline, or concept topic |
| **Headline / subline** | Rewritten **for your concept**, using reference **format** | Paste raw reference hook (e.g. 「留下你支持的4支球隊」 from a 世界杯 post) |
| **promptExtra** | Style-only block via `styleReferencePromptBlock()` | Copy reference subject matter *(already mostly correct today)* |

**User review screen:** `copy.edit` (**內容與生成設定**) is where the user fixes anything that still looks wrong after research apply — e.g. a World Cup headline that leaked from a style reference post while the concept was 餐廳訂位.

#### v2 implementation rule — concept research promote target (§9.5)

**Required before Path 3 ships.** Small wiring change; same APIs.

1. **Research promote target:** Pass `conceptIdea` (or `wizardPromoteName({ promotionMode: 'concept', conceptIdea, headline, product })`) into `ContentResearchPanel` as the promote target — **not** bare `product` (empty on concept paths).
2. **On angle apply:** If the user already has `conceptIdea`, **do not replace it** with the reference hook/title. Rewrite `headline` / `subline` for the promote target + angle **format** only.

**Bug today:** `SetupStep.tsx` passes `promoteProduct={product}` only. Angle apply can paste the reference hook into `headline` while `promptExtra` correctly says “do NOT copy reference topic”. Full fix spec: **§9.5**.

---

## 3. `MicroStepId` catalog

Every screen in the v2 funnel. IDs are stable for routing, analytics, and i18n keys (`m.microWizard.{id}`).

### 3.1 Entry & routing

| ID | Screen | Required to continue | State / handler |
|----|--------|----------------------|-----------------|
| `entry.start` | Landing CTA → Start | — | Navigate to funnel |
| `route.output_goal` | Pick Image / Video / Both | ✓ | `setWorkflowMode` |
| `route.subject` | Pick Product / Concept | ✓ | `promotionMode` (prop) |
| `route.intake` | Research vs Direct | ✓ | `intakePath` (local) |

### 3.2 Identity & copy

| ID | Screen | Required | State |
|----|--------|----------|-------|
| `identity.product_name` | Product name | ✓ if physical | `product` |
| `identity.concept` | **概念助手（非實體產品）** — `conceptIdea` + optional plan-concept + `headline` | ✓ concept paths | `conceptIdea`, `headline`, plan-concept fields |
| `copy.edit` | **內容與生成設定** — see below | Partial (see gates) | `headline`, `subline`, `business`, `offer`, `promptExtra`, `brandKit` |
| `copy.storyboard_brief` | Storyboard / reel brief | ✓ if `storyboard-video` | `storyboardBrief` |
| `copy.creative_brief` | Creative video brief | ✓ if `creative-video` (physical video) | `creativeVideoBrief` |

#### `copy.edit` — 內容與生成設定 (unified pre-generate screen)

One screen before image generate where the user reviews and edits everything that affects output:

| Section | Fields | Required? | Pre-filled from research? |
|---------|--------|-----------|---------------------------|
| **User copy** | Hook / `headline`, `subline`, `offer`, `business` | Partial (gates) | ✓ Pre-filled — must be rewritten for **user’s product/concept**, never reference topic. **Path 3:** user must review here even when auto-copy is wrong (§9.5). |
| **品牌設定** (collapsible) | Logo, `primaryColor`, `secondaryColor`, `accentColor`, `fontPreset`, `tagline` via `BrandKitPanel` | **Optional always** | ✓ Loaded from saved account kit on mount |
| **Reference brief** (read-only) | Layout, colors, borrow/replace strategy from `/api/analyze-reference` | — | ✓ After `wait.reference_analyze` |
| **Advanced prompt** (collapsible) | Simplified view of `promptExtra` (style-only block) | Optional | ✓ From `styleReferencePromptBlock()` |

**品牌設定 UX:** Collapsed by default on product/direct paths. Auto-expanded when `isBrandVisualStyle(visualStyleId)`. Footer link: “在設定中管理品牌” → account brand settings. On Continue, persist via `PUT /api/brand-kit` (same as today).

**Skip rules:** Direct path — user may skip entire screen if all copy empty (brand kit still applied from saved defaults). Research path — **never skip** screen (pre-filled but always editable before generate); brand kit section remains optional to expand.

**Not on this screen:** Brand **website** URL analyze — that stays on separate `asset.brand_website` when the visual style requires `brandProfile`.

### 3.3 Research

| ID | Screen | Required | State / handler |
|----|--------|----------|-----------------|
| `research.platform` | 平台內容研究 — search | ✓ if intake=research | Reuse `ContentResearchPanel`; **promote target** = `product` (physical) or `conceptIdea` / `effectivePromoteName` (concept) |
| `research.pick_angle` | Select angle / post | ✓ | `applyContentAngleToWizard` → patches output mode, style, refs, copy |
| `wait.research_apply` | Applying angle… | auto | Brief transition after pick |
| `wait.reference_analyze` | Analyzing reference image… | **✓ on research image path** | `referenceAnalyzeBusy` — gate blocks until done |

### 3.4 References & assets

| ID | Screen | Required | State |
|----|--------|----------|-------|
| `asset.reference_image` | Optional reference image (direct only) | Optional | `imageRefPhoto`, `imageCreativeMode: reference-concept` |
| `asset.reference_video` | Reference MP4 (direct video / reel) | ✓ on R2V & storyboard direct paths | `referenceAd`, `referenceIsVideo` |
| `asset.product_photo` | Product photo | ✓ most physical image/video | `productPhoto` |
| `asset.extra_kit` | Packaging / extra angles | Optional | `packagingPhoto`, `extraKitPhotos` |
| `asset.brand_website` | Brand **website** URL analyze (not Brand Kit) | ✓ if brand-fit / brand-campaign / brand-video (physical) | `brandProfile` via `/api/analyze-brand`; may merge colors into `brandKit` via `mergeBrandProfileIntoKit` |

**Research image path:** Reference cover is attached automatically from the picked post — not a separate upload step. Analysis is **required** (`evaluateProceedToImageGate`: `need_reference_image`, `reference_analyzing`).

### 3.5 Image output

| ID | Screen | Required | State |
|----|--------|----------|-------|
| `image.output_format` | **四選一:** 單張 / A/B / Campaign / 教學輪播 | ✓ unless preset by research | `imageOutputMode`, may set `visualStyleId` |
| `image.art_style` | **畫面風格** — 寫實 / 2D動漫 / 3D / 漫畫 / 水彩 | Optional (default `realistic`) | `artStyleId` — **shown on every path** (Setup + Image step); controls Nano Banana keyframes / posters / storyboard stills / cinematic frames. Seedance preserves the look. Hidden only for compositor (`paper-layout`). |
| `image.options` | Aspect ratio, text mode, campaign theme | Defaults OK (merge into generate on mobile) | `imageAspectRatio`, `imageTextMode`, `campaignTheme` |
| `image.generate` | Generate + progress | — | `generateImage()` |
| `wait.image_generate` | Generating… | auto | `imageBusy`, `imageJobMeta` |
| `image.review` | Variant pick, vision gate, postflight | ✓ if A/B or vision issues | existing Image step post-gen UI |
| `image.storyboard_scenes` | Scene stills editor | ✓ before video (storyboard) | `storyboardScenes`, regenerate per scene |
| `wait.storyboard_generate` | Generating scenes… | auto | `imageJobMeta.kind === storyboard` |

### 3.6 Video output

| ID | Screen | Required | State |
|----|--------|----------|-------|
| `video.mode` | I2V / product promo / R2V / UGC | Usually inferred | `videoCreativeMode` |
| `video.settings` | Duration, resolution, creativity, fast | Defaults OK; **Setup shows resolution + duration + fast for all video/combined paths** (billing) | `videoSettings` — full motion panel also on Video step |
| `video.product_plan` | Product assistant plan | ✓ if product-assistant | `planProductVideo` → `productVideoPlan` |
| `video.ai_prompt` | AI-planned prompt review | ✓ if brand-video / creative-video | `planAiVideoPrompt` → `videoPrompt` |
| `video.ugc_pack` | Avatar, voiceover, captions | ✓ if ugc-presenter | ad pack fields |
| `video.bgm` | Background music | Optional | `bgmTrack` |
| `video.generate` | Generate + progress | — | `generateVideo()` |
| `wait.video_generate` | Generating… | auto | `videoBusy`, `videoPhase` |
| `wait.reel_analyze` | Analyzing reference reel… | auto | `researchReelAnalyzeBusy` — **after** explicit `video.settings` duration; **re-runs** when duration changes |

### 3.7 Finish

| ID | Screen | Required | State |
|----|--------|----------|-------|
| `done.export` | Download, captions handoff, reset | — | `DoneStep` |
| `shortcut.ship_it` | One-click image→video | Optional — **after image review** | `runShipIt()` when `shipItEligible` |

---

## 4. Gate mapping (reuse existing logic)

Micro-step **Continue** buttons must call the same checks the monolith uses today.

### 4.1 Setup → image (split across early screens)

Source: `lib/wizard-setup-gate.ts` + `goNextFromSetup()` in `hooks/useStudioWizard.ts`

| Gate reason | Block at micro-step |
|-------------|---------------------|
| `need_product_name` | `identity.product_name` |
| `need_headline` | `identity.concept` or `copy.edit` |
| `need_reference_image` | `wait.reference_analyze` / research pick (cover must attach) |
| `reference_analyzing` | `wait.reference_analyze` |
| Brand analyze required | `asset.brand_website` |
| Creative brief required | `copy.creative_brief` |
| Research reel MP4 missing | `research.pick_angle` or `asset.reference_video` |
| Reel analyzing / analyze required | `wait.reel_analyze` |
| Reference reel: output duration not explicit (`auto`) | `video.settings` — block analyze & Continue |

### 4.2 Image generate

Source: `canGenerateImage()` + `imageGenerateBlockReason()`

| Condition | Block at |
|-----------|----------|
| No product photo (physical default) | `asset.product_photo` |
| Storyboard physical: name + photo | `identity.product_name`, `asset.product_photo` |
| Reference-concept: ref + product photo | `asset.reference_image`, `asset.product_photo` |
| info-poster / brand: headline | `copy.edit` |
| Brand profile (physical brand styles) | `asset.brand_website` |

### 4.3 Image → video

Source: `finishImageStep()`

| Condition | Block at |
|-----------|----------|
| Combined needs generated image | `image.review` or `image.generate` |
| Storyboard needs scenes | `image.storyboard_scenes` |
| Cinematic needs N scenes | `image.storyboard_scenes` (cinematic variant) |

### 4.4 Video generate

Reuse existing video-step disabled reason from `useStudioWizard` (storyboard scenes, UGC pack, brand prompt, reference video, etc.).

---

## 5. Style inference (user does not pick “visual style” in v2 default)

| Path | Default `visualStyleId` |
|------|-------------------------|
| Product + image + direct + single/A/B | `product` |
| Product + image + research → single-image angle | `product` or angle patch |
| Product + image + research → campaign angle | `brand-campaign` or `product` |
| Product + image + research → teaching angle | `product` + `teaching-carousel` |
| Product + image + research → model-wear | `model-wear` |
| Concept + image + direct | `brand-fit` |
| Product + video + direct | `product` |
| Product + video + research reel + combined | `storyboard-video` |
| Product + video + research reel + video-only | `product` (R2V) |
| Concept + video + direct | `creative-video` or `brand-video` |
| Concept + video + research reel + combined | `storyboard-video` |
| Concept + video + research reel + video-only | `product` (direct R2V) |
| Concept + combined + cinematic | `concept-cinematic` |
| Concept + combined + image trunk (Path 11) | Path 3/4 style + `image-to-video` |
| Product + Both + animate keyframe (Path 7) | `product` + `image-to-video` |

Research angles use `lib/content-research-apply.ts` → `patchFromAngleFormat()` (unchanged).

### Path index (all 11 reference paths)

| # | Path | Output | Subject | Intake | Priority |
|---|------|--------|---------|--------|----------|
| 1 | Product / Image / Research | Image | Product | Research | P1 |
| 2 | Product / Image / Direct | Image | Product | Direct | **MVP** |
| 3 | Concept / Image / Research | Image | Concept | Research | P1 |
| 4 | Concept / Image / Direct | Image | Concept | Direct | P1 |
| 5 | Product / Video / Research reel | Video / Both | Product | Research | P1 |
| 6 | Product / Video / Direct | Video | Product | Direct | P1 |
| 7 | Product / Combined / Animate keyframe | Both | Product | Research or Direct (image) | P1 |
| 8 | Concept / Video / Research reel | Video / Both | Concept | Research | P1 |
| 9 | Concept / Video / Direct | Video | Concept | Direct | P1 |
| 10 | Concept / Combined / Cinematic | Both | Concept | Direct | P1 |
| 11 | Concept / Combined / Animate keyframe | Both | Concept | Research or Direct (image) | P2 |

### Path comparison — image paths (2 / 3 / 4)

| Step | Path 2 Product / Direct | Path 3 Concept / Research | Path 4 Concept / Direct |
|------|-------------------------|---------------------------|-------------------------|
| Identity | 產品名稱 [required] | **概念助手** [required] | **概念助手** [required] |
| Intake | 直接創作 | 平台研究 | 直接創作 |
| Reference | User upload (optional) | From post cover + analyze [required] | User upload (optional) — **like Path 2** |
| 內容與生成設定 | Optional skip whole screen | **Never skip** — review copy | Optional skip — **like Path 2** |
| Product photo | Required | Optional | Optional |
| Topic leak risk | Low | **High if §9.5 not fixed** | Low |

### Path comparison — video paths (5 / 6 vs 8 / 9)

| Step | Path 5 Product / Research reel | Path 8 Concept / Research reel | Path 6 Product / Direct | Path 9 Concept / Direct |
|------|-------------------------------|-------------------------------|-------------------------|-------------------------|
| Identity | 產品名稱 [required] | **概念助手** [required] | 產品名稱 [required] | **概念助手** [required] |
| Research promote target | `product` | `conceptIdea` / `effectivePromoteName` | — | — |
| Product photo | Required (storyboard physical) | **Optional** (text-only / R2V ok) | Required | **Optional** |
| Reference MP4 | Download or **手動上傳** [always open] | Same as Path 5 | User upload (ref reel subpath) | Same |
| Research post pick | Optional if user uploads MP4 | Same | — | — |
| Promote / gate name | `product` | `effectivePromoteName` / `conceptIdea` | — | `conceptIdea` |
| Storyboard scenes | If **Both** → `storyboard-video` | Same | — | — |
| 內容與生成設定 | Never skip (if research applied) | Never skip when research applied; fix headline for **your concept** (§9.5) | Optional | Optional |
| Subpaths | promo / reel / assistant / UGC | — | — | creative / brand / reference reel only |
| Extra screens | `video.product_plan`, `video.ugc_pack` | §9.5; optional concept ref image | `copy.creative_brief`, `video.ai_prompt` | `copy.creative_brief`, `video.ai_prompt` |

### Path comparison — combined paths (7 vs 10 vs 11) — product vs concept

| | Path 7 Product / Animate keyframe | Path 8 Concept / Reel + **combined** | Path 10 Concept / Cinematic | Path 11 Concept / Animate keyframe |
|---|-----------------------------------|----------------------------------------|----------------------------|-------------------------------------|
| **Mirrors** | — | Path **5** combined branch | Unique (no product equivalent) | Path **7** for concept |
| **Image step** | Path 1/2 **poster** | **Storyboard scene stills** (reel-driven) | **Cinematic keyframes** (concept-driven) | Path 3/4 **poster** |
| **Video style** | `image-to-video` | `storyboard-video` | `concept-cinematic` | `image-to-video` |
| **Needs reel MP4?** | No | Yes (download or upload) | No | No |
| **Ship-it** | ✓ | ✗ | ✗ | ✗ |
| **Identity** | `product` | `conceptIdea` anchor (§9.5) | `conceptIdea` | `conceptIdea` |

### Concept path mirror map (product ↔ concept)

| Product | Concept | Rule |
|---------|---------|------|
| Path 1 Image / Research | **Path 3** | + 概念助手; promote target = `conceptIdea`; §9.5 |
| Path 2 Image / Direct | **Path 4** | Path 2 + 概念助手 — **not** Path 3 minus research |
| Path 5 Video / Research reel | **Path 8** | Path 5 + 概念助手; optional product photo; same MP4 rules |
| Path 6 Video / Direct | **Path 9** | Path 6 + 概念助手; no assistant/UGC subpaths |
| Path 7 Combined / Animate keyframe | **Path 11** | Path 7 + 概念助手; Path 3/4 trunk; no Ship-it |
| — | **Path 10** | Concept-only cinematic stitch — no product mirror |

---

## 6. Eleven reference path graphs

Machine-readable copy: [`lib/wizard-micro-steps.graph.json`](../lib/wizard-micro-steps.graph.json)

### Path 1 — Product / Image / Research

```
entry.start
  → route.output_goal          [image-only]
  → route.subject              [physical]
  → identity.product_name      [product required]
  → route.intake               [research]
  → research.platform
  → research.pick_angle        → applyContentAngleToWizard
  → wait.research_apply
  → wait.reference_analyze     [required — post cover + gate]
  → copy.edit                  [內容與生成設定; 品牌設定 optional inside; do not skip]
  → asset.brand_website        [only if brand-fit / brand-campaign — required]
  → image.output_format        [skip if angle preset format; else 四選一]
  → asset.product_photo        [required]
  → image.options              [optional; skippable with defaults]
  → image.generate
  → wait.image_generate
  → image.review               [required if ab]
  → done.export
```

### Path 2 — Product / Image / Direct (MVP)

```
entry.start
  → route.output_goal          [image-only]
  → route.subject              [physical]
  → identity.product_name
  → route.intake               [direct]
  → asset.reference_image      [optional; skip allowed]
  → wait.reference_analyze     [only if ref uploaded]
  → copy.edit                  [optional skip screen; 品牌設定 always available inside, optional]
  → image.output_format        [四選一: single | ab | campaign | teaching-carousel]
  → asset.product_photo        [required]
  → image.options
  → image.generate
  → wait.image_generate
  → image.review
  → done.export
```

**Default:** `imageCreativeMode: promo-ai` if no ref; `reference-concept` if ref uploaded. Default format: `ab` for physical image-only.

### Path 3 — Concept / Image / Research

```
entry.start
  → route.output_goal          [image-only]
  → route.subject              [concept]
  → identity.concept           [概念助手 — conceptIdea required; fixed anchor]
  → route.intake               [research]
  → research.platform          [promote target = conceptIdea, NOT empty product]
  → research.pick_angle        → applyContentAngleToWizard (style only → copy rewrite)
  → wait.research_apply
  → wait.reference_analyze     [required when cover attached]
  → copy.edit                  [內容與生成設定 — review/fix headline; never skip]
  → asset.brand_website        [required if brand-fit / brand-campaign and no profile]
  → asset.reference_image      [optional if not from angle]
  → asset.product_photo        [optional — text-only styles allowed]
  → image.output_format        [skip if preset; else 四選一]
  → image.options
  → image.generate
  → wait.image_generate
  → image.review
  → done.export
```

**Order rule:** 概念助手 **before** research so the user’s topic is the anchor. Research borrows **style**; copy fields are rewritten for that topic in `copy.edit`.

### Path 4 — Concept / Image / Direct

**Not** Path 3 without research. **Path 2 + 概念助手.**

```
entry.start
  → route.output_goal          [image-only]
  → route.subject              [concept]
  → identity.concept           [概念助手 — conceptIdea required]
  → route.intake               [direct]
  → asset.reference_image      [optional; skip allowed — like Path 2]
  → wait.reference_analyze     [only if ref uploaded]
  → copy.edit                  [optional skip screen; 品牌設定 inside]
  → asset.brand_website        [required if brand style]
  → asset.product_photo        [optional]
  → image.output_format        [四選一]
  → image.options
  → image.generate
  → wait.image_generate
  → image.review
  → done.export
```

**No** `research.platform`, **no** auto cover from post, **no** forced reference analyze unless user uploads a ref.

### Path 5 — Product / Video / Research reel

**Reel path needs a reference MP4 before analyze + generate.** User can get it two ways — **both always available on the same screen**:

1. **平台研究** — pick a reel post → auto-download MP4  
2. **手動上傳參考短片** — always open (not failure-only); user may skip research entirely if they already have an MP4  

Blocking rule: **MP4 must exist** (downloaded or uploaded) → then **analyze** → then continue. Research post pick is **optional** when user uploads their own file.

```
entry.start
  → route.output_goal          [video-only | combined]
  → route.subject              [physical]
  → identity.product_name
  → route.intake               [research]
  → research.platform          [optional browse — user may skip if uploading MP4]
  → research.pick_angle        [optional — triggers MP4 download when user picks a reel post]
  → wait.research_apply        [when angle picked — copy + style block]
  → video.settings             [duration + resolution + fast — REQUIRED explicit duration before analyze]
  → asset.reference_video      [參考短片 — ALWAYS visible; required before analyze]
      ├── path A: MP4 auto-downloaded from picked post → wait.reel_download
      ├── path B: user uploads MP4 directly (no post needed)
      └── path C: download failed → user uploads OR picks another post
  → wait.reel_analyze          [required — uses output_duration_sec; auto re-run if duration changes]
  → copy.edit                  [內容與生成設定; never skip if research applied; else fill manually]
  → asset.brand_website        [if brand-video — required]
  → asset.product_photo        [required for storyboard physical]
  → copy.storyboard_brief      [if combined → storyboard-video]
  → image.storyboard_scenes    [ONLY if storyboard-video — combined path]
  → wait.storyboard_generate
  → video.settings_motion      [creativity / motion — Video step; duration already locked on Setup]
  → video.generate
  → wait.video_generate
  → done.export
```

#### Path 5 — blocking waits (cannot Continue until done)

| Step | What happens | If it fails |
|------|----------------|-------------|
| `wait.reel_download` | Only when user **picked a post** — proxy fetch MP4 | Show error; user uploads MP4 **or** picks another post — upload zone stays open |
| `wait.reel_analyze` | Runs when MP4 + product name ready (download **or** upload) | Blocks video generate until `researchReelAnalysis` or `videoPrompt` filled |

**UI (v2):** Show **參考短片** upload on Path 5 **from the start**, alongside platform research — same panel as classic `research-reel-setup` (`researchReelUploadMp4Hint`: 搜尋自動下載 **或** 上傳你自己嘅 MP4，**兩種都得**). Do **not** hide upload behind download failure.

#### Path 5 ↔ Path 6 crossover

| Situation | What user does | Effective mode |
|-----------|----------------|----------------|
| Pick post + MP4 downloads | Path 5 | `reference-concept` + reel from search |
| **Can't find a good post** — upload MP4 instead | Stay on Path 5; skip `pick_angle` | Same analyze + generate as Path 6 reference reel |
| Pick post but **download failed** | Upload MP4 or pick another post | Path 5; upload always available |
| Skip research intake entirely | Switch to Direct → Path 6 `reference_reel` | Path 6 |

**Rule for v2:** **手動上傳** is a **permanent option** on Path 5, not only a failure recovery button.

**Note:** `video-only` + reel research → `visualStyleId: product` (R2V). `combined` + reel → `storyboard-video` (scene stills required).

### Path 6 — Product / Video / Direct

**No platform research.** User picks one of four **video subpaths** up front.

```
entry.start
  → route.output_goal          [video-only]
  → route.subject              [physical]
  → identity.product_name
  → route.intake               [direct]
  → route.video_subpath        [required — pick ONE]
  → … (subpath-specific steps below)
  → video.generate
  → wait.video_generate
  → done.export
```

#### Path 6 subpaths — what each means

| Subpath | `videoCreativeMode` / style | What it does | Reference MP4? | Extra step |
|---------|---------------------------|--------------|----------------|------------|
| **Product promo** 產品推廣短片 | `product-promo` + `visualStyleId: product` | Animate **one product photo** (or keyframe) with smooth **commercial motion** — like a product hero shot coming to life | Optional (not required) | `video.ai_prompt` — Plan AI video prompt |
| **Reference reel** 跟參考片 | `reference-concept` | **Your product + reference MP4** → match reference **pacing / edit / motion** (not a clone of reference topic) | **Required** — user uploads | `wait.reel_analyze` [required] |
| **Product assistant** AI 影片助手 | `product-assistant` | Upload **product + packaging + multiple angle photos** → vision analyzes **all photos** → AI writes situational Seedance scene plan | No | `video.product_plan` — Analyze photos & plan video |
| **UGC presenter** | `ugc-presenter` | Digital presenter holds/talks about product — UGC-style talking head | No | `video.ugc_pack` |

#### Product promo vs Product assistant (plain language)

| | **Product promo** | **Product assistant** |
|---|-------------------|-------------------------|
| **Best for** | “I have **one good product shot** — make it move” | “I have **several pack/angle shots** — AI figure out the reel” |
| **Photos** | Usually 1 product photo | Product photo + optional extra kit / angle photos |
| **AI step** | `planAiVideoPrompt` — writes Seedance motion text from copy + photo | `planProductVideo` — vision reads **all** uploads, outputs structured `productVideoPlan` |
| **Motion style** | Generic smooth product commercial | Situational / lifestyle scenes inferred from packaging & angles |
| **Reference video** | Not needed | Not needed |

**Neither** is “platform research”. Both are **direct** paths when you already know your product and don’t need to browse viral posts for style.

```
  → route.video_subpath
      ├── product_promo      → copy.edit → product photo → video.ai_prompt → video.settings → generate
      ├── reference_reel     → upload MP4 → wait.reel_analyze → copy.edit/storyboard → product photo → generate
      ├── product_assistant  → product photo + extra_kit → video.product_plan → video.settings → generate
      └── ugc_presenter      → product photo → video.ugc_pack → generate
```

### Path comparison — combined modes (Path 5 vs Path 7 — read this)

**「圖片+影片 / combined」has TWO different product flows.** Do not assume one Path 7 covers all combined.

| | **Combined + 分鏡 (storyboard-reel)** | **Combined + 單圖動態 (animate-keyframe)** |
|---|--------------------------------------|---------------------------------------------|
| **Spec path** | **Path 5** (reel research, combined branch) or **Path 6** storyboard subpath | **Path 7** |
| **Images mean** | **Storyboard scene stills** — multiple frames (@Image1, @Image2…) matching reel pacing | **One hero poster** — single PNG from normal image generate |
| **How images are made** | `image.storyboard_scenes` — **not** Path 1/2 format picker | Path **1 trunk** (research image) or Path **2 trunk** (direct image) |
| **Video step** | Stitch scenes → one reel (`storyboard-video`) | Animate that one image (`image-to-video`, Ship-it) |
| **Needs reference MP4?** | Usually yes (Path 5) or user upload (Path 6 reel) | No (optional ref MP4 for motion only) |

**Path 1 trunk / Path 2 trunk** (used only on **Path 7**): shorthand for “run the **image-only** funnel first, then append video”:

| Trunk | Means |
|-------|--------|
| **Path 1 trunk** | Path 1 steps through `image.review` — product + **platform research (image posts)** + generate poster |
| **Path 2 trunk** | Path 2 steps through `image.review` — product + **direct** + optional ref upload + generate poster |

Neither trunk is storyboard. **If combined should use storyboard scene images, that is Path 5 (or Path 6 storyboard), not Path 7.**

### Path 7 — Product / Combined / Animate keyframe (NOT storyboard)

**Path 7 = 「先要相片，再要影片」的 單圖動態 分支** — one marketing still, then Seedance animates it. Ship-it lives here.

```
entry.start
  → route.output_goal          [combined — 圖片+影片]
  → route.subject              [physical]
  → identity.product_name
  → route.intake               [research | direct]
  → MERGE Path 1 trunk OR Path 2 trunk   ← image poster only; NOT storyboard scenes
  → image.review               [single / A/B pick — not scene grid]
  → shortcut.ship_it           [optional — after image review]
  → video.settings             [image-to-video]
  → video.generate
  → wait.video_generate
  → done.export
```

**Not on Path 7:** `image.storyboard_scenes`, reel MP4 analyze, multi-scene stitch — those are **Path 5 combined** or **Path 6 storyboard**.

**Ship-it eligible when:** physical + combined + `image-to-video` + not storyboard/campaign/ugc/cinematic/concept + has product photo or name.

### Path 8 — Concept / Video / Research reel

**Path 5 + 概念助手.** Same MP4 pipeline as Path 5; concept-specific gates and copy rules (§9.5).

**Reel MP4:** download from post **or** **手動上傳** (always visible). Research post pick **optional** when user uploads. **Blocking:** MP4 ready → analyze → continue.

**Routing:** **Both** → `storyboard-video` (分鏡場景圖); **Video only** → direct R2V (`visualStyleId: product`).

```
entry.start
  → route.output_goal          [video-only | combined]
  → route.subject              [concept]
  → identity.concept           [概念助手 — conceptIdea required; fixed anchor BEFORE research]
  → route.intake               [research]
  → research.platform          [optional browse; promote target = conceptIdea §9.5]
  → research.pick_angle        [optional — reel post; style-only apply, never paste reference hook]
  → wait.research_apply        [when angle picked]
  → asset.reference_video      [參考短片 — ALWAYS visible; required before analyze]
      ├── auto-download from post → wait.reel_download
      ├── manual upload (skip research post)
      └── download failed → upload or pick another post
  → wait.reel_analyze          [required — blocks until done; uses effectivePromoteName]
  → copy.edit                  [never skip when research applied — fix headline for YOUR concept]
  → asset.brand_website        [if brand-video]
  → asset.reference_image      [optional concept ref still / plan-concept vision]
  → asset.product_photo        [optional — text-only storyboard ok]
  → copy.storyboard_brief      [if combined → storyboard-video ONLY]
  → image.storyboard_scenes    [combined only — NOT Path 11 poster]
  → wait.storyboard_generate
  → video.settings
  → video.generate
  → wait.video_generate
  → done.export
```

#### Path 8 — vs Path 5 (only differences)

| | Path 5 | Path 8 |
|---|--------|--------|
| Identity | `product` | **概念助手** + `conceptIdea` anchor |
| Promote target | `product` | `conceptIdea` / `effectivePromoteName` |
| Product photo | Required (physical storyboard) | **Optional** |
| Copy apply | Product hooks | **Rewrite for concept** — §9.5 |
| Data layers | Product topic | User concept fixed; post = style only |

#### Path 8 ↔ Path 9 crossover

Same pattern as Path 5 ↔ Path 6: can't find reel post → **手動上傳** on Path 8; or switch to Path 9 **reference reel** subpath.

### Path 9 — Concept / Video / Direct

**Path 6 + 概念助手.** **Not** Path 8 minus research (parallel to Path 4 ≠ Path 3 minus research).

```
entry.start
  → route.output_goal          [video-only]
  → route.subject              [concept]
  → identity.concept           [概念助手 — conceptIdea required]
  → route.intake               [direct]
  → route.video_subpath        [required — concept only; pick ONE]
  → … (subpath steps below)
  → video.generate
  → wait.video_generate
  → done.export
```

#### Path 9 subpaths — concept equivalents of Path 6

| Subpath | Mirrors Path 6 | What it does | Reference MP4? | Key extra step |
|---------|----------------|--------------|----------------|----------------|
| **Creative video** 創意影片 | ~Product promo | Concept brief + optional ref **image** → AI writes Seedance prompt | No | `copy.creative_brief`, `video.ai_prompt` |
| **Brand video** 品牌影片 | Brand video subpath | Brand-fit motion for concept | No | `asset.brand_website` if brand style |
| **Reference reel** 跟參考片 | Reference reel | User's concept + **uploaded MP4** → match pacing (not clone topic) | **Required** upload | `wait.reel_analyze` [blocking] |

**Excluded (product-only):** `product-assistant`, `ugc-presenter`.

**Optional on all subpaths:** `asset.reference_image` (concept ref still for `/api/plan-concept` vision).

```
  → route.video_subpath
      ├── creative_video   → copy.edit (optional skip) → creative_brief → ref image (optional) → video.ai_prompt → generate
      ├── brand_video      → brand_website (if brand) → copy.edit → video.ai_prompt → generate
      └── reference_reel   → upload MP4 [required] → wait.reel_analyze → copy.edit → ref image (optional) → generate
```

### Path 10 — Concept / Combined / Cinematic

**Concept-only.** **Not** Path 8 combined and **not** Path 11. Primary 「圖片+影片」 path when user wants **cinematic stitch**, not reel research or single-poster animate.

| | Path 8 combined | Path 10 | Path 11 |
|---|-----------------|---------|---------|
| Intake | Platform reel research | **Direct** only | Path 3/4 image trunk |
| Reference | Reel MP4 + analyze | Optional concept ref **image** only | Optional image research ref |
| Images | Storyboard scenes from **reel pacing** | **Cinematic keyframes** from concept plan | One **poster** |
| Style | `storyboard-video` | `concept-cinematic` | `image-to-video` |

```
entry.start
  → route.output_goal          [combined — required]
  → route.subject              [concept]
  → identity.concept           [概念助手 — conceptIdea required]
  → route.intake               [direct]
  → route.cinematic_mode       [single 8s | multi-scene stitch]
  → cinematic.scene_count      [1–6 if stitch]
  → asset.reference_image      [optional → plan-concept vision]
  → wait.concept_plan          [optional — AI 分析]
  → copy.edit                  [optional skip if brief filled]
  → copy.creative_brief        [required]
  → image.storyboard_scenes    [cinematic keyframes — stitch/multi]
  → wait.storyboard_generate
  → video.settings
  → video.ai_prompt
  → video.bgm                  [optional recipes]
  → video.generate
  → wait.video_generate
  → done.export
```

**No** platform research, **no** reel MP4, **no** Ship-it. Recipes: closest-match stitch, quick-test 8s.

### Path 11 — Concept / Combined / Animate keyframe (NOT storyboard)

**Path 7 + 概念助手.** One concept **poster** (Path 3 or 4 trunk), then animate — **not** storyboard scene grid.

**Path 3 trunk / Path 4 trunk:** same meaning as Path 1/2 trunk but for concept (§9.5 on research trunk).

```
entry.start
  → route.output_goal          [combined]
  → route.subject              [concept]
  → identity.concept           [概念助手 — conceptIdea required]
  → route.intake               [research | direct]
  → MERGE Path 3 trunk OR Path 4 trunk   ← concept poster; NOT storyboard scenes
  → image.review               [single / A/B / campaign / carousel pick]
  → video.settings             [image-to-video]
  → video.generate             [no Ship-it — concept excluded]
  → wait.video_generate
  → done.export
```

**Not on Path 11:** `image.storyboard_scenes`, reel MP4, cinematic stitch — those are **Path 8 combined** or **Path 10**.

**If user wants concept + Both + storyboard scene images → Path 8 (combined branch), not Path 11.**

---

## 6b. Tree diagrams

Legend: **[required]** = must fill before Continue · **(optional)** = can skip · **{wait}** = loading screen · **⟨branch⟩** = user picks sub-path · **四選一** = pick exactly one output format

### Master entry (all paths)

```
Start (Landing)
└── route.output_goal
    ├── 圖片 Image          → workflowMode: image-only
    ├── 影片 Video          → workflowMode: video-only
    └── 圖片+影片 Both      → workflowMode: combined
        └── route.subject
            ├── 產品 Product    → promotionMode: physical  → Paths 1–2, 5–7
            └── 概念 Concept    → promotionMode: concept   → Paths 3–4, 8–11
                └── route.intake
                    ├── 平台研究 Research   ← default highlight for Product/Image
                    └── 直接創作 Direct
                        └── … (paths below)
```

**Quick route map**

| If user picks… | Then path # |
|----------------|-------------|
| Product + Image + Research | 1 |
| Product + Image + Direct | 2 (MVP) |
| Concept + Image + Research | 3 |
| Concept + Image + Direct | 4 |
| Product + Video/Both + Research reel | 5 |
| Product + Video + Direct | 6 |
| Product + Both + (image trunk) | 7 |
| Concept + Video/Both + Research reel | 8 |
| Concept + Video + Direct | 9 |
| Concept + Both + Cinematic stitch | 10 |
| Concept + Both + reel storyboard (research) | 8 (combined branch) |
| Concept + Both + animate keyframe (poster) | 11 |

### Path 1 — Product / Image / Research

```
Start
└── 圖片 [required]
    └── 產品 [required]
        └── 產品名稱 [required]
            └── 平台研究 [required]
                └── 平台內容研究 — 搜尋
                    └── 選擇角度/貼文 [required]
                        └── {wait: 套用角度}
                            └── {wait: 分析參考圖} [required]
                                └── 內容與生成設定 [required, pre-filled]
                                    ├── 文案
                                    ├── 品牌設定 (optional, collapsed)
                                    └── 進階 prompt (optional)
                                    └── 品牌網站分析 [required if brand-fit / brand-campaign]
                                    └── 輸出格式 [skip if angle preset; else 四選一]
                                        ├── 單張 / A/B / Campaign 套圖 / 教學輪播
                                            └── 產品照片 [required]
                                                └── 圖片選項 (optional)
                                                    └── 生成 → {wait} → 檢視 → 完成匯出
```

### Path 2 — Product / Image / Direct (MVP)

```
Start
└── 圖片 → 產品 → 產品名稱 [required]
    └── 直接創作
        └── 參考圖 (optional)
            └── {wait: 分析參考圖} (only if uploaded)
                └── 內容與生成設定 (optional skip whole screen)
                    ├── 文案 (optional)
                    ├── 品牌設定 (optional, collapsed)
                    └── 進階 prompt (optional)
                    └── 輸出格式 [required, 四選一]
                        └── 產品照片 [required]
                            └── 生成 → {wait} → 檢視 → 完成匯出
```

### Path 3 — Concept / Image / Research

```
Start
└── 圖片 → 概念
    └── 概念助手 [required]              ← identity.concept; topic anchor
        └── 平台研究 → 搜尋 → 選角度 [required]
            └── {wait: 套用} → {wait: 分析參考圖} [required if cover]
                └── 內容與生成設定 [required — fix bad headlines here]
                    ├── 文案 (for YOUR concept, not post topic)
                    ├── 品牌設定 (optional)
                    └── 進階 prompt (style block)
                    └── 品牌網站分析 [if brand style]
                    └── 參考圖 (optional) → 主圖 (optional)
                        └── 輸出格式 [skip if preset; else 四選一]
                            └── 生成 → {wait} → 檢視 → 完成匯出
```

### Path 4 — Concept / Image / Direct

```
Start
└── 圖片 → 概念
    └── 概念助手 [required]              ← same as Path 3
        └── 直接創作                       ← like Path 2
            └── 參考圖 (optional)
                └── {wait: 分析參考圖} (if uploaded)
                    └── 內容與生成設定 (optional skip)
                        ├── 文案 (optional)
                        ├── 品牌設定 (optional)
                        └── 進階 prompt (optional)
                        └── 輸出格式 [required, 四選一]
                            └── 主圖 (optional) → 品牌網站 (if brand)
                                └── 生成 → {wait} → 檢視 → 完成匯出
```

### Path 5 — Product / Video / Research reel

```
Start
└── ⟨影片 or 圖片+影片⟩ → 產品 → 產品名稱 [required]
    └── 平台研究（可選）+ 參考短片 [always open — 手動上傳 MP4]
        ├── 揀 Reel 帖 → {wait: 下載 MP4}（若揀帖）
        └── OR 直接手動上傳參考短片（搵唔到啱帖就用呢個）
            └── 參考 MP4 就緒 [required — 下載或上傳]
                └── {wait: 分析 Reel} [required]
                    └── 內容與生成設定 [required if research applied]
                        └── 產品照片 [required]
                            ├── [combined] 分鏡簡介 → 場景圖 → {wait} → 影片 → {wait} → 完成
                            └── [video-only] 影片設定 → 生成 R2V → {wait} → 完成
```

### Path 6 — Product / Video / Direct

```
Start
└── 影片 → 產品 → 產品名稱 [required] → 直接創作
    └── 影片子路徑 ⟨branch⟩ [required — 四選一]
        ├── 產品推廣 Product promo
        │     → 內容與生成設定 → 產品照 [required] → AI 規劃 prompt → 影片 → 完成
        │     (一張產品圖 + 商業感動態；唔需要參考片)
        ├── 跟參考片 Reference reel  ← 同 Path 5 手動上傳 MP4 後續步驟
        │     → 上傳 MP4 [required] → {wait: 分析 Reel} [required] → 產品照 → 影片 → 完成
        ├── AI 影片助手 Product assistant
        │     → 產品照 + 包裝/多角度 [required] → {wait: 分析相片規劃} → 影片 → 完成
        │     (多圖 vision 規劃場景；唔需要參考片)
        └── UGC 主播 → 產品照 → UGC 設定 → 影片 → 完成
```

### Path 7 — Product / Combined / Animate keyframe (單圖動態)

**NOT storyboard.** For 分鏡 scene images → see **Path 5 combined** or **Path 6 storyboard**.

```
Start
└── 圖片+影片 [combined]
    └── 產品 → 產品名稱 [required]
        └── ⟨研究⟩ Path 1 主幹（image research poster）
            OR ⟨直接⟩ Path 2 主幹（direct poster）
            └── 一張宣傳圖完成 [required] — 唔係分鏡場景格
                └── 影片設定 (image-to-video)
                    └── (optional) Ship-it 一鍵出片
                        └── 生成 → {wait} → 完成匯出
```

### Path 8 — Concept / Video / Research reel

```
Start
└── ⟨影片 or 圖片+影片⟩ → 概念
    └── 概念助手 [required — conceptIdea anchor, §9.5]
        └── 平台研究（可選）+ 參考短片 [always open]
            └── 參考 MP4 就緒 [required]
                └── {wait: 分析 Reel} [required — effectivePromoteName]
                    └── 內容與生成設定 [required if research — fix copy for YOUR concept]
                        └── 概念 ref 圖 (optional)
                            ├── [combined] 分鏡場景圖 → {wait} → 影片 → 完成  ← storyboard, NOT Path 11
                            └── [video-only] R2V → 完成
```

### Path 9 — Concept / Video / Direct

```
Start
└── 影片 → 概念
    └── 概念助手 [required] → 直接創作
        └── 影片子路徑 [四選一 concept only]
            ├── 創意影片 Creative → 創意簡介 → AI prompt → 完成
            ├── 品牌影片 Brand → 品牌網站 (if brand) → 完成
            └── 跟參考片 Reference → 上傳 MP4 [required] → {wait: 分析} → 完成
        └── 參考圖 (optional)
        (no product-assistant · no UGC)
```

### Path 10 — Concept / Combined / Cinematic

```
Start
└── 圖片+影片 → 概念
    └── 概念助手 [required] → 直接創作（唔做平台 reel 研究）
        └── 電影感 ⟨single 8s | stitch 2–6⟩
            └── (optional) AI 分析概念
                └── 電影感場景圖 → {wait} → 影片規劃 → BGM (optional) → 完成
        (NOT Path 8 reel storyboard · NOT Path 11 poster animate)
```

### Path 11 — Concept / Combined / Animate keyframe

```
Start
└── 圖片+影片 → 概念
    └── 概念助手 [required]
        └── ⟨研究⟩ Path 3 主幹  OR  ⟨直接⟩ Path 4 主幹
            └── 一張概念宣傳圖完成 [required — 唔係分鏡格]
                └── image-to-video → 完成
                (no Ship-it · no reel MP4)
        (for reel storyboard → Path 8 combined, not here)
```

### Step count cheat sheet

| Path | Typical steps (excl. waits) |
|------|----------------------------|
| 1 Product/Image/Research | ~12 |
| 2 Product/Image/Direct | ~10 (MVP) |
| 3 Concept/Image/Research | ~13 |
| 4 Concept/Image/Direct | ~11 |
| 5 Product/Video/Research | ~11–14 |
| 6 Product/Video/Direct | ~10–13 |
| 7 Product/Combined | Path 1 or 2 + ~3 |
| 8 Concept/Video/Research | ~11–14 |
| 9 Concept/Video/Direct | ~9–12 |
| 10 Concept/Cinematic | ~10–15 |
| 11 Concept/Combined/Animate keyframe | Path 3 or 4 + ~2 |

---

## 7. Ancillary paths & parity checklist

These are **sub-branches or overlays** on the main paths above — not separate top-level funnels.

| Item | Applies to | Extra steps | Priority |
|------|------------|-------------|----------|
| UGC presenter | Path 6 only (product) | `video.ugc_pack` before generate | P2 |
| Product video assistant | Path 6 only | `video.product_plan`, `asset.extra_kit` | P2 |
| Brand website analyze | Paths 1, 3, 5, 6, 8, 9 when brand style | `asset.brand_website` | P1 |
| Model-wear (research angle) | Paths 1, 3 | Skip format picker; `model-wear` style | P1 |
| Template from landing | All | Pre-fill after `route.subject` if `?template=` | P1 |
| Storyboard explainer | Paths 5, 6, 8 | Short 分鏡模式 screen before scene generation | P1 |
| Cinematic recipes | Path 10 | closest-match stitch, quick-test 8s | P1 |
| Image describe mode | Custom template | Extra `copy.image_prompt` screen | P3 |
| Post-gen quick-fix / inpaint | `image.review` | Sub-steps under review | P3 |

---

## 8. Wait screens & blocking states

| Wait ID | Trigger | UI copy key | Blocks |
|---------|---------|-------------|--------|
| `wait.reference_analyze` | Ref image from upload or research cover | `wizard.referenceBriefAnalyzingWait` | Continue, generate |
| `wait.reel_download` | After research angle apply — proxy fetch MP4 | `wizard.researchReelMp4Missing` / `contentResearch.videoDownloadFailed` | Continue, reel analyze, video generate |
| `wait.reel_analyze` | Ref MP4 from download **or** manual upload | `wizard.researchReelAnalyzing` | Continue, video generate |
| `wait.research_apply` | Angle selected | — | <300ms transition |
| `wait.image_generate` | `generateImage()` | Progress from `imageJobMeta` | All navigation |
| `wait.storyboard_generate` | Storyboard scene batch | Scene count progress | Continue to video |
| `wait.video_generate` | `generateVideo()` | `videoPhase` chain | All navigation |
| `wait.brand_analyze` | Brand URL submit | — | Continue if brand required |
| `wait.concept_plan` | `/api/plan-concept` | — | Optional enrich on concept screen |

---

## 9. Implementation plan

### 9.1 New files

| File | Purpose |
|------|---------|
| `lib/wizard-micro-steps.types.ts` | `MicroStepId`, `IntakePath`, graph types |
| `lib/wizard-micro-steps.graph.json` | Path definitions (this spec §6) |
| `lib/wizard-micro-steps.ts` | `resolveMicroSteps(ctx) → MicroStepId[]`, `canProceed(step, state)` |
| `hooks/useWizardMicroStep.ts` | Current index, next/back, sync to `stepKey` when entering image/video/done |
| `components/wizard/micro/MicroWizardShell.tsx` | Layout, progress, back/continue |
| `components/wizard/micro/screens/*.tsx` | One file per screen group |

### 9.2 Routing integration

```
/studio?wizard=v2&mode=physical
/start → /studio/wizard (new route) OR query flag on existing /studio
```

On mount:
1. Read partial choices from URL or session (`wizardV2Draft`)
2. `resolveMicroSteps()` returns ordered IDs from current context
3. On final pre-generate step, ensure legacy `stepKey` is set (`image` / `video` / `done`) before calling existing handlers

### 9.3 Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **0** | Spec v0.5 + JSON graph (Paths 1–11) ✓ |
| **1** | Shell + Path 2 (Product/Image/Direct) — MVP |
| **2** | Paths 1, 3, 4 (research + concept image) + §9.5 fix ✓ |
| **3** | Paths 5, 6, 7 (product video + combined) |
| **4** | Paths 8, 9, 10 (concept video + cinematic) |
| **5** | Path 11 + ancillary §7 + template prefill |
| **6** | Default v2 on `/start`; classic via flag |

### 9.4 Known codebase fixes (during v2)

| Issue | Fix |
|-------|-----|
| `ImageOutputModePicker` ignores `includeTeachingCarousel` | Wire prop in component |
| Concept research promote target | See §9.5 ✓ (implemented) |

### 9.5 Fix — concept research must not paste reference topic (required for Path 3)

**Problem (today):** Picking a research post can fill `headline` with the reference hook (e.g. 世界杯四强) while `promptExtra` correctly says “do NOT copy reference topic”. Root cause: `ContentResearchPanel` gets `promoteProduct={product}` only; concept users set `conceptIdea`, not `product`.

**v2 wiring (UI):**

1. Pass promote target into research:
   - Physical → `product`
   - Concept → `wizardPromoteName({ promotionMode: 'concept', conceptIdea, headline, product })`
2. Sync research search `topic` from `conceptIdea` when concept path (optional default, user can still search broader).

**Apply-angle behavior (`applyContentAngleToWizard` / `copyFieldsFromAngle`):**

| If user already has… | Then on angle apply… |
|----------------------|----------------------|
| `conceptIdea` set | **Keep** `conceptIdea` as anchor; do **not** overwrite with `${topic} — 小紅書 style` unless empty |
| Promote target | Use `conceptIdea` in `copyFieldsFromAngle` as `promoteProduct` |
| `headline` / `subline` | Rewrite for promote target + angle **format**; **never** paste raw `angle.hook` when it matches reference engagement/topic |
| `promptExtra` | Keep style-only block (unchanged) |

**Files to touch (minimal):**

| File | Change |
|------|--------|
| `components/studio/SetupStep.tsx` (or v2 `ContentResearchScreen`) | `promoteProduct={effectivePromoteName}` or concept-aware prop |
| `components/content-research/ContentResearchPanel.tsx` | Accept `promoteConcept` / use effective promote name for concept |
| `lib/content-research-apply.ts` | When `conceptIdea` pre-set, preserve anchor; headline from `copyFieldsFromAngle(promoteTarget, …)` |
| `lib/content-research-promote.ts` | Guard: if `promoteProduct === conceptIdea`, never return reference hook as headline |

**Acceptance test:** Concept idea = “餐廳世界杯訂位推广” → pick 世界杯 reference post → `headline` mentions 餐廳/訂位, **not** “留下你支持的4支球隊”; `promptExtra` still contains style reference URL.

**User safety net:** `copy.edit` always shown on Path 3 so user can edit before generate even if auto-copy is imperfect.

---

## 10. Decisions locked (v0.5)

| # | Decision |
|---|----------|
| 1 | Show **Image / Video / Both** at top; **Both** primary for Product; **Both** required for Concept cinematic (Path 10) |
| 2 | **四選一** format picker for Product and Concept image paths; **skip picker** when research preset `imageOutputMode` |
| 3 | **Research** default-highlight for Product/Image intake |
| 4 | **Skip** `copy.edit` screen on direct only; **never skip** on research (Paths 1, 3, 5, 8) |
| 5 | Add short **分鏡模式** explainer before storyboard scene generation (Paths 5, 6, 8) |
| 6 | **Ship-it** offered **after image review** on Path 7 only — **never** for concept (Paths 10, 11) |
| 7 | **Advanced studio** link on entry + footer (not every screen) |
| 8 | Mobile: merge `image.options` into generate screen with smart defaults |
| 9 | **Brand Kit:** optional on **all** paths — inside `copy.edit` → **品牌設定** (collapsed by default); auto-load from account |
| 10 | **Brand website:** separate `asset.brand_website` step — **required** only for brand-fit / brand-campaign / brand-video |
| 11 | **No standalone Brand Kit step** — never a mandatory funnel step; Settings link for account-level edits |
| 12 | **`identity.concept` = 概念助手** — required on all concept paths **before** research or direct ref |
| 13 | **Path 4 = Path 2 + 概念助手**; **Path 9 = Path 6 + 概念助手** (not minus research) |
| 14 | **Concept research anchor:** `conceptIdea` is fixed promote target; research is style-only; §9.5 shipped |
| 15 | **Path 8 = Path 5 + 概念助手**; optional product photo; §9.5; 手動上傳 MP4 always open |
| 16 | **Path 9 = Path 6 + 概念助手** — not Path 8 minus research |
| 17 | **Path 10 = concept-cinematic** — direct only; not Path 8/11 |
| 18 | **Path 11 = Path 7 + 概念助手** — Path 3/4 poster trunk + image-to-video; not storyboard |
| 19 | **Path 5/8 reel:** MP4 + analyze blocking; **手動上傳 always visible** |
| 20 | **Concept combined split:** Path 8 combined = reel storyboard; Path 10 = cinematic; Path 11 = animate keyframe |
| 21 | **`image.art_style` (畫面風格):** visible on **every path** in Setup (+ Image step when generating); default `realistic`; hidden only for compositor |
| 22 | **`video.settings` on Setup:** resolution + duration + fast on **all video/combined paths** before reference analyze (billing); motion/creativity remain on Video step |
| 23 | **Reference reel analyze:** explicit duration **before** `wait.reel_analyze`; changing duration **re-runs** analyze with new `output_duration_sec` |
| 24 | **DeepSeek video planners** (`plan-video-prompt`, reel analyze, product assistant) inject mandatory **OUTPUT LENGTH** pacing for chosen seconds; AI prompt **re-plans** when duration changes on Video step |

---

## 11. Success criteria

- [ ] Path 2 end-to-end without opening classic Setup
- [ ] All gates produce same errors as today for equivalent state
- [ ] No new API routes or FormData fields
- [ ] E2E: one test per reference path (**11**)
- [ ] Classic wizard still works with `?wizard=classic`

---

## 12. Example playbook — SaaS app pre-roll (~30s, OfferToday-style)

**Reference ad structure** (YouTube pre-roll for HR/recruitment app — “AI精準配對理想人才”):

| # | Beat | Visual | Role |
|---|------|--------|------|
| 1 | Hands typing fast | B-roll stress | Problem hook |
| 2 | Office worker, papers flying | Chaos metaphor | Problem |
| 3 | Close-up tired HR worker | Emotional beat | Problem |
| 4 | Phone on desk — lock-screen notification | Product hero | Solution reveal |
| 5 | Hand holding phone — candidate cards / AI match UI | Product demo | Solution |
| 6 | Young professional in café using app | Lifestyle payoff | CTA mood |

**Recommended wizard path:** **Path 10 — Concept / Combined / Cinematic stitch**  
**Why:** Multi-beat story, generic professionals (not celebrities), service/concept promo, ~8s × 4–6 scenes → stitch ≈ 30s.

**Alternative paths:**

| Goal | Path | When |
|------|------|------|
| Match pacing of an existing SaaS ad MP4 | **Path 8** (concept + research reel + storyboard) | You have a reference pre-roll to upload |
| Single 8–12s hero clip only | **Path 9** → Creative video | Quick test, one beat |
| Product-led if app has physical merch | Path 7 | Not typical for pure SaaS |

### 12.1 Path 10 micro-step map (primary)

```
Start
└── 圖片+影片 [combined]                    → route.output_goal
    └── 概念 [concept]                      → route.subject
        └── 概念助手 [required]             → identity.concept
            conceptIdea: "AI recruitment app — match ideal candidates in minutes"
            └── 直接創作                       → route.intake direct
                └── 內容與生成設定             → copy.edit
                    headline / subline / offer / business
                    品牌設定 (optional)
                    └── 創意簡介 (optional)    → copy.creative_brief
                        "HR chaos → app notification → happy hire"
                    └── 電影感 4–6 scenes      → cinematic scene count
                    └── 畫面風格 寫實          → image.art_style (realistic)
                    └── 影片設定 8s × N        → video.settings (duration 8, resolution, fast)
                        └── 生成電影感場景圖    → image.generate (cinematic-reel)
                            → wait.image_generate
                            Scene plan (DeepSeek) → one still per beat:
                              A typing hands (subject_framing: hands-only)
                              B office papers chaos
                              C tired worker close-up (generic, not celebrity)
                              D phone on desk hero (textless — no UI text in AI)
                              E café user with phone (lifestyle)
                            └── 影片規劃 + stitch   → video (cinematic-stitch)
                                → wait.video_generate
                                └── 完成匯出          → done.export
                                    Post: composite app UI onto phone screens (CapCut/Figma)
                                    Optional: ad pack VO + BGM on Video step
```

### 12.2 Beat → scene → AI wiring

| Beat | `cinematicScenes[]` role | Image (Nano Banana) | Video (Seedance) | User input weight |
|------|--------------------------|---------------------|------------------|-------------------|
| 1 Typing | `hook` / `stress` | Hands on keyboard, office bokeh, **textless** | Subtle motion, shallow DOF | `creativeVideoBrief` + `subjectFraming: hands-only` |
| 2 Papers | `chaos` | Woman at desk, papers mid-air, cinematic | Dynamic ambient motion | Concept metaphor in brief |
| 3 Close-up | `pain` | Generic HR worker, tired expression, **original character** | Slow push-in | Avoid celebrity names in prompt |
| 4 Phone desk | `product-hero` | Phone on notebook, lock screen **blank or blurred** | Slow push-in on device | **Composite real UI in post** — AI poor at readable UI |
| 5 App UI | `demo` | Same phone angle, textless screen | Minimal motion | Figma mock → overlay (not Seedance text) |
| 6 Café | `payoff` | Young professional in café, phone in hand | Gentle lifestyle motion | `conceptIdea` anchors message |

**Critical rule:** Phone notifications, candidate names, salaries, and app branding → **design mockup + composite**. Wizard generates **environment + device + people**; UI layer is post (or image canvas burn).

### 12.3 Path 8 alternative (reference reel storyboard)

Use when you have a **similar SaaS pre-roll MP4** to match edit rhythm:

```
概念 → 概念助手 → 平台研究 (optional) → 上傳參考 MP4 [required]
  → video.settings (pick duration first)
  → wait.reel_analyze
  → copy.edit (fix copy for YOUR app, not ref topic)
  → 分鏡場景圖 → wait.storyboard_generate
  → 影片 (multi-image R2V) → done
```

Reference = **style + pacing**; `conceptIdea` = your app topic (§9.5).

### 12.4 What we do / don’t do for this ad type

| Capability | Supported? |
|------------|------------|
| Multi-scene 30s arc | ✓ Path 10 stitch or Path 8 storyboard |
| Generic professional faces | ✓ Realistic / creative planners |
| Famous celebrity faces | ✗ Model + product policy |
| Legible app UI in pure AI video | ✗ Composite in post |
| VO + captions + BGM | ✓ Video step ad pack (concept-heavy paths) |
| Hands-only B-roll | ✓ `subjectFraming` |

### 12.5 v2 micro-step IDs (for upcoming UI refactor)

When `NEXT_PUBLIC_WIZARD_V2=1` ships, this playbook maps to:

| Phase | MicroStepIds |
|-------|----------------|
| Setup | `route.output_goal` → `route.subject` → `identity.concept` → `copy.edit` → `copy.creative_brief` → `video.settings` → `image.art_style` |
| Scenes | `image.generate` / `wait.image_generate` (cinematic) |
| Video | `video.generate` / `wait.video_generate` (stitch) |
| Finish | `done.export` |

---

*Last updated: v0.5 — 2026-07-12*
