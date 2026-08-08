"use client";

import type { ReactNode } from "react";
import {
  STUDIO_GLOW_THEMES,
  type StudioGlowThemeId,
} from "@/lib/studio-glow";

/**
 * Full-page shell: footer-like multidirectional glows + dot grid.
 * Colors: edit `STUDIO_GLOW_THEMES` / `STUDIO_PAGE_GLOW` in lib/studio-glow.ts
 *
 * Styles are injected here (same pattern as LandingFooter) so the CSS
 * pipeline cannot drop the rules.
 */
export function StudioGlowShell({
  theme,
  children,
  className = "",
}: {
  theme: StudioGlowThemeId;
  children: ReactNode;
  className?: string;
}) {
  const t = STUDIO_GLOW_THEMES[theme];

  return (
    <main
      className={`studio-glow-bg relative min-h-screen overflow-x-clip text-slate-100 ${className}`}
      data-studio-glow={theme}
    >
      <style>{`
        .studio-glow-bg[data-studio-glow="${theme}"] {
          background-color: ${t.base};
          background-image:
            radial-gradient(ellipse 90% 80% at 8% 100%, ${t.g1} 0%, transparent 55%),
            radial-gradient(ellipse 70% 65% at 92% 0%, ${t.g2} 0%, transparent 50%),
            radial-gradient(ellipse 55% 50% at 55% 45%, ${t.g3} 0%, transparent 60%),
            radial-gradient(ellipse 40% 45% at 30% 15%, ${t.g4} 0%, transparent 55%);
        }
        .studio-glow-bg[data-studio-glow="${theme}"]::before {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: radial-gradient(${t.dot} 1px, transparent 1.2px);
          background-size: 20px 20px;
          background-position: 0 0;
          opacity: ${t.dotOpacity};
          mask-image: radial-gradient(
            ellipse 95% 90% at 50% 40%,
            #000 30%,
            transparent 100%
          );
          -webkit-mask-image: radial-gradient(
            ellipse 95% 90% at 50% 40%,
            #000 30%,
            transparent 100%
          );
        }
      `}</style>
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </main>
  );
}
