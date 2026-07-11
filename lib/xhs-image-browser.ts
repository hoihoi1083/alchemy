import sharp from "sharp";

type HeicConvertFn = (opts: {
  buffer: Buffer;
  format: "JPEG";
  quality: number;
}) => Promise<ArrayBuffer>;

let heicConvertLoader: (() => Promise<HeicConvertFn>) | null = null;

function loadHeicConvert(): Promise<HeicConvertFn> {
  if (!heicConvertLoader) {
    heicConvertLoader = async () => {
      const mod = await import("heic-convert");
      return (mod.default ?? mod) as HeicConvertFn;
    };
  }
  return heicConvertLoader();
}

export function looksLikeHeifBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  const brand = buf.subarray(8, 12).toString("ascii");
  return /heic|heix|mif1|hevc|heif/i.test(brand);
}

export function looksLikeHeifSource(contentType: string, sourceUrl: string): boolean {
  return (
    /heif|heic/i.test(contentType) ||
    /\/format\/heif|\/format\/heic/i.test(sourceUrl) ||
    /\.heif(?:\?|$)|\.heic(?:\?|$)/i.test(sourceUrl)
  );
}

/** Decode XHS HEIF covers to JPEG for browsers and fal upload. */
export async function toBrowserJpegBuffer(
  input: Buffer,
  contentType: string,
  sourceUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  let needsHeif = looksLikeHeifSource(contentType, sourceUrl) || looksLikeHeifBuffer(input);
  if (!needsHeif) {
    try {
      const meta = await sharp(input).metadata();
      const fmt = String(meta.format ?? "");
      needsHeif = fmt === "heif" || fmt === "heic";
      if (!needsHeif) {
        return { buffer: input, contentType: contentType || `image/${meta.format ?? "jpeg"}` };
      }
    } catch {
      return { buffer: input, contentType };
    }
  }

  try {
    const jpeg = await sharp(input).jpeg({ quality: 86 }).toBuffer();
    return { buffer: jpeg, contentType: "image/jpeg" };
  } catch {
    // XHS often uses HEIF compression sharp cannot decode — use heic-convert.
  }

  const convert = await loadHeicConvert();
  const out = await convert({ buffer: input, format: "JPEG", quality: 0.86 });
  return { buffer: Buffer.from(out), contentType: "image/jpeg" };
}

export async function normalizeReferenceImageFile(file: File): Promise<File> {
  const buf = Buffer.from(await file.arrayBuffer());
  const { buffer, contentType } = await toBrowserJpegBuffer(buf, file.type, file.name);
  if (buffer === buf && file.type.startsWith("image/") && !/heif|heic/i.test(file.type)) {
    return file;
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "reference";
  return new File([new Uint8Array(buffer)], `${base}.jpg`, { type: contentType });
}
