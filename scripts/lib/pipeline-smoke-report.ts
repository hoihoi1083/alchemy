import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { SmokeArtifact, SmokeLayoutReviewRecord, SmokeReviewRecord } from "./pipeline-smoke-scenario";

export type StepRow = {
  id: string;
  label: string;
  tier: string;
  status: string;
  ms: number;
  detail?: string;
  costUsd?: number;
};

export type SmokeManifest = {
  runId: string;
  createdAt: string;
  scenario: typeof import("./pipeline-smoke-scenario").SMOKE_SCENARIO;
  steps: StepRow[];
  artifacts: SmokeArtifact[];
  reviews: SmokeReviewRecord[];
  layoutReviews: SmokeLayoutReviewRecord[];
  estCostUsd: number;
  reviewSummary: {
    reviewed: number;
    passed: number;
    failed: number;
    avgScore: number;
  };
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreClass(score: number): string {
  if (score >= 75) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

function mediaHtml(artifact: SmokeArtifact, outDir: string): string {
  const rel = artifact.file ? path.relative(outDir, path.join(outDir, artifact.file)) : "";
  if (!artifact.file) return "<p class='muted'>No file</p>";
  if (artifact.kind === "image") {
    return `<img src="${esc(artifact.file)}" alt="${esc(artifact.label)}" loading="lazy" />`;
  }
  if (artifact.kind === "video") {
    const poster = artifact.poster ? ` poster="${esc(artifact.poster)}"` : "";
    return `<video controls preload="metadata"${poster}><source src="${esc(artifact.file)}" type="video/mp4" /></video>`;
  }
  if (artifact.kind === "audio") {
    return `<audio controls preload="metadata"><source src="${esc(artifact.file)}" type="audio/mpeg" /></audio>`;
  }
  return `<a href="${esc(artifact.file)}">${esc(artifact.file)}</a>`;
}

export async function writeSmokeReport(
  outDir: string,
  manifest: SmokeManifest,
): Promise<{ htmlPath: string; jsonPath: string }> {
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  const artifactCards = manifest.artifacts
    .filter((a) => a.kind === "image" || a.kind === "video" || a.kind === "audio")
    .map((artifact) => {
      const review = manifest.reviews.find((r) => r.artifactId === artifact.id);
      const reviewBlock =
        review ?
          `<div class="review ${review.review.matchesExpectation ? "pass" : "fail"}">
            <div class="review-head">
              <span class="badge ${review.review.matchesExpectation ? "pass" : "fail"}">${review.review.matchesExpectation ? "PASS" : "FAIL"}</span>
              <span class="score ${scoreClass(review.review.score)}">${review.review.score}/100</span>
            </div>
            <p>${esc(review.review.summary)}</p>
            ${review.review.positives.length ? `<p><strong>Good:</strong> ${review.review.positives.map(esc).join(" · ")}</p>` : ""}
            ${review.review.issues.length ? `<p><strong>Issues:</strong> ${review.review.issues.map(esc).join(" · ")}</p>` : ""}
          </div>`
        : `<p class="muted">No vision review (skipped or N/A)</p>`;

      const layoutReview = manifest.layoutReviews.find((r) => r.artifactId === artifact.id);
      const layoutBlock =
        layoutReview ?
          `<div class="review ${layoutReview.matchesReferenceLayout ? "pass" : "fail"}">
            <div class="review-head">
              <span class="badge ${layoutReview.matchesReferenceLayout ? "pass" : "fail"}">LAYOUT ${layoutReview.matchesReferenceLayout ? "PASS" : "FAIL"}</span>
              <span class="score ${scoreClass(layoutReview.layoutScore)}">${layoutReview.layoutScore}/100</span>
            </div>
            <p>${esc(layoutReview.summary)}</p>
          </div>`
        : "";

      return `<section class="card" id="${esc(artifact.id)}">
        <h2>${esc(artifact.label)}</h2>
        <div class="media">${mediaHtml(artifact, outDir)}</div>
        ${artifact.poster ? `<p class="muted">Poster: <a href="${esc(artifact.poster)}">${esc(artifact.poster)}</a></p>` : ""}
        ${artifact.expectation ? `<details><summary>Expected</summary><p>${esc(artifact.expectation)}</p></details>` : ""}
        ${reviewBlock}
        ${layoutBlock}
      </section>`;
    })
    .join("\n");

  const stepRows = manifest.steps
    .map(
      (s) =>
        `<tr class="${s.status}">
          <td>${esc(s.id)}</td>
          <td>${esc(s.label)}</td>
          <td>${esc(s.status)}</td>
          <td>${s.costUsd ? `$${s.costUsd.toFixed(2)}` : "—"}</td>
          <td>${s.ms}</td>
          <td>${esc(s.detail ?? "")}</td>
        </tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pipeline smoke — ${esc(manifest.runId)}</title>
  <style>
    :root { --bg:#0f1117; --panel:#1a1d27; --text:#e8eaef; --muted:#9aa3b2; --good:#3dd68c; --warn:#f5c542; --bad:#f07178; --accent:#7aa2ff; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--text); }
    header { padding: 24px 32px; border-bottom: 1px solid #2a2f3d; }
    h1 { margin: 0 0 8px; font-size: 1.4rem; }
    .meta { color: var(--muted); font-size: 0.9rem; }
    main { padding: 24px 32px 48px; max-width: 1100px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 20px 0 32px; }
    .stat { background: var(--panel); padding: 14px 16px; border-radius: 10px; }
    .stat strong { display: block; font-size: 1.3rem; }
    .grid { display: grid; gap: 24px; }
    .card { background: var(--panel); border-radius: 12px; padding: 20px; }
    .card h2 { margin: 0 0 12px; font-size: 1.1rem; }
    .media img, .media video { max-width: 100%; max-height: 480px; border-radius: 8px; background: #000; }
    .media audio { width: 100%; }
    .review { margin-top: 14px; padding-top: 14px; border-top: 1px solid #2a2f3d; }
    .review-head { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
    .badge { font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
    .badge.pass { background: #1a3d2e; color: var(--good); }
    .badge.fail { background: #3d1a1f; color: var(--bad); }
    .score { font-weight: 600; }
    .score.good { color: var(--good); }
    .score.warn { color: var(--warn); }
    .score.bad { color: var(--bad); }
    .muted { color: var(--muted); font-size: 0.9rem; }
    details { margin-top: 10px; color: var(--muted); }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 24px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #2a2f3d; vertical-align: top; }
    th { color: var(--muted); font-weight: 600; }
    tr.fail td { color: var(--bad); }
    tr.skip td { color: var(--muted); }
    a { color: var(--accent); }
  </style>
</head>
<body>
  <header>
    <h1>Pipeline smoke review</h1>
    <p class="meta">Run ${esc(manifest.runId)} · ${esc(manifest.createdAt)} · Product: ${esc(manifest.scenario.product)}</p>
  </header>
  <main>
    <div class="summary">
      <div class="stat"><strong>~$${manifest.estCostUsd.toFixed(2)}</strong>est. API spend</div>
      <div class="stat"><strong>${manifest.reviewSummary.reviewed}</strong>vision reviews</div>
      <div class="stat"><strong>${manifest.reviewSummary.passed}</strong>passed QA</div>
      <div class="stat"><strong>${manifest.reviewSummary.avgScore || "—"}</strong>avg score</div>
    </div>
    <div class="grid">${artifactCards}</div>
    <h2>Pipeline steps</h2>
    <table>
      <thead><tr><th>ID</th><th>Step</th><th>Status</th><th>Cost</th><th>ms</th><th>Detail</th></tr></thead>
      <tbody>${stepRows}</tbody>
    </table>
  </main>
</body>
</html>`;

  const htmlPath = path.join(outDir, "report.html");
  await writeFile(htmlPath, html, "utf8");
  return { htmlPath, jsonPath: path.join(outDir, "manifest.json") };
}
