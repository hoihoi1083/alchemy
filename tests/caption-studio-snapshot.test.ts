import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCaptionStudioSnapshot,
  serializeCaptionStudioSnapshot,
} from "../lib/caption-studio-snapshot";

describe("caption-studio-snapshot", () => {
  it("serializes caption words + durable clips and strips blob URLs", () => {
    const snap = serializeCaptionStudioSnapshot({
      sourceLabel: "Demo",
      sourceUrl: "blob:http://localhost/x",
      originalSourceUrl: "/api/library/download/aaaaaaaaaaaaaaaaaaaaaaaa",
      processedVideoUrl: null,
      refImageUrl: null,
      timelineClips: [
        {
          id: "c1",
          url: "/api/library/download/aaaaaaaaaaaaaaaaaaaaaaaa",
          sourceInSec: 0,
          sourceOutSec: 4,
          sourceDurationSec: 8,
          label: "A",
        },
        {
          id: "c2",
          url: "blob:http://localhost/y",
          sourceInSec: 0,
          sourceOutSec: 2,
          sourceDurationSec: 2,
        },
      ],
      captionLines: [
        { startSec: 0, endSec: 2, text: "Hello world", xPct: 50, yPct: 80 },
        { startSec: 2, endSec: 4, text: "  " },
      ],
      defaultStylePreset: "classic",
      captionMode: "pure",
      bgmTrack: "upbeat",
      bgmStartSec: 0.5,
      bgmDurationSec: 3,
      replaceSourceAudio: false,
      bgmVolume: 0.5,
      underVoiceBgmVolume: 0.1,
      voiceVolume: 2,
      voiceoverEnabled: true,
      voiceoverScript: "Hello world",
      voiceoverLocale: "en",
      voClips: [
        {
          id: "v1",
          audioUrl: "https://cdn.example.com/vo.mp3",
          startSec: 0,
          durationSec: 2,
        },
        {
          id: "v2",
          audioUrl: "blob:local",
          startSec: 2,
          durationSec: 1,
        },
      ],
      musicSource: "ai",
      musicTopic: "serum",
      musicMood: "warm",
      matchMusicToVideo: true,
      aiMusicTracks: [],
      selectedAiMusicId: null,
      voicePreviewTracks: [],
      selectedVoicePreviewId: null,
      playheadSec: 1.2,
      captionsBurnedInPlate: true,
    });

    assert.equal(snap.version, 1);
    assert.equal(snap.captionsBurnedInPlate, true);
    assert.equal(snap.sourceUrl, null);
    assert.equal(
      snap.originalSourceUrl,
      "/api/library/download/aaaaaaaaaaaaaaaaaaaaaaaa",
    );
    assert.equal(snap.timelineClips.length, 1);
    assert.equal(snap.timelineClips[0]!.id, "c1");
    assert.equal(snap.captionLines.length, 1);
    assert.equal(snap.captionLines[0]!.text, "Hello world");
    assert.equal(snap.voClips.length, 1);
    assert.equal(snap.bgmTrack, "upbeat");
  });

  it("parses caption-only packs (words without clips)", () => {
    const snap = parseCaptionStudioSnapshot({
      version: 1,
      timelineClips: [],
      captionLines: [
        { startSec: 0, endSec: 1.5, text: "维生素C", spokenText: "维生素C精华" },
      ],
      defaultStylePreset: "classic",
      captionMode: "pure",
      bgmTrack: "calm",
      bgmStartSec: 0,
      bgmDurationSec: null,
      replaceSourceAudio: false,
      bgmVolume: 0.55,
      underVoiceBgmVolume: 0.14,
      voiceVolume: 2.1,
      voiceoverEnabled: true,
      voiceoverScript: "",
      voiceoverLocale: "cn",
      voClips: [],
      musicSource: "library",
      musicTopic: "",
      musicMood: "auto",
      matchMusicToVideo: true,
      aiMusicTracks: [],
      selectedAiMusicId: null,
      voicePreviewTracks: [],
      selectedVoicePreviewId: null,
      playheadSec: 0,
      captionsBurnedInPlate: true,
    });
    assert.ok(snap);
    assert.equal(snap!.captionsBurnedInPlate, true);
    assert.equal(snap!.captionLines.length, 1);
    assert.equal(snap!.captionLines[0]!.spokenText, "维生素C精华");
    assert.equal(snap!.timelineClips.length, 0);
  });

  it("rejects invalid snapshot version", () => {
    assert.equal(
      parseCaptionStudioSnapshot({ version: 2, timelineClips: [], captionLines: [] }),
      null,
    );
    assert.equal(parseCaptionStudioSnapshot(null), null);
  });
});
