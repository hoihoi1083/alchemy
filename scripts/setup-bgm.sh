#!/usr/bin/env bash
# Creates local BGM loops (replace with your own royalty-free MP3s anytime).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/bgm"
mkdir -p "$DIR"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required. Install: brew install ffmpeg"
  exit 1
fi

# calm — low soft pad, slow movement
echo "→ calm.mp3"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=146:duration=30" \
  -f lavfi -i "sine=frequency=220:duration=30" \
  -f lavfi -i "sine=frequency=293:duration=30" \
  -filter_complex "[0:a]volume=0.12[a0];[1:a]volume=0.08[a1];[2:a]volume=0.05[a2];[a0][a1][a2]amix=inputs=3,volume=1.4,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -c:a libmp3lame -q:a 2 "$DIR/calm.mp3"

# upbeat — brighter, rhythmic pulse
echo "→ upbeat.mp3"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=440:duration=30" \
  -f lavfi -i "sine=frequency=554:duration=30" \
  -f lavfi -i "sine=frequency=659:duration=30" \
  -filter_complex "[0:a]volume=0.14,tremolo=f=4:d=0.35[a0];[1:a]volume=0.1,tremolo=f=4:d=0.35[a1];[2:a]volume=0.08[a2];[a0][a1][a2]amix=inputs=3,volume=1.5,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -c:a libmp3lame -q:a 2 "$DIR/upbeat.mp3"

# warm — mid warm chord, gentle
echo "→ warm.mp3"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=196:duration=30" \
  -f lavfi -i "sine=frequency=247:duration=30" \
  -f lavfi -i "sine=frequency=294:duration=30" \
  -filter_complex "[0:a]volume=0.11[a0];[1:a]volume=0.09[a1];[2:a]volume=0.07[a2];[a0][a1][a2]amix=inputs=3,volume=1.45,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -c:a libmp3lame -q:a 2 "$DIR/warm.mp3"

echo "Done. Replace files in public/bgm/ with licensed tracks for production ads."
