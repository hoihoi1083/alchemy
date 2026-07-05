# Background music (BGM)

The app mixes these MP3 files into every exported video.

| File | Mood |
|------|------|
| `calm.mp3` | Soft, calm (default) |
| `upbeat.mp3` | Energetic promo |
| `warm.mp3` | Warm / lifestyle |

## Setup (required once)

```bash
brew install ffmpeg   # if needed
npm run setup:bgm
```

This creates simple placeholder loops. For real ads, replace with **your own licensed** MP3s using the same filenames (`calm.mp3`, `upbeat.mp3`, `warm.mp3`).

If files are missing, the app still tries AI ambience from Seedance, but quality is best with these tracks + `ffmpeg` installed (`brew install ffmpeg`).
