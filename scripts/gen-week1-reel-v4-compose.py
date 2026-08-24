#!/usr/bin/env python3
"""
Week 1 Reel v4 — local compose (NO fal / no generative video text).

Uses Desktop/mascot-angles + lockup + crisp PIL typography, then ffmpeg.

  python3 scripts/gen-week1-reel-v4-compose.py --both
  python3 scripts/gen-week1-reel-v4-compose.py --lang en
  python3 scripts/gen-week1-reel-v4-compose.py --lang zh

Why not fal/H3/Seedance for this reel:
  Generative video invents unreadable letters on UI cards.
  This script draws real fonts so every word stays clear.
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

HOME = Path.home()
W, H = 1080, 1920
FPS = 30
OUT_DIR = HOME / "Downloads" / "Alchemy Week 1 Marketing" / "Reel 1"
WORK = Path.cwd() / ".tmp" / "week1-reel-v4"
MASCOT_DIR = HOME / "Desktop" / "mascot-angles"
LOCKUP = HOME / "Desktop" / "alchemy-carousel-v2" / "alchemy-lockup-black.png"
FONTS_DIR = Path.cwd() / "public" / "compositor" / "fonts"

# Soft Alchemy UI palette (light, not purple-glow dark)
BG = (248, 247, 252)
INK = (30, 27, 54)
MUTED = (90, 86, 120)
VIOLET = (109, 74, 255)
VIOLET_SOFT = (232, 226, 255)
CARD = (255, 255, 255)
ACCENT = (255, 92, 138)
OK = (34, 160, 110)

COPY = {
    "en": {
        "hook1": "One product photo.",
        "hook2": "The campaign is due today.",
        "upload": "Upload one product photo",
        "no_prompt": "No prompt needed.",
        "prompt_x": "Prompt",
        "research_title": "AI Research",
        "research_cards": [
            "Audience",
            "Competitors",
            "Content Angle",
            "Visual Direction",
        ],
        "plan": "Plan first. Generate second.",
        "campaign_dir": "Campaign Direction",
        "storyboard": "Storyboard",
        "scenes": [
            "Scene 01 — Hook",
            "Scene 02 — Product",
            "Scene 03 — Benefit",
            "Scene 04 — CTA",
        ],
        "outputs_title": "One product. Multiple creative directions.",
        "outputs": [
            "Lifestyle Post",
            "Benefit Ad",
            "Reel",
            "Campaign KV",
        ],
        "edit_title": "Edit. Adjust. Iterate.",
        "edit_items": [
            "Change headline",
            "Change scene",
            "Change visual",
            "Edit storyboard",
        ],
        "cta1": "One photo. Full campaign.",
        "cta2": "Try Alchemy →",
    },
    "zh": {
        "hook1": "只有一张产品图。",
        "hook2": "今天就要交 campaign？",
        "upload": "上传一张产品图",
        "no_prompt": "无需写 Prompt",
        "prompt_x": "Prompt",
        "research_title": "AI 研究",
        "research_cards": [
            "受众 Audience",
            "竞品 Competitors",
            "内容角度 Content Angle",
            "视觉方向 Visual Direction",
        ],
        "plan": "先规划，再生成。",
        "campaign_dir": "Campaign Direction",
        "storyboard": "Storyboard 分镜",
        "scenes": [
            "Scene 01 — Hook 钩子",
            "Scene 02 — Product 产品",
            "Scene 03 — Benefit 利益点",
            "Scene 04 — CTA 行动号召",
        ],
        "outputs_title": "一个产品，多种创意方向",
        "outputs": [
            "Lifestyle Post",
            "Benefit Ad",
            "Reel",
            "Campaign KV",
        ],
        "edit_title": "编辑 · 调整 · 迭代",
        "edit_items": [
            "改标题",
            "改场景",
            "改视觉",
            "改分镜",
        ],
        "cta1": "一张照片，完整 campaign",
        "cta2": "试试 Alchemy →",
    },
}

# beat durations (seconds)
BEATS = [
    ("01_hook", 2.4),
    ("02_upload", 2.4),
    ("03_research", 3.0),
    ("04_plan", 2.4),
    ("05_storyboard", 3.2),
    ("06_outputs", 3.4),
    ("07_edit", 2.8),
    ("08_cta", 2.6),
]


def font_path(prefer_cjk: bool) -> str:
    cands = []
    if prefer_cjk:
        cands += [
            "/System/Library/Fonts/STHeiti Medium.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            str(FONTS_DIR / "NotoSansTC-Regular.ttf"),
        ]
    cands += [
        str(FONTS_DIR / "NotoSans-Bold.ttf"),
        str(FONTS_DIR / "NotoSans-Regular.ttf"),
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for p in cands:
        if Path(p).exists():
            return p
    raise SystemExit("No usable font found")


def load_font(size: int, prefer_cjk: bool, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = font_path(prefer_cjk)
    try:
        return ImageFont.truetype(path, size, index=0)
    except OSError:
        return ImageFont.truetype(path, size)


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill,
    outline=None,
    width: int = 2,
) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def paste_mascot(base: Image.Image, name: str, box: tuple[int, int, int, int]) -> None:
    src = Image.open(MASCOT_DIR / name).convert("RGBA")
    # rough center-crop square then fit
    w, h = src.size
    side = min(w, h)
    left = (w - side) // 2
    top = max(0, (h - side) // 2 - side // 10)
    src = src.crop((left, top, left + side, top + side))
    tw, th = box[2] - box[0], box[3] - box[1]
    src = src.resize((tw, th), Image.Resampling.LANCZOS)
    # soft circular-ish mask via alpha boost on edges
    base.paste(src, (box[0], box[1]), src)


def make_product_card(size: int = 280) -> Image.Image:
    """Simple cream-jar product still — readable stand-in, not AI gibberish."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((8, 8, size - 8, size - 8), 28, fill=(255, 255, 255), outline=VIOLET_SOFT, width=4)
    # jar body
    jar = [(size // 2 - 55, 70), (size // 2 + 55, 70), (size // 2 + 70, 220), (size // 2 - 70, 220)]
    d.polygon(jar, fill=(245, 236, 220), outline=(200, 180, 150))
    d.ellipse((size // 2 - 58, 55, size // 2 + 58, 90), fill=(220, 220, 225), outline=(160, 160, 170))
    d.rectangle((size // 2 - 40, 120, size // 2 + 40, 155), fill=(255, 255, 255))
    f = load_font(22, False, True)
    d.text((size // 2, 137), "CREAM", font=f, fill=INK, anchor="mm")
    return img


def stamp_lockup(base: Image.Image) -> None:
    if not LOCKUP.exists():
        return
    lock = Image.open(LOCKUP).convert("RGBA")
    target_h = int(H * 0.045)
    ratio = target_h / lock.height
    lock = lock.resize((max(1, int(lock.width * ratio)), target_h), Image.Resampling.LANCZOS)
    margin = int(min(W, H) * 0.035)
    base.alpha_composite(lock, (W - margin - lock.width, H - margin - lock.height))


def draw_centered_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    y: int,
    font: ImageFont.ImageFont,
    fill=INK,
    gap: int = 18,
) -> int:
    for line in lines:
        bb = draw.textbbox((0, 0), line, font=font)
        tw = bb[2] - bb[0]
        draw.text(((W - tw) // 2, y), line, font=font, fill=fill)
        y += (bb[3] - bb[1]) + gap
    return y


def scene_hook(lang: str) -> Image.Image:
    c = COPY[lang]
    cjk = lang == "zh"
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    title = load_font(64 if cjk else 72, cjk, True)
    sub = load_font(40 if cjk else 44, cjk)
    y = 160
    y = draw_centered_lines(d, [c["hook1"]], y, title, INK, 16)
    y = draw_centered_lines(d, [c["hook2"]], y + 8, sub, MUTED, 12)

    # product + deadline chip
    prod = make_product_card(320)
    img.alpha_composite(prod, ((W - 320) // 2 - 160, 520))
    paste_mascot(img, "mascot-expr-thinking.jpg", (620, 480, 980, 840))

    # blank mind / deadline chip
    rounded_rect(d, (120, 980, 960, 1120), 28, CARD, VIOLET, 3)
    chip = load_font(36 if cjk else 40, cjk, True)
    deadline = "Deadline: TODAY" if lang == "en" else "截止：今天"
    d.text((W // 2, 1050), deadline, font=chip, fill=ACCENT, anchor="mm")

    stamp_lockup(img)
    return img


def scene_upload(lang: str) -> Image.Image:
    c = COPY[lang]
    cjk = lang == "zh"
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    title = load_font(52 if cjk else 56, cjk, True)
    big = load_font(58 if cjk else 64, cjk, True)
    draw_centered_lines(d, [c["upload"]], 150, title, INK, 12)

    # upload card
    rounded_rect(d, (140, 320, 940, 720), 32, CARD, VIOLET, 4)
    prod = make_product_card(240)
    img.alpha_composite(prod, ((W - 240) // 2, 380))
    small = load_font(28, cjk)
    d.text((W // 2, 660), "✓", font=load_font(48, False, True), fill=OK, anchor="mm")

    # Prompt box crossed out
    rounded_rect(d, (180, 780, 900, 920), 24, (255, 245, 245), ACCENT, 3)
    pf = load_font(40, False, True)
    d.text((240, 850), c["prompt_x"], font=pf, fill=(180, 120, 120), anchor="lm")
    # red strike
    d.line((220, 850, 860, 850), fill=ACCENT, width=8)
    d.text((860, 820), "❌", font=load_font(44, False), fill=ACCENT, anchor="mm")

    draw_centered_lines(d, [c["no_prompt"]], 1000, big, VIOLET, 10)
    paste_mascot(img, "mascot-expr-wink.jpg", (700, 1180, 1000, 1480))
    stamp_lockup(img)
    return img


def scene_research(lang: str) -> Image.Image:
    c = COPY[lang]
    cjk = lang == "zh"
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    title = load_font(56 if cjk else 60, cjk, True)
    draw_centered_lines(d, [c["research_title"]], 140, title, INK, 10)

    card_f = load_font(34 if cjk else 38, cjk, True)
    labels = c["research_cards"]
    y0 = 280
    for i, label in enumerate(labels):
        y = y0 + i * 200
        rounded_rect(d, (120, y, 960, y + 160), 28, CARD, VIOLET, 3)
        d.ellipse((160, y + 45, 250, y + 135), fill=VIOLET_SOFT)
        d.text((205, y + 90), str(i + 1), font=load_font(36, False, True), fill=VIOLET, anchor="mm")
        d.text((290, y + 80), label, font=card_f, fill=INK, anchor="lm")

    paste_mascot(img, "mascot-expr-proud.jpg", (720, 1400, 1000, 1680))
    stamp_lockup(img)
    return img


def scene_plan(lang: str) -> Image.Image:
    c = COPY[lang]
    cjk = lang == "zh"
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    big = load_font(56 if cjk else 60, cjk, True)
    mid = load_font(40 if cjk else 44, cjk, True)
    draw_centered_lines(d, [c["plan"]], 200, big, INK, 14)

    rounded_rect(d, (180, 480, 900, 640), 28, VIOLET_SOFT, VIOLET, 3)
    d.text((W // 2, 560), c["campaign_dir"], font=mid, fill=VIOLET, anchor="mm")

    # arrow
    d.polygon([(540, 680), (500, 740), (580, 740)], fill=VIOLET)

    rounded_rect(d, (180, 780, 900, 940), 28, CARD, VIOLET, 4)
    d.text((W // 2, 860), c["storyboard"], font=mid, fill=INK, anchor="mm")

    paste_mascot(img, "mascot-pointing.jpg", (360, 1100, 720, 1460))
    stamp_lockup(img)
    return img


def scene_storyboard(lang: str) -> Image.Image:
    c = COPY[lang]
    cjk = lang == "zh"
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    title = load_font(48 if cjk else 52, cjk, True)
    draw_centered_lines(d, [c["storyboard"]], 120, title, INK, 10)
    draw_centered_lines(d, [c["plan"]], 210, load_font(32 if cjk else 34, cjk), MUTED, 8)

    sf = load_font(30 if cjk else 32, cjk, True)
    for i, label in enumerate(c["scenes"]):
        col = i % 2
        row = i // 2
        x0 = 90 + col * 460
        y0 = 360 + row * 520
        rounded_rect(d, (x0, y0, x0 + 420, y0 + 460), 28, CARD, VIOLET, 3)
        # fake scene thumbnail band
        d.rounded_rectangle((x0 + 24, y0 + 24, x0 + 396, y0 + 280), 20, fill=VIOLET_SOFT)
        d.text((x0 + 210, y0 + 152), f"{i + 1:02d}", font=load_font(64, False, True), fill=VIOLET, anchor="mm")
        d.text((x0 + 210, y0 + 360), label, font=sf, fill=INK, anchor="mm")

    stamp_lockup(img)
    return img


def scene_outputs(lang: str) -> Image.Image:
    c = COPY[lang]
    cjk = lang == "zh"
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    title = load_font(44 if cjk else 48, cjk, True)
    draw_centered_lines(d, c["outputs_title"].split("\n") if "\n" in c["outputs_title"] else [c["outputs_title"]], 130, title, INK, 12)

    colors = [
        (255, 236, 220),
        (220, 240, 255),
        (232, 226, 255),
        (220, 250, 235),
    ]
    labels = c["outputs"]
    of = load_font(34 if cjk else 36, cjk, True)
    for i, (label, col) in enumerate(zip(labels, colors)):
        y = 340 + i * 280
        rounded_rect(d, (120, y, 960, y + 230), 28, CARD, VIOLET, 3)
        d.rounded_rectangle((150, y + 30, 420, y + 200), 20, fill=col)
        # different mini layouts so it does NOT look like resize
        dd = ImageDraw.Draw(img)
        if i == 0:
            dd.ellipse((220, y + 70, 350, y + 170), fill=(255, 200, 160))
        elif i == 1:
            dd.rectangle((190, y + 55, 380, y + 90), fill=VIOLET)
            dd.rectangle((190, y + 110, 360, y + 175), fill=(200, 210, 230))
        elif i == 2:
            dd.rounded_rectangle((230, y + 45, 340, y + 190), 16, fill=INK)
            dd.ellipse((255, y + 95, 315, y + 145), fill=(255, 255, 255))
        else:
            dd.polygon([(285, y + 50), (380, y + 175), (190, y + 175)], fill=VIOLET)
        d.text((470, y + 115), label, font=of, fill=INK, anchor="lm")

    paste_mascot(img, "mascot-expr-excited.jpg", (780, 1480, 1020, 1720))
    stamp_lockup(img)
    return img


def scene_edit(lang: str) -> Image.Image:
    c = COPY[lang]
    cjk = lang == "zh"
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    title = load_font(52 if cjk else 56, cjk, True)
    draw_centered_lines(d, [c["edit_title"]], 150, title, INK, 12)

    # selected result card
    rounded_rect(d, (140, 320, 940, 700), 32, CARD, VIOLET, 4)
    d.rounded_rectangle((200, 360, 520, 660), 24, fill=VIOLET_SOFT)
    paste_mascot(img, "mascot-3q-right.jpg", (230, 390, 490, 650))
    d.text((700, 500), "✓", font=load_font(72, False, True), fill=OK, anchor="mm")

    ef = load_font(36 if cjk else 38, cjk, True)
    for i, item in enumerate(c["edit_items"]):
        y = 780 + i * 160
        rounded_rect(d, (160, y, 920, y + 130), 24, CARD, VIOLET_SOFT, 3)
        d.text((220, y + 65), f"→  {item}", font=ef, fill=INK, anchor="lm")

    stamp_lockup(img)
    return img


def scene_cta(lang: str) -> Image.Image:
    c = COPY[lang]
    cjk = lang == "zh"
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    paste_mascot(img, "mascot-front-hero.jpg", (240, 280, 840, 880))

    if LOCKUP.exists():
        lock = Image.open(LOCKUP).convert("RGBA")
        target_h = 90
        ratio = target_h / lock.height
        lock = lock.resize((max(1, int(lock.width * ratio)), target_h), Image.Resampling.LANCZOS)
        img.alpha_composite(lock, ((W - lock.width) // 2, 920))

    big = load_font(52 if cjk else 58, cjk, True)
    mid = load_font(40 if cjk else 44, cjk, True)
    draw_centered_lines(d, [c["cta1"]], 1080, big, INK, 14)
    # CTA pill
    rounded_rect(d, (220, 1280, 860, 1420), 40, VIOLET, None, 0)
    d.text((W // 2, 1350), c["cta2"], font=mid, fill=(255, 255, 255), anchor="mm")
    return img


SCENE_BUILDERS = {
    "01_hook": scene_hook,
    "02_upload": scene_upload,
    "03_research": scene_research,
    "04_plan": scene_plan,
    "05_storyboard": scene_storyboard,
    "06_outputs": scene_outputs,
    "07_edit": scene_edit,
    "08_cta": scene_cta,
}


def still_to_clip(still: Path, seconds: float, out_mp4: Path) -> None:
    frames = max(1, int(round(seconds * FPS)))
    # gentle Ken Burns zoom
    vf = (
        f"scale=1200:2133,"
        f"zoompan=z='min(1.08,1+0.00035*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={frames}:s={W}x{H}:fps={FPS},"
        f"format=yuv420p"
    )
    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(still),
        "-vf",
        vf,
        "-t",
        f"{seconds:.3f}",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-an",
        str(out_mp4),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(r.stderr[-2000:])


def concat_clips(clips: list[Path], out_mp4: Path) -> None:
    lst = out_mp4.with_suffix(".txt")
    lst.write_text("".join(f"file '{c.resolve()}'\n" for c in clips), encoding="utf-8")
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(lst),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(out_mp4),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(r.stderr[-2000:])


def build_lang(lang: str) -> Path:
    assert lang in ("en", "zh")
    work = WORK / lang
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    clips: list[Path] = []
    for sid, dur in BEATS:
        still = work / f"{sid}.png"
        SCENE_BUILDERS[sid](lang).convert("RGB").save(still, quality=95)
        clip = work / f"{sid}.mp4"
        print(f"[{lang}] {sid} ({dur}s)")
        still_to_clip(still, dur, clip)
        clips.append(clip)

    suffix = "en" if lang == "en" else "zh-cn"
    out = OUT_DIR / f"week1-reel-v4-{suffix}.mp4"
    concat_clips(clips, out)
    meta = {
        "lang": lang,
        "engine": "local-compose-no-fal",
        "beats": [{"id": a, "sec": b} for a, b in BEATS],
        "copy": COPY[lang],
        "mascot_dir": str(MASCOT_DIR),
    }
    (OUT_DIR / f"week1-reel-v4-{suffix}-storyboard.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {out}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["en", "zh"])
    ap.add_argument("--both", action="store_true")
    args = ap.parse_args()
    if not MASCOT_DIR.is_dir():
        raise SystemExit(f"Missing mascot folder: {MASCOT_DIR}")
    langs: list[str]
    if args.both or (not args.lang):
        langs = ["en", "zh"]
    else:
        langs = [args.lang]
    for lang in langs:
        build_lang(lang)


if __name__ == "__main__":
    main()
