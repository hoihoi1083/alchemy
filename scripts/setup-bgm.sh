#!/usr/bin/env bash
# Creates local BGM demo loops that actually sound different.
# Replace with your own royalty-free MP3s anytime (same filenames).
# Target loudness ~-16…-18 LUFS so mixes stay audible after ffmpeg volume scaling.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/bgm"
mkdir -p "$DIR"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required. Install: brew install ffmpeg"
  exit 1
fi

# ── calm — soft ambient pad (no beat): pink wash + low fifth ───────────────
echo "→ calm.mp3 (soft ambient pad)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=pink:duration=30:sample_rate=44100" \
  -f lavfi -i "sine=frequency=98:duration=30" \
  -f lavfi -i "sine=frequency=147:duration=30" \
  -f lavfi -i "sine=frequency=196:duration=30" \
  -filter_complex "\
[0:a]highpass=f=60,lowpass=f=480,volume=0.22[n];\
[1:a]volume=0.42,tremolo=f=0.12:d=0.45[b];\
[2:a]volume=0.28,tremolo=f=0.11:d=0.4[c];\
[3:a]volume=0.16,tremolo=f=0.15:d=0.35,lowpass=f=900[d];\
[n][b][c][d]amix=inputs=4:normalize=0,lowpass=f=1400,\
loudnorm=I=-18:TP=-1.5:LRA=11,\
afade=t=in:st=0:d=2,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -b:a 160k -c:a libmp3lame "$DIR/calm.mp3"

# ── upbeat — clear 120bpm pulse + bright top (obviously rhythmic) ───────────
echo "→ upbeat.mp3 (rhythmic promo pulse)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=55:duration=30" \
  -f lavfi -i "sine=frequency=220:duration=30" \
  -f lavfi -i "sine=frequency=659:duration=30" \
  -f lavfi -i "sine=frequency=880:duration=30" \
  -filter_complex "\
[0:a]volume='if(lt(mod(t\,0.5)\,0.07)\,0.95\,0.04)',lowpass=f=180[kick];\
[1:a]volume='if(lt(mod(t+0.25\,0.5)\,0.05)\,0.55\,0.06)',bandpass=f=220:width_type=h:w=80[bass];\
[2:a]volume='if(lt(mod(t\,0.25)\,0.03)\,0.35\,0.05)',highpass=f=500[hat];\
[3:a]volume=0.18,tremolo=f=2:d=0.55,highpass=f=700[spark];\
[kick][bass][hat][spark]amix=inputs=4:normalize=0,\
loudnorm=I=-16:TP=-1.5:LRA=11,\
afade=t=in:st=0:d=0.3,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -b:a 160k -c:a libmp3lame "$DIR/upbeat.mp3"

# ── warm — soft major arpeggio (melody feel, not a pad) ────────────────────
echo "→ warm.mp3 (warm arpeggio)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=262:duration=30" \
  -f lavfi -i "sine=frequency=330:duration=30" \
  -f lavfi -i "sine=frequency=392:duration=30" \
  -f lavfi -i "sine=frequency=523:duration=30" \
  -f lavfi -i "sine=frequency=131:duration=30" \
  -filter_complex "\
[0:a]volume='if(lt(mod(t\,2.0)\,0.35)\,0.7*exp(-6*mod(t\,2.0))\,0.02)'[c];\
[1:a]volume='if(lt(mod(t-0.5\,2.0)\,0.35)\,0.55*exp(-6*mod(t-0.5\,2.0))\,0.02)'[e];\
[2:a]volume='if(lt(mod(t-1.0\,2.0)\,0.35)\,0.5*exp(-6*mod(t-1.0\,2.0))\,0.02)'[g];\
[3:a]volume='if(lt(mod(t-1.5\,2.0)\,0.35)\,0.4*exp(-6*mod(t-1.5\,2.0))\,0.02)'[c2];\
[4:a]volume=0.28,tremolo=f=0.2:d=0.3,lowpass=f=400[bed];\
[c][e][g][c2][bed]amix=inputs=5:normalize=0,lowpass=f=3200,\
loudnorm=I=-17:TP=-1.5:LRA=11,\
afade=t=in:st=0:d=0.8,afade=t=out:st=27:d=3" \
  -ac 2 -ar 44100 -b:a 160k -c:a libmp3lame "$DIR/warm.mp3"

echo "Done — three distinct demos in public/bgm/."
echo "  calm   = soft ambient (no beat)"
echo "  upbeat = rhythmic pulse"
echo "  warm   = gentle major arpeggio"
echo "Replace with licensed tracks for production ads when ready."
