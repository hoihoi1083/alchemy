/** Approximate average glyph width for layout (preview + burn). */
export function avgCharWidthPx(fontSize: number): number {
  return fontSize * 0.52;
}

export function maxCharsPerLine(boxWidthPx: number, fontSize: number): number {
  return Math.max(4, Math.floor(boxWidthPx / avgCharWidthPx(fontSize)));
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

  const lines: string[] = [];
  for (let i = 0; i < trimmed.length; i += maxChars) {
    lines.push(trimmed.slice(i, i + maxChars));
  }
  return lines.length ? lines : [""];
}

/** Wrap plain text to fit a pixel box width (honours manual newlines). */
export function wrapTextToLines(text: string, boxWidthPx: number, fontSize: number): string[] {
  const maxChars = maxCharsPerLine(boxWidthPx, fontSize);
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    lines.push(...wrapParagraph(para, maxChars));
  }
  return lines.length ? lines : [""];
}

export function wrappedLineCount(text: string, boxWidthPx: number, fontSize: number): number {
  return wrapTextToLines(text, boxWidthPx, fontSize).filter((l) => l.length > 0).length || 1;
}

export function textBoxHeightPx(lineCount: number, fontSize: number, lineHeight = 1.35): number {
  return Math.max(fontSize * 1.2, lineCount * fontSize * lineHeight);
}
