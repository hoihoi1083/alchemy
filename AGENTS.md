# Instructions for AI assistants

**Work on `~/Desktop/alchemy-studio`** — experimental fork; do **not** break `~/Desktop/ai-marketing-studio`.

---

## Project context

| Path | Role |
|------|------|
| `~/Desktop/alchemy-studio` | **This repo** — wizard + Lumina-style templates + `/ultra` canvas |
| `~/Desktop/ai-marketing-studio` | Stable parent app — merge back carefully when features are proven |
| `~/Desktop/seadance-video` | Original power-user studio — do not break |

### Two UX modes (same fal APIs)

| Route | UI |
|-------|-----|
| `/` landing | Template gallery (scenario cards) |
| `/studio` | Guided step-by-step wizard (SMB default) |
| `/ultra` | Ultra canvas: upload → Nano Banana image → Seedance video (`@xyflow/react`) |

---

## Key files (alchemy-studio specific)

| File | Purpose |
|------|---------|
| `components/TemplateGallery.tsx` | Landing template cards |
| `components/pro/ProCanvas.tsx` | Ultra canvas board |
| `components/pro/nodes/*` | Upload / image / video nodes |
| `lib/pro-canvas-runner.ts` | Calls existing generate APIs from canvas |

---

## Tech stack

- Next.js 15, React 19, Tailwind 4, Clerk
- fal.ai — `nano-banana-2/edit`, `seedance-2.0` (+ `/fast`)
- Ultra canvas: `@xyflow/react`

---

## Rules

1. Keep **simple mode default** on `/studio`; hide expert fields unless `/ultra`.
2. Ultra canvas runs **pay-per-use fal** — show cost hint; do not promise Lumina subscription pricing.
3. Do not delete or refactor `seadance-video` unless user asks.
4. After changes: `npm run build` in **alchemy-studio**.

---

## Assistant (landing-only)

- Mascot chat mounts on `/` only (`GlobalStudioAssistant` → `isStudioAssistantMounted`).
- **Open to everyone** — no sign-in required to chat on landing (fast-path routes + chips). Open-ended Q&A requires sign-in.
- Landing: Q&A (tokens, pages, engines) + action buttons into `/studio` or tool routes.
- `/studio`: no chat coach — users follow wizard cards on screen.
- In-studio step coach, spotlight overlay, and `initialCoachTaskAfterHandoff` are **dormant** (kept for re-enable).

## Ultra canvas billing

| Action | Charged |
|--------|---------|
| Image / video generate | Tokens (badges on nodes) |
| Script plan | DeepSeek plan quota (not tokens) |
| Stitch videos | Free |
| BGM mix (`add-bgm`) | Tokens when audio connected to splice |
| Save board | Free (Master gate on API) |

Master plan gates: `/ultra` page, board persistence, compose uploads — shared wizard APIs are not canvas-gated.
