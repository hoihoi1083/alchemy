import type { ContentPlatform } from "@/lib/content-research-types";

type Props = {
  platform: ContentPlatform;
  className?: string;
};

/** Brand-colored marks for research platform chips (not generic letter tiles). */
export function ResearchPlatformLogo({ platform, className = "h-5 w-5" }: Props) {
  if (platform === "xiaohongshu") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small static brand mark
      <img
        src="/images/landing/platform-xhs.png"
        alt=""
        width={28}
        height={28}
        className={`${className} rounded-[22%] object-cover`}
        decoding="async"
      />
    );
  }

  if (platform === "instagram") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden>
        <defs>
          <radialGradient id="ig" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="5%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="60%" stopColor="#d6249f" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig)" />
        <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="3.25" fill="none" stroke="#fff" strokeWidth="1.75" />
        <circle cx="16.35" cy="7.65" r="1.15" fill="#fff" />
      </svg>
    );
  }

  if (platform === "tiktok") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#010101" />
        <path
          fill="#25F4EE"
          d="M14.2 6.2c.55 1.55 1.7 2.8 3.3 3.25v2.15c-1.15-.05-2.2-.4-3.15-1v4.85c0 2.55-2.05 4.55-4.6 4.55S5.15 18 5.15 15.45 7.2 10.9 9.75 10.9c.3 0 .6.05.9.1v2.25c-.25-.1-.55-.15-.9-.15-1.35 0-2.45 1.1-2.45 2.45s1.1 2.45 2.45 2.45 2.45-1.1 2.45-2.45V6.2h2z"
        />
        <path
          fill="#FE2C55"
          d="M14.55 5.85c.55 1.55 1.7 2.8 3.3 3.25v2.15c-1.15-.05-2.2-.4-3.15-1v4.85c0 2.55-2.05 4.55-4.6 4.55S5.5 17.65 5.5 15.1s2.05-4.55 4.6-4.55c.3 0 .6.05.9.1v2.25c-.25-.1-.55-.15-.9-.15-1.35 0-2.45 1.1-2.45 2.45s1.1 2.45 2.45 2.45 2.45-1.1 2.45-2.45V5.85h2z"
          opacity="0.9"
        />
        <path
          fill="#fff"
          d="M14 6.5c.55 1.55 1.7 2.8 3.3 3.25v1.55c-1.15-.05-2.2-.4-3.15-1v4.85c0 2.55-2.05 4.55-4.6 4.55S5 17.7 5 15.15 7.05 10.6 9.6 10.6c.3 0 .6.05.9.1v1.65c-.25-.1-.55-.15-.9-.15-1.35 0-2.45 1.1-2.45 2.45s1.1 2.45 2.45 2.45 2.45-1.1 2.45-2.45V6.5H14z"
        />
      </svg>
    );
  }

  if (platform === "facebook") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path
          fill="#fff"
          d="M15.6 12.75h-2.1v7.5H10.5v-7.5H8.85V10.2H10.5V8.55c0-1.65.75-4.2 4.2-4.2h2.55v2.85h-1.8c-.45 0-1.05.15-1.05 1.2v1.8h2.85l-.45 2.55z"
        />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#0f172a" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M12 6.5v11M6.5 12h11" stroke="#94a3b8" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="2.5" ry="5.5" fill="none" stroke="#94a3b8" strokeWidth="1.25" />
    </svg>
  );
}
