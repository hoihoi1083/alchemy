import sharp from "sharp";
import type { HealRect } from "@/lib/edit-image-2-local-heal";

/**
 * Wipe a hole with a solid median ring colour (no smear / no billed heal).
 * Used only as a pre-Qwen hint so glyphs/subject don't bake into visual layers;
 * the final board plate comes from Qwen's background layer.
 */
export async function softCoverHole(
  imgBuf: Buffer,
  hole: HealRect,
  imgW: number,
  imgH: number,
): Promise<Buffer> {
  const hl = Math.max(0, Math.min(hole.left, imgW - 1));
  const ht = Math.max(0, Math.min(hole.top, imgH - 1));
  const hw = Math.max(1, Math.min(hole.width, imgW - hl));
  const hh = Math.max(1, Math.min(hole.height, imgH - ht));

  const ring = Math.max(8, Math.round(Math.min(hw, hh) * 0.12));
  const left = Math.max(0, hl - ring);
  const top = Math.max(0, ht - ring);
  const width = Math.min(imgW - left, hw + ring * 2);
  const height = Math.min(imgH - top, hh + ring * 2);

  const { data, info } = await sharp(imgBuf)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  const rw = info.width;
  const rh = info.height;
  const holeL = hl - left;
  const holeT = ht - top;
  const samples: number[] = [];

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const inHole = x >= holeL && x < holeL + hw && y >= holeT && y < holeT + hh;
      if (inHole) continue;
      const i = (y * rw + x) * ch;
      samples.push(data[i]!, data[i + 1]!, data[i + 2]!);
    }
  }

  let fillR = 32;
  let fillG = 32;
  let fillB = 32;
  if (samples.length >= 3) {
    const rs: number[] = [];
    const gs: number[] = [];
    const bs: number[] = [];
    for (let i = 0; i < samples.length; i += 3) {
      rs.push(samples[i]!);
      gs.push(samples[i + 1]!);
      bs.push(samples[i + 2]!);
    }
    const med = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)]!;
    };
    fillR = med(rs);
    fillG = med(gs);
    fillB = med(bs);
  }

  const solid = await sharp({
    create: {
      width: hw,
      height: hh,
      channels: 3,
      background: { r: fillR, g: fillG, b: fillB },
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer();

  return sharp(imgBuf)
    .composite([{ input: solid, left: hl, top: ht }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Big Latin wordmarks (e.g. SMASH) — leave for Qwen as graphic layers. */
export function isLogoLikeGraphicText(
  label: string,
  px: { width: number; height: number },
  imgW: number,
  imgH: number,
): boolean {
  const area = (px.width * px.height) / Math.max(1, imgW * imgH);
  const compact = label.replace(/\s+/g, "");
  if (!compact || compact.length > 24) return false;
  const latin = /^[A-Za-z0-9!?.\-_'']+$/.test(compact);
  if (latin && area >= 0.04 && compact.length <= 16) return true;
  if (area >= 0.1 && compact.length <= 20) return true;
  return false;
}
