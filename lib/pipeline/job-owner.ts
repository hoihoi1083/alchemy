import { promises as fs } from "fs";
import path from "path";
import { jobDir, isValidJobId } from "@/lib/pipeline/paths";

const OWNER_FILE = "owner.json";

type JobOwnerFile = {
  clerkId: string;
  createdAt: string;
};

/** Create a new pipeline job directory owned by `clerkId`. */
export async function createOwnedJobDir(
  clerkId: string,
): Promise<{ jobId: string; dir: string }> {
  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  await writeJobOwner(jobId, clerkId);
  return { jobId, dir };
}

export async function writeJobOwner(jobId: string, clerkId: string): Promise<void> {
  if (!isValidJobId(jobId) || !clerkId.trim()) {
    throw new Error("Invalid job owner.");
  }
  const payload: JobOwnerFile = {
    clerkId: clerkId.trim(),
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(jobDir(jobId), OWNER_FILE),
    JSON.stringify(payload),
    "utf8",
  );
}

export async function readJobOwner(jobId: string): Promise<string | null> {
  if (!isValidJobId(jobId)) return null;
  try {
    const raw = await fs.readFile(path.join(jobDir(jobId), OWNER_FILE), "utf8");
    const parsed = JSON.parse(raw) as Partial<JobOwnerFile>;
    const clerkId = typeof parsed.clerkId === "string" ? parsed.clerkId.trim() : "";
    return clerkId || null;
  } catch {
    return null;
  }
}

/**
 * Pipeline scratch files are only readable by the creating user.
 * Jobs without owner.json (legacy) are denied — scratch is ephemeral.
 */
export async function assertJobOwnedBy(
  jobId: string,
  clerkId: string,
): Promise<boolean> {
  const owner = await readJobOwner(jobId);
  return Boolean(owner && owner === clerkId);
}
