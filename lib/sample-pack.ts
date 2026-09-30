/**
 * Curated landing samples for the “Get sample pack” lead magnet.
 * Images: `/api/sample-pack-image/[id]` with Alchemy watermark burned into pixels.
 * Videos: static MP4s under `/videos/sample-pack/` (no watermark).
 */
export type SamplePackItem = {
  id: string;
  src: string;
  /** Short English label for alt text; UI localizes via i18n keys when present. */
  labelKey:
    | "snowboard"
    | "yoga"
    | "phoneTeardown"
    | "coffeeDesign"
    | "evDrive"
    | "powerbank"
    | "powerGallery"
    | "brightEvGallery"
    | "challengeTactical";
};

export type SamplePackVideo = {
  id: string;
  /** Public URL under /videos/sample-pack/ */
  src: string;
  /** Still frame so the card shows what the clip is before play. */
  poster: string;
  labelKey: "desktop" | "reelA" | "reelB" | "reelC";
};

export const SAMPLE_PACK_ITEMS: readonly SamplePackItem[] = [
  {
    id: "snowboard",
    src: "/images/sample-pack/snowboard.jpg",
    labelKey: "snowboard",
  },
  {
    id: "yoga",
    src: "/images/sample-pack/yoga.jpg",
    labelKey: "yoga",
  },
  {
    id: "phone-teardown",
    src: "/images/sample-pack/phone-teardown.jpg",
    labelKey: "phoneTeardown",
  },
  {
    id: "coffee-design",
    src: "/images/sample-pack/coffee-design.jpg",
    labelKey: "coffeeDesign",
  },
  {
    id: "ev-drive",
    src: "/images/sample-pack/ev-drive.jpg",
    labelKey: "evDrive",
  },
  {
    id: "powerbank",
    src: "/images/sample-pack/powerbank.jpg",
    labelKey: "powerbank",
  },
  {
    id: "power-gallery",
    src: "/images/sample-pack/power-gallery.jpg",
    labelKey: "powerGallery",
  },
  {
    id: "bright-ev-gallery",
    src: "/images/sample-pack/bright-ev-gallery.jpg",
    labelKey: "brightEvGallery",
  },
  {
    id: "challenge-tactical",
    src: "/images/sample-pack/challenge-tactical.jpg",
    labelKey: "challengeTactical",
  },
] as const;

/** Sample reels — no watermark; served as static public files. */
export const SAMPLE_PACK_VIDEOS: readonly SamplePackVideo[] = [
  {
    id: "desktop",
    src: "/videos/sample-pack/desktop.mp4",
    poster: "/images/sample-pack/desktop-poster.jpg",
    labelKey: "desktop",
  },
  {
    id: "ildkkq",
    src: "/videos/sample-pack/ildkkq.mp4",
    poster: "/images/sample-pack/ildkkq-poster.jpg",
    labelKey: "reelA",
  },
  {
    id: "video-24",
    src: "/videos/sample-pack/video-24.mp4",
    poster: "/images/sample-pack/video-24-poster.jpg",
    labelKey: "reelB",
  },
  {
    id: "z0wxcy",
    src: "/videos/sample-pack/z0wxcy.mp4",
    poster: "/images/sample-pack/z0wxcy-poster.jpg",
    labelKey: "reelC",
  },
] as const;

/** Phrase tiled diagonally across sample stills (path-outline burn). */
export const SAMPLE_PACK_WATERMARK = "Alchemy AI Lab";
