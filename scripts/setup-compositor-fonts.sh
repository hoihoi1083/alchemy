#!/usr/bin/env bash
# Download compositor fonts for caption burn (Linux/Vercel).
# google/fonts TTFs are Git LFS — github.com/.../raw/... often 404s on Vercel.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/compositor/fonts"
mkdir -p "$DIR"

download_font() {
  local dest="$1"
  shift
  if [[ -f "$dest" ]]; then
    local existing
    existing="$(wc -c < "$dest" | tr -d ' ')"
    if [[ "$existing" -gt 20000 ]]; then
      echo "keep $(basename "$dest") (${existing} bytes)"
      return 0
    fi
  fi
  local tmp="${dest}.part"
  local url
  for url in "$@"; do
    echo "GET $url"
    if curl -fL --retry 4 --retry-delay 2 --retry-all-errors -o "$tmp" "$url"; then
      local size
      size="$(wc -c < "$tmp" | tr -d ' ')"
      if [[ "$size" -gt 20000 ]]; then
        mv "$tmp" "$dest"
        echo "saved $(basename "$dest") (${size} bytes)"
        return 0
      fi
      echo "too small (${size} bytes) — not a font, trying next URL"
    fi
    rm -f "$tmp"
  done
  echo "failed: $(basename "$dest")" >&2
  return 1
}

# Display / brush headline (CJK calligraphy)
download_font "$DIR/MaShanZheng-Regular.ttf" \
  "https://media.githubusercontent.com/media/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf"

# Static Latin — required for English caption burn on Linux (Vercel).
# Do NOT use variable-axis Noto Sans here; Sharp/librsvg often drops glyphs.
download_font "$DIR/NotoSans-Regular.ttf" \
  "https://media.githubusercontent.com/media/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf" \
  "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf"

download_font "$DIR/NotoSans-Bold.ttf" \
  "https://media.githubusercontent.com/media/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf" \
  "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf"

# Traditional Chinese body (variable file renamed — still needed for CJK).
download_font "$DIR/NotoSansTC-Regular.ttf" \
  "https://media.githubusercontent.com/media/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"

echo "Compositor fonts ready in public/compositor/fonts"
ls -la "$DIR"
