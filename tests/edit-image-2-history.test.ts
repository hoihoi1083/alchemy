import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ERASE_COVERAGE_LIMIT,
  holeUnionCoverage,
} from "../lib/edit-image-2-hole-coverage";

/** Same algorithm as EditImage2Client.commitLayers (kept in sync for regression). */
function pushLayerHistory<T>(
  h: T[][],
  index: number,
  resolved: T[],
  max = 40,
): { history: T[][]; index: number } {
  const idx = Math.min(index, Math.max(0, h.length - 1));
  const cur = h[idx] ?? [];
  if (cur.length > 1 && resolved.length === 0) {
    return { history: h, index };
  }
  const trimmed = h.slice(0, idx + 1);
  const stacked = [...trimmed, resolved].slice(-max);
  return { history: stacked, index: stacked.length - 1 };
}

describe("edit-image-2 hole coverage", () => {
  it("is low for a small box", () => {
    const c = holeUnionCoverage([{ left: 10, top: 10, width: 40, height: 40 }], 400, 400);
    assert.ok(c < 0.05);
    assert.ok(c <= ERASE_COVERAGE_LIMIT);
  });

  it("is high when boxes cover most of the frame", () => {
    const c = holeUnionCoverage(
      [
        { left: 0, top: 0, width: 300, height: 400 },
        { left: 200, top: 0, width: 200, height: 400 },
      ],
      400,
      400,
    );
    assert.ok(c > ERASE_COVERAGE_LIMIT);
  });
});

describe("edit-image-2 layer history commit", () => {
  it("keeps layers after the first move commit", () => {
    const seeded = [{ id: "a" }, { id: "b" }, { id: "c" }];
    let h = [seeded];
    let idx = 0;

    // Simulate Strict Mode double-invoke of the OLD buggy pattern would wipe;
    // the fixed path reads index once then appends.
    const moved = seeded.map((l) => (l.id === "a" ? { ...l, x: 1 } : l));
    ({ history: h, index: idx } = pushLayerHistory(h, idx, moved));
    assert.equal(h[idx]!.length, 3);
    assert.equal(idx, 1);

    // Second invoke with the NEW index must still see layers (not empty).
    const moved2 = moved.map((l) => (l.id === "a" ? { ...l, x: 2 } : l));
    ({ history: h, index: idx } = pushLayerHistory(h, idx, moved2));
    assert.equal(h[idx]!.length, 3);
    assert.equal(idx, 2);
  });

  it("blocks accidental empty board commit", () => {
    const seeded = [{ id: "a" }, { id: "b" }];
    const out = pushLayerHistory([seeded], 0, []);
    assert.equal(out.history[0]!.length, 2);
    assert.equal(out.index, 0);
  });
});
