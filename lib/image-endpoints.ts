/** Default fal image endpoints for the marketing wizard (Nano Banana 2). */
export const BANANA2_EDIT_ENDPOINT = "fal-ai/nano-banana-2/edit";
export const BANANA2_TEXT_ENDPOINT = "fal-ai/nano-banana-2";

export function defaultEditEndpoint(): string {
  return process.env.FAL_IMAGE_EDIT_ENDPOINT?.trim() || BANANA2_EDIT_ENDPOINT;
}

export function defaultTextEndpoint(): string {
  return process.env.FAL_IMAGE_ENDPOINT?.trim() || BANANA2_TEXT_ENDPOINT;
}
