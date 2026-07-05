/**
 * Smoke test for projects CRUD + snapshot helpers (requires MONGODB_URI).
 * Run: npx tsx scripts/test-projects-crud.ts
 */
import { readFileSync, existsSync } from "node:fs";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnvLocal();

async function main() {
  const { createProject, deleteProject, getProjectForUser, listProjectsForUser, updateProject } =
    await import("../lib/db/projects");
  const { EMPTY_PROJECT_SNAPSHOT } = await import("../lib/project-snapshot");
  const { evaluateGoldenPrompts } = await import("../lib/pipeline-smoke-golden");
  const { buildXhsDualEditPrompt } = await import("./lib/pipeline-smoke-xhs");

  const clerkId = `smoke-test-${Date.now()}`;

  console.log("=== Projects + new modules smoke ===\n");

  const golden = evaluateGoldenPrompts();
  const goldenFail = golden.filter((g) => !g.pass);
  if (goldenFail.length) {
    throw new Error(`Golden prompts failed: ${goldenFail.map((g) => g.visualStyleId).join(", ")}`);
  }
  console.log(`✓ Golden prompts: ${golden.length} styles`);

  const { strategy } = buildXhsDualEditPrompt();
  if (!strategy.useDualImage || strategy.kind !== "layout-transfer") {
    throw new Error(`Expected layout-transfer dual-image, got ${strategy.kind}`);
  }
  console.log(`✓ XHS dual-edit strategy: ${strategy.kind}, dual=${strategy.useDualImage}`);

  if (!process.env.MONGODB_URI?.trim()) {
    console.log("○ MongoDB CRUD skipped (no MONGODB_URI)");
    console.log("\n=== PASS (offline checks only) ===");
    return;
  }

  const snapshot = EMPTY_PROJECT_SNAPSHOT("physical");
  snapshot.inputs.product = "馬達加斯加粉水晶手鏈";
  snapshot.inputs.headline = "粉晶手鏈｜測試";
  snapshot.prompts.imagePrompt = "test prompt snapshot";

  const created = await createProject({
    clerkId,
    name: "Smoke test project",
    snapshot,
  });
  const id = String(created._id);
  console.log(`✓ createProject: ${id}`);

  const listed = await listProjectsForUser(clerkId);
  if (!listed.some((p) => String(p._id) === id)) {
    throw new Error("Project not in list");
  }
  console.log(`✓ listProjectsForUser: ${listed.length} project(s)`);

  const loaded = await getProjectForUser(clerkId, id);
  if (!loaded || loaded.snapshot.inputs.product !== snapshot.inputs.product) {
    throw new Error("getProjectForUser mismatch");
  }
  console.log("✓ getProjectForUser");

  snapshot.inputs.headline = "粉晶手鏈｜已更新";
  snapshot.media.imageUrl = "https://example.com/test-image.png";
  const updated = await updateProject(clerkId, id, { snapshot, name: "Updated smoke" });
  if (!updated || updated.name !== "Updated smoke") {
    throw new Error("updateProject failed");
  }
  console.log("✓ updateProject");

  const deleted = await deleteProject(clerkId, id);
  if (!deleted) throw new Error("deleteProject failed");
  console.log("✓ deleteProject");

  const gone = await getProjectForUser(clerkId, id);
  if (gone) throw new Error("Project still exists after delete");
  console.log("✓ project removed");

  console.log("\n=== PROJECTS CRUD PASS ===");
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
