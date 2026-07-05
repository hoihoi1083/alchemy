import type { CameraNodeData, CameraPreset } from "@/lib/pro-canvas-types";

const PRESET_PROMPTS: Record<Exclude<CameraPreset, "custom">, string> = {
  fisheye: "Fisheye perspective, wide-angle lens with distortion at edges.",
  tilt: "Tilted Dutch angle, dynamic diagonal composition.",
  front_overhead: "Front overhead shot, camera looking down at subject.",
  front_upturn: "Front low upturn angle, heroic upward perspective.",
  panorama_overhead: "Panoramic overhead shot, wide establishing view.",
  back_view: "Back view, subject facing away from camera.",
};

export function cameraPromptSuffix(data: Pick<CameraNodeData, "preset" | "spin" | "tilt" | "zoom" | "promptExtra">): string {
  const parts: string[] = [];
  if (data.preset !== "custom" && PRESET_PROMPTS[data.preset]) {
    parts.push(PRESET_PROMPTS[data.preset]);
  }
  if (data.spin !== 0) parts.push(`Camera spin ${data.spin} degrees around subject.`);
  if (data.tilt !== 0) parts.push(`Camera tilt ${data.tilt} degrees.`);
  if (data.zoom >= 70) parts.push("Extreme close-up, tight framing on subject.");
  else if (data.zoom >= 40) parts.push("Medium close-up shot.");
  else if (data.zoom <= 15) parts.push("Wide shot, subject small in frame.");
  const extra = data.promptExtra.trim();
  if (extra) parts.push(extra);
  return parts.join(" ");
}

export const CAMERA_PRESET_OPTIONS: { id: CameraPreset; label: string }[] = [
  { id: "custom", label: "Custom" },
  { id: "fisheye", label: "Fisheye" },
  { id: "tilt", label: "Tilt angle" },
  { id: "front_overhead", label: "Front overhead" },
  { id: "front_upturn", label: "Front upturn" },
  { id: "panorama_overhead", label: "Panorama overhead" },
  { id: "back_view", label: "Back view" },
];
