import assert from "node:assert/strict";
import {
  createTimelineClip,
  clipDurationSec,
  packClipsMagnetically,
  projectDuration,
  splitClipAt,
  trimClipEdge,
  reorderClips,
  exportPlan,
  clipAtPlayhead,
} from "@/lib/captions/timeline-project";

function run() {
  const a = createTimelineClip({
    url: "a.mp4",
    label: "A",
    sourceDurationSec: 10,
  });
  const b = createTimelineClip({
    url: "b.mp4",
    label: "B",
    sourceDurationSec: 6,
  });
  assert.equal(clipDurationSec(a), 10);

  const packed = packClipsMagnetically([a, b]);
  assert.equal(packed[0]!.timelineStartSec, 0);
  assert.equal(packed[0]!.timelineEndSec, 10);
  assert.equal(packed[1]!.timelineStartSec, 10);
  assert.equal(packed[1]!.timelineEndSec, 16);
  assert.equal(projectDuration([a, b]), 16);

  const trimmed = trimClipEdge(a, "in", 2);
  assert.equal(trimmed.sourceInSec, 2);
  assert.equal(clipDurationSec(trimmed), 8);

  const split = splitClipAt([trimmed, b], 4);
  assert.ok(split);
  assert.equal(split!.length, 3);
  assert.equal(clipDurationSec(split![0]!), 4);
  assert.equal(clipDurationSec(split![1]!), 4);

  const reordered = reorderClips([a, b], 0, 1);
  assert.equal(reordered[0]!.url, "b.mp4");
  assert.equal(reordered[1]!.url, "a.mp4");

  const hit = clipAtPlayhead([a, b], 12);
  assert.ok(hit);
  assert.equal(hit!.index, 1);
  assert.ok(Math.abs(hit!.localSec - 2) < 0.05);

  const plan = exportPlan([trimmed]);
  assert.equal(plan[0]!.trimInSec, 2);
  assert.equal(plan[0]!.trimOutSec, 10);

  console.log("timeline-project ok");
}

run();
