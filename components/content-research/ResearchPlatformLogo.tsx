"use client";

import { useId } from "react";
import type { ContentPlatform } from "@/lib/content-research-types";

type Props = {
  platform: ContentPlatform;
  className?: string;
};

/** Official-style platform marks for the research picker. */
export function ResearchPlatformLogo({ platform, className = "h-6 w-6" }: Props) {
  const uid = useId().replace(/:/g, "");

  if (platform === "xiaohongshu") {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden>
        <rect width="32" height="32" rx="7" fill="#FF2442" />
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="#fff"
          fontSize="9"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
        >
          RED
        </text>
      </svg>
    );
  }

  if (platform === "instagram") {
    const gid = `ig-${uid}`;
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden>
        <defs>
          <radialGradient id={gid} cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="60%" stopColor="#d6249f" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill={`url(#${gid})`} />
        <rect
          x="8"
          y="8"
          width="16"
          height="16"
          rx="5"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
        />
        <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="21.2" cy="10.8" r="1.35" fill="#fff" />
      </svg>
    );
  }

  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden>
        <rect width="32" height="32" rx="8" fill="#000" />
        <path
          fill="#25F4EE"
          d="M20.4 9.2c.85 1.7 2.35 3 4.2 3.5v2.55c-1.45-.1-2.8-.6-3.9-1.4v6.15c0 3.35-2.75 6.1-6.1 6.1S8.5 23.35 8.5 20c0-3.35 2.75-6.1 6.1-6.1.45 0 .9.05 1.3.15v2.75c-.4-.15-.85-.2-1.3-.2-1.85 0-3.35 1.5-3.35 3.35S14.1 23.3 16 23.3s3.35-1.5 3.35-3.35V9.2h1.05Z"
        />
        <path
          fill="#FE2C55"
          d="M19.1 7.9c.85 1.7 2.35 3 4.2 3.5v2.55c-1.45-.1-2.8-.6-3.9-1.4.05 2.2.1 5.1.1 7.45 0 3.55-2.55 6.5-5.95 7.05 2.15-.75 3.7-2.8 3.7-5.2 0-2.55-.05-5.65-.15-8.25.7.6 1.55 1 2.5 1.2V7.9h-.5Z"
        />
        <path
          fill="#fff"
          d="M19.75 8.55c.85 1.7 2.35 3 4.2 3.5v2.55c-1.45-.1-2.8-.6-3.9-1.4v6.15c0 3.35-2.75 6.1-6.1 6.1S7.85 22.7 7.85 19.35c0-3.35 2.75-6.1 6.1-6.1.45 0 .9.05 1.3.15v2.75c-.4-.15-.85-.2-1.3-.2-1.85 0-3.35 1.5-3.35 3.35s1.5 3.35 3.35 3.35 3.35-1.5 3.35-3.35V8.55h1.45Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#1877F2" />
      <path
        fill="#fff"
        d="M17.6 24.8v-7.7h2.55l.4-2.95h-2.95v-1.9c0-.85.25-1.45 1.5-1.45h1.6V8.2c-.3-.05-1.25-.15-2.35-.15-2.35 0-3.95 1.4-3.95 3.95v2.2h-2.65v2.95h2.65v7.7h3.2Z"
      />
    </svg>
  );
}
