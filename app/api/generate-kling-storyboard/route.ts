/**
 * Compatibility alias — prefer POST /api/generate-storyboard-video.
 * Kept so older clients and docs that still hit the Kling-named URL keep working.
 */
export {
  POST,
  runtime,
  maxDuration,
} from "../generate-storyboard-video/route";
