# Alchemy AI Lab — Grok / Cursor plugin

Plugin root for **Grok Bot**, **Cursor Marketplace**, and **Grok Build**. It attaches Alchemy’s hosted MCP and a skill so the agent uses billed Alchemy tools for marketing stills, edits, short video, storyboard, campaign, library, and logo stamp.

This folder is the plugin root. The rest of the Alchemy Studio repo is the product; it is **not** part of the plugin.

## What it ships

- Hosted MCP: `https://www.alchemyailab.com/api/grok-mcp` (Streamable HTTP)
- Skill: `skills/alchemy-mcp`
- Manifests: `.cursor-plugin/plugin.json` (Cursor / Bot) and `.grok-plugin/plugin.json` (Grok Build)
- No hooks, no local binaries, no `postinstall`

## Auth (preferred: OAuth)

Alchemy bills **the installing user’s** wallet. There is no shared key.

1. Install / add the Alchemy MCP URL (no key).
2. Browser opens → sign in at Alchemy AI Lab → **Allow**.
3. Ask the agent to run `alchemy_whoami` or generate a still.

### Fallback: `alk_` key (CLI / Cursor)

1. Create a key at [alchemyailab.com/account](https://www.alchemyailab.com/account)
2. Send `Authorization: Bearer alk_…` or export `ALCHEMY_MCP_API_KEY`

## Network

Outbound HTTPS to `www.alchemyailab.com` only from this plugin. Generation may use fal.ai **on Alchemy’s servers**, not on the user’s machine.

## Install

### Grok Bot

Until listed in Bot Plugins: ask the bot to add Custom MCP  
`https://www.alchemyailab.com/api/grok-mcp` → Sign in with Alchemy.

After Cursor Marketplace approval: install **alchemy-ai-lab** from Plugins / Connect apps.

### Cursor (local test)

```bash
mkdir -p ~/.cursor/plugins/local/alchemy-ai-lab
cp -R ./* ~/.cursor/plugins/local/alchemy-ai-lab/
# Developer: Reload Window → Customize → enable Alchemy MCP
```

Submit for listing: [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)

### Grok Build

```text
/marketplace
```

Install **alchemy-ai-lab** after the [plugin-marketplace](https://github.com/xai-org/plugin-marketplace) PR merges.

Until then:

```bash
grok mcp add --transport http alchemy https://www.alchemyailab.com/api/grok-mcp
```

(OAuth). Or with a key:

```bash
grok mcp add --transport http alchemy https://www.alchemyailab.com/api/grok-mcp \
  --header "Authorization: Bearer ${ALCHEMY_MCP_API_KEY}"
```

## License

MIT (this `grok-plugin/` directory only).
