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

make_pad() {
  local out="$1"
  local base="$2"
  local fifth="$3"
  echo "→ $out"
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "sine=frequency=${base}:duration=30" \
    -f lavfi -i "sine=frequency=${fifth}:duration=30" \
    -filter_complex "[0:a]volume=0.07[a0];[1:a]volume=0.05[a1];[a0][a1]amix=inputs=2,volume=0.85,afade=t=out:st=27:d=3" \
    -ac 2 -ar 44100 -c:a libmp3lame -q:a 4 "$out"
}

make_pad "$DIR/calm.mp3" 220 330
make_pad "$DIR/upbeat.mp3" 392 523
make_pad "$DIR/warm.mp3" 262 349

echo "Done. Replace files in public/bgm/ with licensed tracks for production ads."
