---
name: caption-studio
description: >-
  Caption 2 is the level-up replacement for classic /captions — full video
  finish studio (Picture → Structure → Captions/VO → Finish). Use when working
  on /captions, /captions-2, CaptionStudio*, ModelArk Seedance edit, BytePlus
  LAS replace, stitch/trim, or toolkit 字幕与音频.
---

# Caption Studio (Caption 2)

## Product rule

**Caption 2 replaces `/captions` as the toolkit entry** (`/captions-2`). Classic stays for full VO plan-from-topic until that is ported.

Pipeline:

```
1. Picture     → AI edit chips (product / scene / style) via ModelArk Seedance, fal fallback
2. Structure   → CapCut-like magnetic timeline (trim / split / reorder) → FFmpeg bake
3. Captions    → Pure (manual) or From speech (ASR); drag blocks on same timeline; VO-led coming
4. Finish      → BGM lane + burn (same FFmpeg as classic)
```

## ModelArk how we use it

| Need | API | Model / operator |
|------|-----|------------------|
| Picture edit (default) | `POST {ARK}/contents/generations/tasks` + poll | `dreamina-seedance-2-0-fast-260128` (env override) |
| Image layerize (Magic Layers) | `POST {ARK}/images/generations` | Seedream `dola-seedream-5-0-pro-*` (existing) |
| Easier replace chips (future) | LAS `las_video_seedance_replace` | scene / object / person_replace — needs LAS key + TOS |
| Exact trim/join | FFmpeg | Never generative |

Auth: same `BYTEPLUS_API_KEY` / `ARK_API_KEY`. Base: `https://ark.ap-southeast.bytepluses.com/api/v3`.

Edit constraints: prompt must include an edit verb (`replace` / `Edit video`); `ratio: adaptive`, `duration: -1`, `omni_reference_task_type: "edit"`.

Code: `lib/byteplus-seedance-edit.ts`, `lib/caption-video-edit.ts`, `app/api/caption-video-edit/route.ts`.

If ModelArk fails (model not activated), **fal** `bytedance/seedance-2.0/fast/reference-to-video` is the fallback.

Default bill: Seedance Fast 720p tokens (`estimateCaptionVideoEditTokens`). Show cost chip in UI.

## UX chips (no jargon)

- 换产品 / Swap product → `job: product` + ref image
- 换背景 / Swap background → `job: scene`
- 改风格 / Restyle → `job: style`

## Captions modes

- **Pure** — silent ads; manual lines (primary for Alchemy)
- **From speech** — Whisper when audio exists
- **VO-led** — plan-from-topic + TTS mix live on Audio · Finish tab (same APIs as classic).

## Project save (Ultra-style)

Caption packs live in Mongo `caption_studio_packs` (signed-in users; not Master-gated). Snapshot JSON holds caption lines + styles, timeline clip URLs, VO/BGM settings — media by durable URL only (same idea as Ultra boards). UI: Save / Open on `/captions-2`. APIs: `/api/caption-studio`, `/api/caption-studio/[id]`. Types: `lib/caption-studio-snapshot.ts`.

## Do / don’t

**Do** keep CapCut one-board (media | preview | props + timeline); magnetic trim/split; honest AI edit cost from selected clip duration; FFmpeg bake (trim→stitch→burn/export); BGM `start_sec` on mix; keyboard Space/S/Del/⌘Z; VO plan/preview/dub inside Audio tab.

**Don’t** make ASR the hero; don’t promise pixel Magic-Layers for video; don’t use AI to stitch ads; don’t build full CapCut (no transitions/effects/multi-layers in MVP); don’t send users to classic `/captions` for basic VO.

Code: `lib/captions/timeline-project.ts`, `components/captions/CaptionNleTimeline.tsx`, `CaptionProgramMonitor.tsx`, `CaptionAudioSection.tsx`, `CaptionStudio2Client.tsx`.

Details: [reference-video-edit.md](reference-video-edit.md) · setup: [docs/BYTEPLUS_SEEDREAM_SETUP.md](../../../docs/BYTEPLUS_SEEDREAM_SETUP.md)
