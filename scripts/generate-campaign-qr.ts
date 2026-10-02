import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import {
  CAMPAIGN_SHORT_LINKS,
  publicCampaignLandingUrl,
} from "../lib/campaign-short-links";

async function main() {
  const dir = join(process.cwd(), "public", "campaign-qr");
  mkdirSync(dir, { recursive: true });
  for (const link of CAMPAIGN_SHORT_LINKS) {
    const target = publicCampaignLandingUrl(link);
    const png = await QRCode.toBuffer(target, {
      type: "png",
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const out = join(dir, `${link.code}.png`);
    writeFileSync(out, png);
    console.log(`${out} → ${target}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
