import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { canAccessTeamSharedAsset } from "../lib/db/assets";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("team library folder", () => {
  it("share + list + download auth routes exist", () => {
    const share = read("app/api/library/assets/[id]/share/route.ts");
    assert.match(share, /requireAppUser/);
    assert.match(share, /setAssetTeamShared/);
    assert.match(share, /getActiveTeamMembership/);
    assert.match(share, /export async function PATCH/);
    assert.match(share, /Unsharing is always allowed/);

    const teamLib = read("app/api/team/library/route.ts");
    assert.match(teamLib, /listTeamSharedAssets/);
    assert.match(teamLib, /available: false/);

    const download = read("app/api/library/download/[id]/route.ts");
    assert.match(download, /getAssetAccessibleToUser/);
    assert.match(download, /getActiveTeamMembership/);

    const studioDl = read("app/api/studio-download/route.ts");
    assert.match(studioDl, /getAssetAccessibleToUser/);

    const durable = read("lib/storage/durable-media.ts");
    assert.match(durable, /getAssetAccessibleToUser/);
  });

  it("db helpers support opt-in share, leave cleanup, and team deactivate", () => {
    const assets = read("lib/db/assets.ts");
    assert.match(assets, /listTeamSharedAssets/);
    assert.match(assets, /setAssetTeamShared/);
    assert.match(assets, /clearTeamSharedAssetsForUser/);
    assert.match(assets, /clearTeamSharedAssetsForTeam/);
    assert.match(assets, /canAccessTeamSharedAsset/);
    assert.match(assets, /clerkId: \{ \$in: memberIds \}/);

    const types = read("lib/db/types.ts");
    assert.match(types, /teamShared\?:/);
    assert.match(types, /sharedByClerkId\?:/);

    const team = read("lib/team/service.ts");
    assert.match(team, /clearTeamSharedAssetsForUser/);
    assert.match(team, /clearTeamSharedAssetsForTeam/);
    assert.match(team, /Unshare before seat removal/);
  });

  it("library UI exposes share + team folder", () => {
    const ui = read("components/LibraryPageClient.tsx");
    assert.match(ui, /\/api\/team\/library/);
    assert.match(ui, /\/api\/library\/assets\/\$\{assetId\}\/share/);
    assert.match(ui, /teamFolderTitle/);
    assert.match(ui, /shareWithTeam/);
  });

  it("canAccessTeamSharedAsset encodes authz rules", () => {
    assert.equal(
      canAccessTeamSharedAsset({
        viewerClerkId: "a",
        assetOwnerClerkId: "a",
        assetTeamShared: false,
        assetTeamId: null,
        viewerTeamId: null,
        ownerStillActiveOnTeam: false,
      }),
      true,
      "owner always allowed",
    );

    assert.equal(
      canAccessTeamSharedAsset({
        viewerClerkId: "b",
        assetOwnerClerkId: "a",
        assetTeamShared: true,
        assetTeamId: "team-1",
        viewerTeamId: "team-1",
        ownerStillActiveOnTeam: true,
      }),
      true,
      "teammate can read shared when owner still seated",
    );

    assert.equal(
      canAccessTeamSharedAsset({
        viewerClerkId: "b",
        assetOwnerClerkId: "a",
        assetTeamShared: true,
        assetTeamId: "team-1",
        viewerTeamId: "team-1",
        ownerStillActiveOnTeam: false,
      }),
      false,
      "stale share after owner left must deny",
    );

    assert.equal(
      canAccessTeamSharedAsset({
        viewerClerkId: "b",
        assetOwnerClerkId: "a",
        assetTeamShared: true,
        assetTeamId: "team-1",
        viewerTeamId: "team-2",
        ownerStillActiveOnTeam: true,
      }),
      false,
      "cross-team denied",
    );

    assert.equal(
      canAccessTeamSharedAsset({
        viewerClerkId: "b",
        assetOwnerClerkId: "a",
        assetTeamShared: false,
        assetTeamId: "team-1",
        viewerTeamId: "team-1",
        ownerStillActiveOnTeam: true,
      }),
      false,
      "unshared teammate asset denied",
    );
  });
});
