# alchemy-studio

**Fork of ai-marketing-studio** with Lumina-inspired UX:

| Path | Audience | UI |
|------|----------|-----|
| `/` `/start` `/studio` | SMB beginners | Guided wizard + **template gallery** on landing |
| `/ultra` | Power users | **Ultra canvas** — upload → image → video |

`~/Desktop/ai-marketing-studio` stays the stable daily-use app. **Develop new canvas + template UX here.**

## Setup

```bash
cd ~/Desktop/alchemy-studio
npm install
cp ../ai-marketing-studio/.env.local .env.local   # or copy from .env.example
npm run dev
```

- Wizard: http://localhost:3000/studio  
- Ultra canvas: http://localhost:3000/ultra (requires sign-in; `/pro` redirects here)

## Stack

Same as parent: Next.js 15, image/video generation APIs, Clerk, MongoDB optional.

Ultra canvas uses [@xyflow/react](https://reactflow.dev) — each node runs the existing `/api/generate-image` and `/api/generate` routes.

## Pricing note

Pro runs at **pay-per-use token cost** per node execution — not Lumina $9/mo economics.
