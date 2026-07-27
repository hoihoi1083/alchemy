import { ImageResponse } from "next/og";
import { PRODUCT_NAME } from "@/lib/brand";

export const alt = PRODUCT_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "linear-gradient(145deg, #0B1120 0%, #1e293b 55%, #0f172a 100%)",
          color: "#f8fafc",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 16 }}>
          ALCHEMY AI LAB
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>
          Product ads and short videos for marketing
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#cbd5e1", maxWidth: 820 }}>
          Guided studio · image to video · captions · library
        </div>
      </div>
    ),
    { ...size },
  );
}
