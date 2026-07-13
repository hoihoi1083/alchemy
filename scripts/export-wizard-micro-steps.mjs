/**
 * Export docs/WIZARD_MICRO_STEPS.md to PDF + DOCX on the Desktop.
 * Usage: node scripts/export-wizard-micro-steps.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  buildHtmlDocument,
  escapeHtml,
  findChrome,
  markdownToHtml,
} from "./lib/markdown-to-html.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const desktop = path.join(process.env.HOME ?? "", "Desktop");

const mdPath = path.join(root, "docs/WIZARD_MICRO_STEPS.md");
const pdfPath = path.join(desktop, "WIZARD_MICRO_STEPS.pdf");
const docxPath = path.join(desktop, "WIZARD_MICRO_STEPS.docx");
const htmlPath = path.join(root, "docs/.wizard-micro-steps-export.html");

const css = `
@page { margin: 14mm 12mm; size: A4; }
body {
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", -apple-system, sans-serif;
  font-size: 9.5pt;
  line-height: 1.45;
  color: #0f172a;
}
h1 {
  font-size: 18pt;
  border-bottom: 3px solid #7c3aed;
  padding-bottom: 6px;
  margin-top: 0;
  page-break-after: avoid;
}
h2 {
  font-size: 13pt;
  color: #6d28d9;
  margin-top: 18px;
  page-break-after: avoid;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 3px;
}
h3 { font-size: 11pt; color: #334155; page-break-after: avoid; }
h4 { font-size: 10pt; color: #475569; page-break-after: avoid; }
h5, h6 { font-size: 9.5pt; color: #64748b; page-break-after: avoid; }
p { margin: 6px 0; }
table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0 12px;
  font-size: 7.5pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #cbd5e1;
  padding: 4px 5px;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
th {
  background: #f5f3ff;
  font-weight: 600;
  color: #5b21b6;
}
tr:nth-child(even) td { background: #fafafa; }
code {
  background: #f1f5f9;
  padding: 1px 3px;
  border-radius: 3px;
  font-size: 7.5pt;
  font-family: Menlo, Monaco, monospace;
}
pre {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #7c3aed;
  padding: 8px 10px;
  font-size: 7.5pt;
  line-height: 1.4;
  page-break-inside: avoid;
  white-space: pre-wrap;
}
pre code { background: none; padding: 0; }
blockquote {
  border-left: 4px solid #a78bfa;
  margin: 8px 0;
  padding: 6px 12px;
  background: #faf5ff;
  color: #4c1d95;
}
hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
ul, ol { margin: 4px 0; padding-left: 18px; }
li { margin: 2px 0; }
strong { color: #0f172a; }
`;

if (!fs.existsSync(mdPath)) {
  console.error("Missing:", mdPath);
  process.exit(1);
}

const md = fs.readFileSync(mdPath, "utf8");
const title = md.match(/^#\s+(.+)/m)?.[1] ?? "Wizard Micro Steps";
const html = buildHtmlDocument({
  title,
  css,
  bodyHtml: markdownToHtml(md),
  lang: "en",
});

fs.writeFileSync(htmlPath, html, "utf8");

console.log("Source:", mdPath);

const chrome = findChrome();
if (!chrome) {
  console.error("Chrome not found — PDF skipped.");
} else {
  console.log("Generating PDF…");
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--print-to-pdf=${pdfPath}`,
      "--print-to-pdf-no-header",
      `file://${htmlPath}`,
    ],
    { stdio: "inherit" },
  );
  const pdfStat = fs.statSync(pdfPath);
  console.log("PDF:", pdfPath, `(${Math.round(pdfStat.size / 1024)} KB)`);
}

console.log("Generating DOCX…");
execFileSync("textutil", ["-convert", "docx", htmlPath, "-output", docxPath], {
  stdio: "inherit",
});
const docxStat = fs.statSync(docxPath);
console.log("DOCX:", docxPath, `(${Math.round(docxStat.size / 1024)} KB)`);
