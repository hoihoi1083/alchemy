"use client";

import { useEffect } from "react";
import { LIVE_TEXT_GOOGLE_FONTS_HREF } from "@/lib/edit-image-2-live-text";

const LINK_ID = "alchemy-live-text-google-fonts";

/** Inject Google Fonts once so Konva canvas can paint live text families. */
export function LiveTextFontLoader() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(LINK_ID)) return;
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = LIVE_TEXT_GOOGLE_FONTS_HREF;
    document.head.append(preconnect1, preconnect2, link);
  }, []);
  return null;
}
