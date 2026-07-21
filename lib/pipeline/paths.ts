import os from "os";
import path from "path";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Pipeline scratch dir. On Vercel/Lambda the deploy filesystem is read-only
 * (`/var/task`), so write under `/tmp` instead of `cwd/.pipeline-jobs`.
 */
export function jobsRoot(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "alchemy-pipeline-jobs");
  }
  return path.join(process.cwd(), ".pipeline-jobs");
}

export function isValidJobId(jobId: string): boolean {
  return UUID_V4_RE.test(jobId);
}

export function jobDir(jobId: string): string {
  if (!isValidJobId(jobId)) {
    throw new Error("Invalid pipeline job id.");
  }
  return path.join(jobsRoot(), jobId);
}
