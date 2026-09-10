# Background music (BGM)

Library demo tracks mixed into caption / wizard exports.

| File | Mood |
|------|------|
| `calm.mp3` | Soft ambient instrumental |
| `upbeat.mp3` | Upbeat promo instrumental |
| `warm.mp3` | Warm lifestyle instrumental |

## Setup

**Preferred — AI demos (sounds like real music):**

```bash
# needs FAL_KEY in .env.local
npx tsx scripts/generate-library-bgm.ts
```

**Fallback — local synth placeholders (not for listening quality):**

```bash
brew install ffmpeg
npm run setup:bgm
```

For production ads, replace with your own licensed MP3s using the same filenames, or use in-app **AI music**.
