# Submit to marketplaces

Same `grok-plugin/` folder serves:

| Target | How |
|--------|-----|
| **Grok Bot / Cursor** | Public repo → [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) |
| **Grok Build** | PR to [xai-org/plugin-marketplace](https://github.com/xai-org/plugin-marketplace) |

Auth for both: **OAuth** (MCP URL only). `alk_` remains a CLI fallback.

## Before either submit

1. Commit and push `grok-plugin/` (or a dedicated public repo that contains these files at the root / `path`).
2. Prefer a brand org repo (`alchemyailab/…`). Personal `hoihoi1083/alchemy` may get brand questions.
3. Pin HEAD for Build catalog:

```bash
git ls-remote https://github.com/hoihoi1083/alchemy.git HEAD
```

Use the full 40-character lowercase SHA.

## Grok Build catalog entry

Paste into `.grok-plugin/marketplace.json` `plugins` array. Replace `sha` after push:

```json
{
  "name": "alchemy-ai-lab",
  "description": "Alchemy AI Lab hosted MCP for billed marketing stills, photo edits, short video, storyboards, campaign slides, library assets, and brand-logo stamp. Sign in with Alchemy (OAuth); alk_ key optional for CLI.",
  "category": "productivity",
  "source": {
    "source": "url",
    "url": "https://github.com/hoihoi1083/alchemy.git",
    "sha": "REPLACE_WITH_FULL_COMMIT_SHA",
    "path": "grok-plugin"
  },
  "homepage": "https://www.alchemyailab.com",
  "keywords": ["alchemy", "alchemy ai lab", "alchemyailab", "alchemy mcp"],
  "domains": ["alchemyailab.com", "www.alchemyailab.com"]
}
```

Then in the fork:

```bash
python3 scripts/generate-plugin-index.py
python3 scripts/validate-catalog.py
python3 scripts/generate-plugin-index.py --check
```

Open the PR with LICENSE + README linked. No listing fee.

## Cursor / Bot marketplace

1. Repo must expose `.cursor-plugin/plugin.json`, `mcp.json` (OAuth URL only), and `skills/`.
2. Submit the repo URL at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).
3. Until approved, Bot users add Custom MCP: `https://www.alchemyailab.com/api/grok-mcp`.

## What this does **not** do

Submitting to xAI’s Build catalog does **not** auto-list you in Grok Bot Plugins. Bot listing goes through the Cursor marketplace publish flow (or Custom MCP until then).
