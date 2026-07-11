/**
 * Creates (or reuses) a Clerk E2E test user and prints GitHub secret commands.
 * Run: npx tsx scripts/setup-prod-secrets.ts
 *
 * Optional env (from .env.local):
 *   CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 *   E2E_CLERK_USER_EMAIL, E2E_CLERK_USER_PASSWORD — skip create if both set
 *
 * For GitHub: gh auth login, then re-run with --apply-github
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnvLocal();

const applyGithub = process.argv.includes("--apply-github");
const writeEnv = process.argv.includes("--write-env");
const repo = process.argv.find((a) => a.startsWith("--repo="))?.slice(7) ?? "hoihoi1083/alchemy";

const clerkSecret = process.env.CLERK_SECRET_KEY?.trim();
const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
let e2eEmail = process.env.E2E_CLERK_USER_EMAIL?.trim();
let e2ePassword = process.env.E2E_CLERK_USER_PASSWORD?.trim();

if (!clerkSecret || !clerkPk) {
  console.error("Missing CLERK_SECRET_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local");
  process.exit(1);
}

async function findOrCreateE2eUser(): Promise<{ email: string; password: string; userId: string }> {
  if (e2eEmail && e2ePassword && process.env.E2E_CLERK_USER_ID?.trim()) {
    console.log(`Using existing E2E user: ${e2eEmail}`);
    return {
      email: e2eEmail,
      password: e2ePassword,
      userId: process.env.E2E_CLERK_USER_ID.trim(),
    };
  }

  if (e2eEmail && !process.env.E2E_CLERK_USER_ID?.trim()) {
    const listRes = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(e2eEmail)}&limit=1`,
      { headers: { Authorization: `Bearer ${clerkSecret}` } },
    );
    const list = (await listRes.json()) as Array<{ id: string }>;
    if (listRes.ok && list[0]?.id) {
      console.log(`Resolved E2E user id for ${e2eEmail}`);
      console.log(`E2E_CLERK_USER_ID=${list[0].id}`);
      return { email: e2eEmail, password: e2ePassword!, userId: list[0].id };
    }
  }

  const email = `alchemy.e2e.${Date.now()}@example.com`;
  const password = `AlchemyE2e!${Math.random().toString(36).slice(2, 10)}`;

  const res = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: true,
    }),
  });

  const body = (await res.json()) as { id?: string; errors?: unknown[] };
  if (!res.ok || !body.id) {
    console.error("Clerk create user failed:", JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(`Created Clerk E2E user: ${email} (${body.id})`);
  console.log("\nAdd to .env.local:\n");
  console.log(`E2E_CLERK_USER_EMAIL=${email}`);
  console.log(`E2E_CLERK_USER_PASSWORD=${password}`);
  console.log(`E2E_CLERK_USER_ID=${body.id}`);

  return { email, password, userId: body.id };
}

function ghSecretSet(name: string, value: string): boolean {
  const r = spawnSync("gh", ["secret", "set", name, "--repo", repo, "--body", value], {
    stdio: "inherit",
  });
  return r.status === 0;
}

async function main() {
  const { email, password, userId } = await findOrCreateE2eUser();
  e2eEmail = email;
  e2ePassword = password;

  const secrets: Record<string, string> = {
    E2E_CLERK_USER_EMAIL: e2eEmail,
    E2E_CLERK_USER_PASSWORD: e2ePassword,
    E2E_CLERK_USER_ID: userId,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPk!,
    CLERK_SECRET_KEY: clerkSecret!,
  };

  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (sentryDsn) {
    secrets.NEXT_PUBLIC_SENTRY_DSN = sentryDsn;
  }

  console.log("\n=== GitHub secrets to set (repo: " + repo + ") ===\n");
  for (const name of Object.keys(secrets)) {
    console.log(`  ${name}`);
  }
  if (!sentryDsn) {
    console.log("\n  NEXT_PUBLIC_SENTRY_DSN  (add after Sentry project — see scripts/setup-sentry-alert.ts)");
  }

  if (writeEnv && existsSync(".env.local")) {
    let text = readFileSync(".env.local", "utf8");
    const upsert = (key: string, value: string) => {
      const line = `${key}=${value}`;
      const re = new RegExp(`^${key}=.*$`, "m");
      text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
    };
    upsert("E2E_CLERK_USER_EMAIL", e2eEmail);
    upsert("E2E_CLERK_USER_PASSWORD", e2ePassword);
    upsert("E2E_CLERK_USER_ID", userId);
    writeFileSync(".env.local", text);
    console.log("\n✓ Updated .env.local with E2E_* vars");
  }

  if (!applyGithub) {
    console.log("\nRun with --apply-github after: gh auth login");
    return;
  }

  const gh = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (gh.status !== 0) {
    console.error("\ngh not authenticated. Run: gh auth login");
    process.exit(1);
  }

  for (const [name, value] of Object.entries(secrets)) {
    console.log(`Setting ${name}…`);
    if (!ghSecretSet(name, value)) {
      console.error(`Failed to set ${name}`);
      process.exit(1);
    }
  }
  console.log("\n✓ GitHub secrets applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
