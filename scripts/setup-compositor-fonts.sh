#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/compositor/fonts"
mkdir -p "$DIR"

# Display / brush headline (CJK calligraphy)
curl -fsSL -o "$DIR/MaShanZheng-Regular.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/mashanzheng/MaShanZheng-Regular.ttf"

# Static Latin — required for English caption burn on Linux (Vercel).
# Do NOT use variable-axis Noto Sans here; Sharp/librsvg often drops glyphs.
curl -fsSL -o "$DIR/NotoSans-Regular.ttf" \
  "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf"
curl -fsSL -o "$DIR/NotoSans-Bold.ttf" \
  "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf"

# Traditional Chinese body (variable file renamed — still needed for CJK).
# Latin glyphs for captions come from NotoSans-* above via font stack fallback.
curl -fsSL -o "$DIR/NotoSansTC-Regular.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"

echo "Compositor fonts ready in public/compositor/fonts"
ls -la "$DIR"
