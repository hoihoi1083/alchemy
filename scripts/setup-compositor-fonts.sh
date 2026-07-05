#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/compositor/fonts"
mkdir -p "$DIR"
curl -fsSL -o "$DIR/MaShanZheng-Regular.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/mashanzheng/MaShanZheng-Regular.ttf"
curl -fsSL -o "$DIR/NotoSansTC-Regular.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"
echo "Compositor fonts ready in public/compositor/fonts"
