# Social platform post search (Just One API)

Alchemy Studio searches **live posts** on 小紅書, Instagram, TikTok, and Facebook — with cover images, likes, and saves — then synthesizes content angles with DeepSeek.

Without `JUSTONEAPI_TOKEN`, research falls back to **Tavily** (public web snippets only, no cover cards).

## Platforms & endpoints

| Platform | Just One API endpoint | Notes |
|----------|----------------------|-------|
| 小紅書 | `/api/xiaohongshu/search-note/v2` | Notes sorted by saves (v1/v3/v5 need separate permission) |
| Instagram | `/api/instagram/search-reels/v1` | Reels by keyword/hashtag |
| TikTok | `/api/tiktok/search-post/v1` | Videos, `MOST_LIKED`, region HK/CN/US |
| Facebook | `/api/facebook/search-post/v1` | Public posts by keyword |

Same token for all platforms — no extra registration per platform.

---

## 1. Register for Just One API

1. Open **[https://api.justoneapi.com](https://api.justoneapi.com)** (or the vendor's signup page linked from their docs).
2. Create an account (email signup).
3. Sign in to the **dashboard**.
4. Copy your **`token`** (API key). It is passed as a query parameter on each request.

New accounts typically receive **free trial credits**. Balance does not expire on most plans — check the dashboard for current pricing.

---

## 2. Add credentials to `.env.local`

In `~/Desktop/alchemy-studio/.env.local`:

```bash
JUSTONEAPI_TOKEN=paste_your_token_here
```

Optional — use the China endpoint if the default host is slow from mainland:

```bash
JUSTONEAPI_BASE_URL=http://47.117.133.51:30015
```

Default (HK / international):

```bash
JUSTONEAPI_BASE_URL=https://api.justoneapi.com
```

You still need **`DEEPSEEK_API_KEY`** for angle synthesis. Keep **`TAVILY_API_KEY`** as fallback if Just One API fails.

---

## 3. Restart the dev server

```bash
npm run dev
```

In **Studio → Step 1** (or the content research panel), pick any platform (小紅書 / Instagram / TikTok / Facebook), enter a topic, and click **即時研究內容**.

You should see:

- A row of **post cards** (cover, title, saves/likes)
- **Top 3 angles** inspired by those posts

---

## 4. Cost expectations

| Step | Approx. cost |
|------|----------------|
| Just One API search (any platform) | ~¥0.01–0.05 per search (check dashboard) |
| DeepSeek synthesis | ~$0.001–0.01 per run |
| Tavily fallback (if used) | ~3 credits (~$0.02–0.05) |

One research click ≈ **one** platform API search + **one** LLM call.

---

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| "JUSTONEAPI_TOKEN is not configured" | Add token to `.env.local` and restart |
| "XHS search returned too few notes" | Try a broader keyword (e.g.「水晶手鏈」not a long sentence) |
| Cover images blank | XHS CDN may block hotlinking — images are proxied via `/api/research-post-image` |
| API error / code ≠ 0 | Check dashboard balance; try `JUSTONEAPI_BASE_URL` alternate host |
| Falls back to Tavily | Just One API failed but `TAVILY_API_KEY` is set — check server logs |

---

## 6. Security notes

- **Do not** commit `.env.local` or paste tokens in chat.
- **Do not** use your personal 小紅書 cookie in production — vendor APIs maintain access for you.
- Rotate keys if exposed.

---

## API reference (used by this app)

```
GET {JUSTONEAPI_BASE_URL}/api/xiaohongshu/search-note/v2
  ?token=...
  &keyword=...
  &page=1
  &sort=collect_descending
  &noteType=_2
```

Implementation: `lib/justoneapi-platform-search.ts`
