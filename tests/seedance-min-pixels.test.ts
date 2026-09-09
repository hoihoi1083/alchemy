import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEEDANCE_MIN_REF_PIXELS } from "../lib/pipeline/ffmpeg";

describe("seedance min pixels", () => {
  it("matches ModelArk ~640x640 floor", () => {
    assert.ok(SEEDANCE_MIN_REF_PIXELS >= 407_696);
    assert.ok(640 * 640 >= SEEDANCE_MIN_REF_PIXELS);
  });
});
