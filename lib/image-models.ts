export type ImageModelId =
  | "nano-banana-2-edit"
  | "nano-banana-edit"
  | "nano-banana"
  | "nano-banana-pro-edit";

export type ImageModel = {
  id: ImageModelId;
  endpoint: string;
  /** Requires product photo upload */
  needsProductPhoto: boolean;
};

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: "nano-banana-2-edit",
    endpoint: "fal-ai/nano-banana-2/edit",
    needsProductPhoto: true,
  },
  {
    id: "nano-banana-edit",
    endpoint: "fal-ai/nano-banana/edit",
    needsProductPhoto: true,
  },
  {
    id: "nano-banana",
    endpoint: "fal-ai/nano-banana",
    needsProductPhoto: false,
  },
  {
    id: "nano-banana-pro-edit",
    endpoint: "fal-ai/nano-banana-pro/edit",
    needsProductPhoto: true,
  },
];

export const DEFAULT_IMAGE_MODEL: ImageModelId = "nano-banana-2-edit";

export function getImageModel(id: ImageModelId): ImageModel {
  return IMAGE_MODELS.find((m) => m.id === id) ?? IMAGE_MODELS[0];
}
