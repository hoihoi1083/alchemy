#!/usr/bin/env python3
"""Burn timed captions on vertical reel (CJK-safe via PIL)."""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

CAPTIONS = [
    (0.0, 2.2, "一张产品图\n今天就要交稿？", "top"),
    (2.0, 4.2, "上传产品图\n无需写 Prompt", "bottom"),
    (4.0, 7.2, "AI 研究\n受众 · 竞品 · 内容角度", "bottom"),
    (7.0, 10.2, "先规划，再生成。", "top"),
    (9.8, 13.2, "分镜优先", "top"),
    (13.0, 17.2, "一个产品\n多种创意方向", "bottom"),
    (17.0, 20.2, "编辑 · 调整 · 迭代", "bottom"),
    (20.0, 22.5, "一张照片，完整 campaign\n试试 Alchemy →", "center"),
]

FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/Users/michaelng/Desktop/alchemy-studio/public/compositor/fonts/NotoSansTC-Regular.ttf",
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size, index=0)
            except OSError:
                try:
                    return ImageFont.truetype(p, size)
                except OSError:
                    continue
    return ImageFont.load_default()


def draw_caption_frame(w: int, h: int, text: str, position: str, scale: float = 1.0) -> np.ndarray:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    size = max(28, int(w * 0.052 * scale))
    font = load_font(size)
    lines = text.split("\n")
    heights = []
    widths = []
    for line in lines:
        bb = draw.textbbox((0, 0), line, font=font)
        widths.append(bb[2] - bb[0])
        heights.append(bb[3] - bb[1])
    gap = int(size * 0.25)
    block_h = sum(heights) + gap * (len(lines) - 1)
    margin = int(h * 0.08)
    if position == "top":
        y = margin
    elif position == "center":
        y = (h - block_h) // 2
    else:
        y = h - margin - block_h
    for i, line in enumerate(lines):
        x = (w - widths[i]) // 2
        for dx, dy in [(-3, 0), (3, 0), (0, -3), (0, 3), (-2, -2), (2, 2)]:
            draw.text((x + dx, y + dy), line, font=font, fill=(0, 0, 0, 200))
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))
        y += heights[i] + gap
    return np.array(img)


def main() -> None:
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    cap = cv2.VideoCapture(str(inp))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open {inp}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    tmp = out.with_suffix(".tmp.mp4")
    writer = cv2.VideoWriter(str(tmp), fourcc, fps, (w, h))
    overlays = {
        pos: {text: draw_caption_frame(w, h, text, pos) for _, _, text, pos in CAPTIONS}
        for pos in {"top", "bottom", "center"}
    }
    frame_i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t = frame_i / fps
        for start, end, text, pos in CAPTIONS:
            if start <= t < end:
                ov = overlays[pos][text]
                alpha = ov[:, :, 3:4] / 255.0
                rgb = ov[:, :, :3][:, :, ::-1]
                frame = (frame * (1 - alpha) + rgb * alpha).astype(np.uint8)
                break
        writer.write(frame)
        frame_i += 1
    cap.release()
    writer.release()
    import subprocess

    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp),
            "-i",
            str(inp),
            "-map",
            "0:v",
            "-map",
            "1:a?",
            "-c:v",
            "libx264",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            str(out),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    tmp.unlink(missing_ok=True)
    print("Done", out)


if __name__ == "__main__":
    main()
