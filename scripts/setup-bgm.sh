#!/usr/bin/env bash
# Creates local BGM loops (replace with your own royalty-free MP3s anytime).
# Target loudness ~-18 LUFS so mixes are audible after ffmpeg volume scaling.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/bgm"
mkdir -p "$DIR"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required. Install: brew install ffmpeg"
  exit 1
fi

# calm — soft pad, audible
echo "→ calm.mp3"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=146:duration=30" \
  -f lavfi -i "sine=frequency=220:duration=30" \
  -f lavfi -i "sine=frequency=293:duration=30" \
  -filter_complex "[0:a]volume=0.55[a0];[1:a]volume=0.4[a1];[2:a]volume=0.28[a2];[a0][a1][a2]amix=inputs=3:normalize=0,loudnorm=I=-18:TP=-1.5:LRA=11,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -c:a libmp3lame -q:a 2 "$DIR/calm.mp3"

# upbeat — brighter, rhythmic pulse
echo "→ upbeat.mp3"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=440:duration=30" \
  -f lavfi -i "sine=frequency=554:duration=30" \
  -f lavfi -i "sine=frequency=659:duration=30" \
  -filter_complex "[0:a]volume=0.5,tremolo=f=4:d=0.35[a0];[1:a]volume=0.38,tremolo=f=4:d=0.35[a1];[2:a]volume=0.3[a2];[a0][a1][a2]amix=inputs=3:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -c:a libmp3lame -q:a 2 "$DIR/upbeat.mp3"

# warm — mid warm chord
echo "→ warm.mp3"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=196:duration=30" \
  -f lavfi -i "sine=frequency=247:duration=30" \
  -f lavfi -i "sine=frequency=294:duration=30" \
  -filter_complex "[0:a]volume=0.5[a0];[1:a]volume=0.4[a1];[2:a]volume=0.32[a2];[a0][a1][a2]amix=inputs=3:normalize=0,loudnorm=I=-17:TP=-1.5:LRA=11,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -c:a libmp3lame -q:a 2 "$DIR/warm.mp3"

echo "Done. Replace files in public/bgm/ with licensed tracks for production ads."
