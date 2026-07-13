/**
 * Export a playbook markdown file to PDF on the Desktop (Chrome headless).
 * Usage: node scripts/export-playbook-pdf.mjs [md-path] [pdf-path]
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

const mdPath =
  process.argv[2] ?? path.join(root, "docs/PLAYBOOK_OFFERTODAY_SAAS_PREROLL.md");
const pdfPath =
  process.argv[3] ??
  path.join(process.env.HOME ?? "", "Desktop/PLAYBOOK_OFFERTODAY_SAAS_PREROLL.pdf");

const css = `
@page { margin: 16mm 14mm; size: A4; }
body {
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", -apple-system, sans-serif;
  font-size: 10.5pt;
  line-height: 1.5;
  color: #0f172a;
  max-width: 100%;
}
h1 {
  font-size: 20pt;
  border-bottom: 3px solid #2563eb;
  padding-bottom: 8px;
  margin-top: 0;
  page-break-after: avoid;
}
h2 {
  font-size: 14pt;
  color: #1d4ed8;
  margin-top: 22px;
  page-break-after: avoid;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
}
h3 { font-size: 12pt; color: #334155; page-break-after: avoid; }
h4 { font-size: 10.5pt; color: #475569; page-break-after: avoid; }
p { margin: 8px 0; }
table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0 14px;
  font-size: 8.5pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #cbd5e1;
  padding: 5px 6px;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
th {
  background: #eff6ff;
  font-weight: 600;
  color: #1e3a8a;
}
tr:nth-child(even) td { background: #f8fafc; }
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 8.5pt;
  font-family: Menlo, Monaco, monospace;
}
pre {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #2563eb;
  padding: 10px 12px;
  overflow-x: auto;
  font-size: 8.5pt;
  line-height: 1.45;
  page-break-inside: avoid;
  white-space: pre-wrap;
}
pre code { background: none; padding: 0; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
ul, ol { margin: 6px 0; padding-left: 20px; }
li { margin: 3px 0; }
strong { color: #0f172a; }
`;

if (!fs.existsSync(mdPath)) {
  console.error("Missing markdown:", mdPath);
  process.exit(1);
}

const chrome = findChrome();
if (!chrome) {
  console.error("Chrome/Chromium not found for PDF export.");
  process.exit(1);
}

const md = fs.readFileSync(mdPath, "utf8");
const title = md.match(/^#\s+(.+)/m)?.[1] ?? "Playbook";
const htmlPath = path.join(root, "docs/.playbook-export-temp.html");
const html = buildHtmlDocument({
  title,
  css,
  bodyHtml: markdownToHtml(md),
  lang: "zh-HK",
});

fs.writeFileSync(htmlPath, html, "utf8");
fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

console.log("Source:", mdPath);
console.log("Generating PDF via Chrome headless…");

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

const stat = fs.statSync(pdfPath);
console.log("PDF:", pdfPath);
console.log("Size:", `${Math.round(stat.size / 1024)} KB`);
