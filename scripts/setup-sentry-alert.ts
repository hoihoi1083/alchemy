/**
 * Creates a default Sentry issue alert (email to project owners) when configured.
 *
 * Prerequisites:
 *   1. Create project at https://sentry.io → Settings → Client Keys (DSN)
 *   2. User Settings → Auth Tokens → token with project:write, org:read
 *
 * Run:
 *   NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest....sentry.io/... \
 *   SENTRY_AUTH_TOKEN=sntrys_... \
 *   npx tsx scripts/setup-sentry-alert.ts
 *
 * Add DSN to .env.local and GitHub:
 *   gh secret set NEXT_PUBLIC_SENTRY_DSN --repo hoihoi1083/alchemy
 */
import { existsSync, readFileSync } from "node:fs";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnvLocal();

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const token = process.env.SENTRY_AUTH_TOKEN?.trim();

function parseDsn(dsnUrl: string): { org: string; project: string } | null {
  try {
    const u = new URL(dsnUrl);
    const path = u.pathname.replace(/^\//, "");
    const [projectId] = path.split("/");
    const hostParts = u.host.split(".");
    const org = hostParts[0];
    if (!org || !projectId) return null;
    return { org, project: projectId };
  } catch {
    return null;
  }
}

async function resolveProjectSlug(orgSlug: string, projectId: string): Promise<string | null> {
  const res = await fetch(`https://sentry.io/api/0/projects/${orgSlug}/${projectId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const data = (await res.json()) as { slug?: string };
    return data.slug ?? projectId;
  }

  const list = await fetch(`https://sentry.io/api/0/organizations/${orgSlug}/projects/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!list.ok) return null;
  const projects = (await list.json()) as Array<{ id: string; slug: string }>;
  return projects.find((p) => p.id === projectId || p.slug === projectId)?.slug ?? null;
}

async function main() {
  if (!dsn) {
    console.log(`
No NEXT_PUBLIC_SENTRY_DSN set.

1. Go to https://sentry.io → Create project → Next.js
2. Copy the DSN into .env.local:
   NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest....sentry.io/...
3. Re-run this script with SENTRY_AUTH_TOKEN to create an alert rule.
`);
    process.exit(1);
  }

  if (!token) {
    console.log(`
DSN found. To create an alert rule, set SENTRY_AUTH_TOKEN (User Settings → Auth Tokens).

Then re-run:
  npx tsx scripts/setup-sentry-alert.ts

For production deploy, also set GitHub secret:
  gh secret set NEXT_PUBLIC_SENTRY_DSN --repo hoihoi1083/alchemy
`);
    process.exit(0);
  }

  const parsed = parseDsn(dsn);
  if (!parsed) {
    console.error("Could not parse DSN:", dsn);
    process.exit(1);
  }

  const projectSlug = await resolveProjectSlug(parsed.org, parsed.project);
  if (!projectSlug) {
    console.error("Could not resolve Sentry project slug for org", parsed.org);
    process.exit(1);
  }

  const ruleRes = await fetch(
    `https://sentry.io/api/0/projects/${parsed.org}/${projectSlug}/rules/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "alchemy — new issues (production)",
        actionMatch: "all",
        filterMatch: "all",
        frequency: 30,
        conditions: [
          {
            id: "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition",
          },
        ],
        actions: [
          {
            id: "sentry.mail.actions.NotifyEmailAction",
            targetType: "IssueOwners",
            fallthroughType: "ActiveMembers",
          },
        ],
      }),
    },
  );

  const ruleBody = await ruleRes.json();
  if (!ruleRes.ok) {
    if (String(ruleBody.detail ?? "").includes("already exists") || ruleRes.status === 409) {
      console.log("Alert rule may already exist — OK.");
      return;
    }
    console.error("Failed to create alert:", JSON.stringify(ruleBody, null, 2));
    process.exit(1);
  }

  console.log(`✓ Created Sentry alert rule "${ruleBody.name}" on ${parsed.org}/${projectSlug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
