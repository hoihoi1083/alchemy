# alchemy-studio

**Fork of ai-marketing-studio** with Lumina-inspired UX:

| Path | Audience | UI |
|------|----------|-----|
| `/` `/start` `/studio` | SMB beginners | Guided wizard + **template gallery** on landing |
| `/pro` | Power users | **智能畫布** — node canvas: upload → image (Nano Banana) → video (Seedance) |

`~/Desktop/ai-marketing-studio` stays the stable daily-use app. **Develop new canvas + template UX here.**

## Setup

```bash
cd ~/Desktop/alchemy-studio
npm install
cp ../ai-marketing-studio/.env.local .env.local   # or copy from .env.example
npm run dev
```

- Wizard: http://localhost:3000/studio  
- Pro canvas: http://localhost:3000/pro (requires sign-in)

## Stack

Same as parent: Next.js 15, fal.ai (Nano Banana 2 + Seedance 2.0), Clerk, MongoDB optional.

Pro canvas uses [@xyflow/react](https://reactflow.dev) — each node runs the existing `/api/generate-image` and `/api/generate` routes.

## Pricing note

Pro runs at **fal retail API cost** per node execution — not Lumina $9/mo economics.
