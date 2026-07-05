import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const jobsRoot = path.join(process.cwd(), ".pipeline-jobs");
const maxAgeHours = Number.parseInt(process.env.PIPELINE_JOBS_MAX_AGE_HOURS || "48", 10);
const cutoffMs = Date.now() - Math.max(1, maxAgeHours) * 60 * 60 * 1000;

async function cleanup() {
  let entries = [];
  try {
    entries = await readdir(jobsRoot, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.log("[cleanup-pipeline-jobs] no jobs directory yet");
      return;
    }
    throw error;
  }

  let removed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(jobsRoot, entry.name);
    const info = await stat(fullPath);
    if (info.mtimeMs >= cutoffMs) continue;
    await rm(fullPath, { recursive: true, force: true });
    removed += 1;
  }

  console.log(
    `[cleanup-pipeline-jobs] removed ${removed} stale job(s), maxAgeHours=${Math.max(1, maxAgeHours)}`,
  );
}

cleanup().catch((error) => {
  console.error("[cleanup-pipeline-jobs] failed", error);
  process.exit(1);
});
