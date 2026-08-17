"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { NavHoverMenu } from "@/components/nav/NavHoverMenu";

type CanvaNavMenuProps = {
  variant?: "light" | "dark";
  triggerClassName?: string;
};

/** Desktop: 画布 / Canvas hover flyout → edit-image + captions. */
export function CanvaNavMenu({ variant = "light", triggerClassName }: CanvaNavMenuProps) {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <NavHoverMenu
      label={L.navCanva}
      href="/#tools"
      variant={variant}
      triggerClassName={triggerClassName}
      items={[
        {
          href: "/edit-image",
          label: L.toolEditTitle,
          description: L.toolEditDesc,
          icon: "edit",
        },
        {
          href: "/captions",
          label: L.toolCaptionsTitle,
          description: L.toolCaptionsDesc,
          icon: "captions",
        },
      ]}
    />
  );
}

/** Mobile drawer: same two routes under the canvas hub. */
export function CanvaNavMobileLinks({
  variant = "light",
  onNavigate,
}: {
  variant?: "light" | "dark";
  onNavigate?: () => void;
}) {
  const { m } = useLocale();
  const L = m.landing;
  const dark = variant === "dark";

  const itemClass = dark
    ? "rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
    : "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700";

  const subClass = dark
    ? "rounded-lg py-2 pl-6 pr-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
    : "rounded-lg py-2 pl-6 pr-3 text-sm text-slate-600 hover:bg-violet-50 hover:text-violet-800";

  return (
    <>
      <Link href="/#tools" className={itemClass} onClick={onNavigate}>
        {L.navCanva}
      </Link>
      <Link href="/edit-image" className={subClass} onClick={onNavigate}>
        {L.toolEditTitle}
      </Link>
      <Link href="/captions" className={subClass} onClick={onNavigate}>
        {L.toolCaptionsTitle}
      </Link>
    </>
  );
}
