/**
 * Export docs/competitive-analysis-zh.md to PDF and DOCX.
 * Usage: node scripts/export-competitive-analysis.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { mdToPdf } from "md-to-pdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const mdPath = path.join(root, "docs/competitive-analysis-zh.md");
const outDir = path.join(root, "docs");
const pdfPath = path.join(outDir, "competitive-analysis-zh.pdf");
const docxPath = path.join(outDir, "competitive-analysis-zh.docx");
const htmlPath = path.join(outDir, "competitive-analysis-zh.html");
const cssPath = path.join(outDir, "competitive-analysis-export.css");

const css = `
@page { margin: 18mm 16mm; size: A4; }
body {
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #1a1a1a;
}
h1 { font-size: 22pt; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-top: 0; }
h2 { font-size: 16pt; color: #047857; margin-top: 24px; page-break-after: avoid; }
h3 { font-size: 13pt; color: #334155; page-break-after: avoid; }
h4 { font-size: 11.5pt; color: #475569; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 9.5pt; page-break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #ecfdf5; font-weight: 600; }
tr:nth-child(even) td { background: #f8fafc; }
code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; overflow-x: auto; font-size: 9pt; }
blockquote { border-left: 4px solid #10b981; margin: 12px 0; padding: 8px 16px; background: #f0fdf4; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
a { color: #047857; }
`;

fs.writeFileSync(cssPath, css.trim());

console.log("Generating PDF…");
await mdToPdf(
  { path: mdPath },
  {
    dest: pdfPath,
    css,
    pdf_options: {
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
    },
    launch_options: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
);
console.log("PDF:", pdfPath);

// macOS textutil: markdown → HTML (basic) then HTML → docx
console.log("Generating DOCX via textutil…");
try {
  execSync(`textutil -convert html -stdout "${mdPath}"`, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  // textutil doesn't read markdown tables well; build styled HTML manually
  const md = fs.readFileSync(mdPath, "utf8");
  const bodyHtml = markdownToSimpleHtml(md);
  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Alchemy Studio 竞品深度分析报告</title>
<style>${css}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  fs.writeFileSync(htmlPath, fullHtml, "utf8");
  execSync(`textutil -convert docx "${htmlPath}" -output "${docxPath}"`, { stdio: "inherit" });
  console.log("DOCX:", docxPath);
  console.log("HTML:", htmlPath);
} catch (e) {
  console.error("DOCX generation failed:", e.message);
  process.exit(1);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToSimpleHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inTable = false;
  let inCode = false;
  let codeBuf = [];
  let inUl = false;

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
  function closeCode() {
    if (inCode) {
      out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
      inCode = false;
      codeBuf = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      closeTable();
      closeUl();
      if (inCode) closeCode();
      else inCode = true;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    if (line.startsWith("|")) {
      closeUl();
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
    } else {
      closeTable();
    }

    if (line.startsWith("# ")) {
      closeUl();
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      closeUl();
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      closeUl();
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
    } else if (line.startsWith("#### ")) {
      closeUl();
      out.push(`<h4>${inlineFormat(line.slice(5))}</h4>`);
    } else if (line.startsWith("- ")) {
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inlineFormat(line.slice(2))}</li>`);
    } else if (line.startsWith("> ")) {
      closeUl();
      out.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
    } else if (line === "---") {
      closeUl();
      out.push("<hr/>");
    } else if (line.trim() === "") {
      closeUl();
    } else {
      closeUl();
      out.push(`<p>${inlineFormat(line)}</p>`);
    }
  }
  closeTable();
  closeUl();
  closeCode();
  return out.join("\n");
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}
