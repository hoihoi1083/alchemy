/** Approximate average glyph width for layout (preview + burn). */
export function avgCharWidthPx(fontSize: number, sampleText = ""): number {
  const stripped = sampleText.replace(/\s+/g, "");
  if (!stripped) return fontSize * 0.52;
  const cjk = (stripped.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  // CJK glyphs are roughly square; Latin is narrower.
  if (cjk / stripped.length >= 0.35) return fontSize * 0.92;
  return fontSize * 0.52;
}

export function maxCharsPerLine(
  boxWidthPx: number,
  fontSize: number,
  sampleText = "",
): number {
  return Math.max(4, Math.floor(boxWidthPx / avgCharWidthPx(fontSize, sampleText)));
}

function wrapParagraph(para: string, maxChars: number): string[] {
  const trimmed = para.trimEnd();
  if (!trimmed) return [""];

  if (/\s/.test(trimmed)) {
    const words = trimmed.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if (!word) continue;
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (word.length <= maxChars) {
        current = word;
        continue;
      }
      for (let i = 0; i < word.length; i += maxChars) {
        const chunk = word.slice(i, i + maxChars);
        if (i + maxChars >= word.length) current = chunk;
        else lines.push(chunk);
      }
      if (word.length > maxChars) current = "";
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  // CJK / no-space: break near maxChars, prefer punctuation when nearby.
  const lines: string[] = [];
  let i = 0;
  while (i < trimmed.length) {
    if (trimmed.length - i <= maxChars) {
      lines.push(trimmed.slice(i));
      break;
    }
    let breakAt = i + maxChars;
    const window = trimmed.slice(i, Math.min(trimmed.length, i + maxChars + 4));
    const punct = window.search(/[，。！？、；：,.!?;:…]/);
    if (punct >= Math.floor(maxChars * 0.45) && punct < maxChars + 2) {
      breakAt = i + punct + 1;
    }
    lines.push(trimmed.slice(i, breakAt).trimEnd());
    i = breakAt;
  }
  return lines.length ? lines : [""];
}

/** Wrap plain text to fit a pixel box width (honours manual newlines). */
export function wrapTextToLines(text: string, boxWidthPx: number, fontSize: number): string[] {
  const maxChars = maxCharsPerLine(boxWidthPx, fontSize, text);
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    lines.push(...wrapParagraph(para, maxChars));
  }
  const cleaned = lines.map((l) => l.trimEnd()).filter((l, idx, arr) => l.length > 0 || arr.length === 1);
  return cleaned.length ? cleaned : [""];
}

export function wrappedLineCount(text: string, boxWidthPx: number, fontSize: number): number {
  return wrapTextToLines(text, boxWidthPx, fontSize).filter((l) => l.length > 0).length || 1;
}

export function textBoxHeightPx(lineCount: number, fontSize: number, lineHeight = 1.35): number {
  return Math.max(fontSize * 1.2, lineCount * fontSize * lineHeight);
}

export type CaptionBurnPosition =
  | "top"
  | "center"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type CaptionBurnPlan = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  /** Center-Y for each line (dominant-baseline: middle). */
  lineYs: number[];
};

function clampCaptionLines(text: string, lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) return lines;
  const head = lines.slice(0, maxLines - 1);
  const joiner = /\s/.test(text) ? " " : "";
  const rest = lines.slice(maxLines - 1).join(joiner);
  return [...head, rest];
}

/**
 * Vertical centers for each wrapped line, kept inside safe top/bottom margins.
 * Bottom captions grow upward; top grow downward; center is mid-frame.
 */
export function captionBlockLineYs(opts: {
  position: CaptionBurnPosition | undefined;
  lineCount: number;
  frameHeight: number;
  fontSize: number;
  lineHeight?: number;
  marginTopRatio?: number;
  marginBottomRatio?: number;
}): number[] {
  const lineCount = Math.max(1, opts.lineCount);
  const lineHeight = opts.lineHeight ?? Math.round(opts.fontSize * 1.35);
  const halfGlyph = opts.fontSize * 0.55;
  const blockSpan = (lineCount - 1) * lineHeight;
  const marginTop = Math.round(opts.frameHeight * (opts.marginTopRatio ?? 0.08));
  const marginBottom = Math.round(opts.frameHeight * (opts.marginBottomRatio ?? 0.08));
  const minCenterY = marginTop + halfGlyph;
  const maxCenterY = opts.frameHeight - marginBottom - halfGlyph;
  const available = Math.max(0, maxCenterY - minCenterY);

  const position = opts.position ?? "bottom";
  const isTop = position === "top" || position === "top-left" || position === "top-right";
  const isCenter = position === "center";

  let firstLineY: number;
  if (isCenter) {
    firstLineY = opts.frameHeight / 2 - blockSpan / 2;
  } else if (isTop) {
    firstLineY = minCenterY;
  } else {
    firstLineY = maxCenterY - blockSpan;
  }

  if (blockSpan > available) {
    firstLineY = minCenterY + Math.max(0, (available - blockSpan) / 2);
  } else {
    firstLineY = Math.max(minCenterY, Math.min(firstLineY, maxCenterY - blockSpan));
  }

  return Array.from({ length: lineCount }, (_, i) => Math.round(firstLineY + i * lineHeight));
}

/** Wrap + scale so caption fits width and stays within ~32% of frame height. */
export function planCaptionBurnText(
  text: string,
  videoWidth: number,
  videoHeight: number,
  opts?: {
    fontSizeScale?: number;
    maxLines?: number;
    position?: CaptionBurnPosition;
  },
): CaptionBurnPlan {
  const scale = opts?.fontSizeScale ?? 1;
  const maxLines = opts?.maxLines ?? 4;
  const boxWidth = Math.round(videoWidth * 0.88);
  const maxBlockHeight = videoHeight * 0.32;

  let fontSize = Math.max(28, Math.round(videoWidth * 0.052 * scale));
  let lines = clampCaptionLines(
    text,
    wrapTextToLines(text.trim(), boxWidth, fontSize).filter(Boolean),
    maxLines,
  );

  while (lines.length * fontSize * 1.35 > maxBlockHeight && fontSize > 22) {
    fontSize -= 2;
    lines = clampCaptionLines(
      text,
      wrapTextToLines(text.trim(), boxWidth, fontSize).filter(Boolean),
      maxLines,
    );
  }

  if (!lines.length && text.trim()) lines = [text.trim()];
  const lineHeight = Math.round(fontSize * 1.35);
  const lineYs = captionBlockLineYs({
    position: opts?.position,
    lineCount: Math.max(1, lines.length),
    frameHeight: videoHeight,
    fontSize,
    lineHeight,
  });

  return { lines, fontSize, lineHeight, lineYs };
}

/** Caption burn: wrap to ~88% of frame width (same font scale as overlay burn). */
export function wrapCaptionTextForVideo(
  text: string,
  videoWidth: number,
  opts?: { fontSizeScale?: number; maxLines?: number },
): string[] {
  return planCaptionBurnText(text, videoWidth, Math.round((videoWidth * 16) / 9), opts).lines;
}
