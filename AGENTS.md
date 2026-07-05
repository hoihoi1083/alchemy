# Instructions for AI assistants

**Work on `~/Desktop/alchemy-studio`** — experimental fork; do **not** break `~/Desktop/ai-marketing-studio`.

---

## Project context

| Path | Role |
|------|------|
| `~/Desktop/alchemy-studio` | **This repo** — wizard + Lumina-style templates + `/pro` canvas |
| `~/Desktop/ai-marketing-studio` | Stable parent app — merge back carefully when features are proven |
| `~/Desktop/seadance-video` | Original power-user studio — do not break |

### Two UX modes (same fal APIs)

| Route | UI |
|-------|-----|
| `/` landing | Template gallery (scenario cards) |
| `/studio` | Guided step-by-step wizard (SMB default) |
| `/pro` | Node canvas: upload → Nano Banana image → Seedance video (`@xyflow/react`) |

---

## Key files (alchemy-studio specific)

| File | Purpose |
|------|---------|
| `components/TemplateGallery.tsx` | Landing template cards |
| `components/pro/ProCanvas.tsx` | Pro canvas board |
| `components/pro/nodes/*` | Upload / image / video nodes |
| `lib/pro-canvas-runner.ts` | Calls existing generate APIs from canvas |

---

## Tech stack

- Next.js 15, React 19, Tailwind 4, Clerk
- fal.ai — `nano-banana-2/edit`, `seedance-2.0` (+ `/fast`)
- Pro canvas: `@xyflow/react`

---

## Rules

1. Keep **simple mode default** on `/studio`; hide expert fields unless `/pro`.
2. Pro canvas runs **pay-per-use fal** — show cost hint; do not promise Lumina subscription pricing.
3. Do not delete or refactor `seadance-video` unless user asks.
4. After changes: `npm run build` in **alchemy-studio**.
