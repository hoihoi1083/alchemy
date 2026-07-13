/** Minimal markdown → HTML for doc export (tables, headings, code, lists). */

export function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

export function markdownToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inTable = false;
  let inCode = false;
  let codeBuf = [];
  let inUl = false;
  let inOl = false;

  function closeTable() {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  }
  function closeUl() {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
  }
  function closeOl() {
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  }
  function closeLists() {
    closeUl();
    closeOl();
  }
  function closeCode() {
    if (inCode) {
      out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
      inCode = false;
      codeBuf = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      closeTable();
      closeLists();
      if (inCode) closeCode();
      else inCode = true;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    if (line.startsWith("|")) {
      closeLists();
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      if (!inTable) {
        out.push("<table><thead><tr>");
        cells.forEach((c) => out.push(`<th>${inlineFormat(c)}</th>`));
        out.push("</tr></thead><tbody>");
        inTable = true;
      } else {
        out.push("<tr>");
        cells.forEach((c) => out.push(`<td>${inlineFormat(c)}</td>`));
        out.push("</tr>");
      }
      continue;
    }
    closeTable();

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeLists();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`);
    } else if (line.startsWith("- ")) {
      closeOl();
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inlineFormat(line.slice(2))}</li>`);
    } else if (/^\d+\.\s/.test(line)) {
      closeUl();
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inlineFormat(line.replace(/^\d+\.\s/, ""))}</li>`);
    } else if (line.startsWith("> ")) {
      closeLists();
      out.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
    } else if (line === "---") {
      closeLists();
      out.push("<hr/>");
    } else if (line.trim() === "") {
      closeLists();
    } else {
      closeLists();
      out.push(`<p>${inlineFormat(line)}</p>`);
    }
  }
  closeTable();
  closeLists();
  closeCode();
  return out.join("\n");
}

export function buildHtmlDocument({ title, css, bodyHtml, lang = "en" }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

import fs from "node:fs";

export function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}
