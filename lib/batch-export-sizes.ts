export type BatchExportSizeId = "9:16" | "1:1" | "4:5" | "16:9";

export type BatchExportSize = {
  id: BatchExportSizeId;
  width: number;
  height: number;
  filename: string;
};

export const BATCH_EXPORT_SIZES: BatchExportSize[] = [
  { id: "9:16", width: 1080, height: 1920, filename: "story-1080x1920.png" },
  { id: "1:1", width: 1080, height: 1080, filename: "square-1080x1080.png" },
  { id: "4:5", width: 1080, height: 1350, filename: "feed-1080x1350.png" },
  { id: "16:9", width: 1920, height: 1080, filename: "landscape-1920x1080.png" },
];
