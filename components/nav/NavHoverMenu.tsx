"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type NavHoverMenuIcon = "brand" | "edit" | "captions" | "library" | "pro" | "start";

export type NavHoverMenuItem = {
  id: string;
  href?: string;
  label: string;
  description?: string;
  icon?: NavHoverMenuIcon;
  badge?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

type NavHoverMenuProps = {
  label: string;
  href: string;
  items: NavHoverMenuItem[];
  variant?: "light" | "dark";
  /** Parent link classes (desktop nav item). */
  triggerClassName?: string;
  trailing?: ReactNode;
};

const FLYOUT_WIDTH_PX = 320;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`size-3.5 opacity-70 transition ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MenuIcon({ kind, dark }: { kind: NavHoverMenuIcon; dark: boolean }) {
  const shellStyle: CSSProperties = {
    display: "flex",
    width: 32,
    height: 32,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: dark ? "rgba(255, 255, 255, 0.1)" : "#f5f3ff",
    color: dark ? "#ddd6fe" : "#6d28d9",
  };

  const svg = (path: ReactNode) => (
    <span style={shellStyle} aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
        {path}
      </svg>
    </span>
  );

  switch (kind) {
    case "brand":
      return svg(
        <path
          fillRule="evenodd"
          d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-1.25 4.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z"
          clipRule="evenodd"
        />,
      );
    case "edit":
      return svg(<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />);
    case "captions":
      return svg(
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />,
      );
    case "library":
      return svg(
        <path
          fillRule="evenodd"
          d="M3 4.25A2.25 2.25 0 015.25 2h9.5A2.25 2.25 0 0117 4.25v11.5A2.25 2.25 0 0114.75 18h-9.5A2.25 2.25 0 013 15.75V4.25zm3.75 1.5a.75.75 0 00-.75.75v9a.75.75 0 001.5 0V6.5a.75.75 0 00-.75-.75zm3 0a.75.75 0 00-.75.75v9a.75.75 0 001.5 0V6.5a.75.75 0 00-.75-.75zm3 0a.75.75 0 00-.75.75v9a.75.75 0 001.5 0V6.5a.75.75 0 00-.75-.75z"
          clipRule="evenodd"
        />,
      );
    case "pro":
      return svg(
        <path
          fillRule="evenodd"
          d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.653 1.383 2.653 2.894v4.147c0 .839-.334 1.643-.927 2.236l-6.138 6.138a3 3 0 01-4.243 0L2.32 11.754a3.182 3.182 0 01-.927-2.236V5.471c0-1.511 1.156-2.72 2.653-2.894zM7.5 6.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5zm4.25-.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5a.75.75 0 01.75-.75z"
          clipRule="evenodd"
        />,
      );
    case "start":
      return svg(
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />,
      );
  }
}

function flyoutPanelStyle(dark: boolean, pos: { top: number; left: number }): CSSProperties {
  return {
    position: "fixed",
    top: pos.top,
    left: pos.left,
    width: FLYOUT_WIDTH_PX,
    minWidth: FLYOUT_WIDTH_PX,
    maxWidth: FLYOUT_WIDTH_PX,
    zIndex: 9999,
    boxSizing: "border-box",
    backgroundColor: dark ? "#020617" : "#ffffff",
    border: dark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "6px",
    boxShadow: dark
      ? "0 10px 30px -8px rgba(0, 0, 0, 0.55)"
      : "0 10px 25px -5px rgba(148, 163, 184, 0.35), 0 4px 10px -4px rgba(148, 163, 184, 0.25)",
  };
}

function flyoutItemStyle(dark: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: "inherit",
    backgroundColor: "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    font: "inherit",
  };
}

function badgeStyle(dark: boolean): CSSProperties {
  return {
    display: "inline-flex",
    flexShrink: 0,
    marginTop: 1,
    borderRadius: 9999,
    backgroundColor: dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)",
    padding: "2px 8px",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: dark ? "#c4b5fd" : "#6d28d9",
    boxShadow: dark ? "none" : "0 1px 2px rgba(15,23,42,0.08)",
  };
}

function FlyoutItem({
  item,
  dark,
}: {
  item: NavHoverMenuItem;
  dark: boolean;
}) {
  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.3,
    color: dark ? "#f1f5f9" : "#0f172a",
  };

  const hintStyle: CSSProperties = {
    display: "block",
    marginTop: 4,
    fontSize: 11,
    lineHeight: 1.45,
    color: dark ? "#94a3b8" : "#64748b",
    whiteSpace: "normal",
  };

  const hoverBg = dark ? "rgba(255, 255, 255, 0.08)" : "#f5f3ff";

  const body = (
    <>
      {item.icon ? <MenuIcon kind={item.icon} dark={dark} /> : null}
      <span style={{ flex: "1 1 auto", paddingTop: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <span style={labelStyle}>{item.label}</span>
          {item.badge ? <span style={badgeStyle(dark)}>{item.badge}</span> : null}
        </span>
        {item.description ? <span style={hintStyle}>{item.description}</span> : null}
      </span>
    </>
  );

  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = hoverBg;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = "transparent";
    },
  };

  if (item.onClick) {
    return (
      <button
        type="button"
        role="menuitem"
        className="nav-hover-flyout__item"
        style={flyoutItemStyle(dark)}
        onClick={item.onClick}
        {...hoverHandlers}
      >
        {body}
      </button>
    );
  }

  return (
    <Link
      href={item.href ?? "#"}
      role="menuitem"
      className="nav-hover-flyout__item"
      style={flyoutItemStyle(dark)}
      {...hoverHandlers}
    >
      {body}
    </Link>
  );
}

/**
 * Desktop nav item with hover flyout — parent link + child routes.
 * Flyout renders in a portal so flex/min-w-0 ancestors cannot collapse width.
 */
export function NavHoverMenu({
  label,
  href,
  items,
  variant = "light",
  triggerClassName,
  trailing,
}: NavHoverMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dark = variant === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncPosition = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });
  };

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    syncPosition();
    setOpen(true);
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    syncPosition();
    const onScrollOrResize = () => syncPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  const baseTrigger = "inline-flex items-center gap-0.5";
  const trigger =
    triggerClassName != null
      ? `${baseTrigger} ${triggerClassName}`
      : dark
        ? `${baseTrigger} whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-300 hover:bg-white/10 hover:text-white xl:text-[13px]`
        : `${baseTrigger} whitespace-nowrap text-[12px] font-medium text-slate-600 hover:text-violet-700 xl:text-[13px]`;

  const flyout =
    open && mounted
      ? createPortal(
          <div
            role="menu"
            className="nav-hover-flyout-panel"
            style={flyoutPanelStyle(dark, pos)}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            {items.map((item) => (
              <FlyoutItem key={item.id} item={item} dark={dark} />
            ))}
            {trailing ? (
              <div
                className="mt-1 border-t pt-1"
                style={{ borderColor: dark ? "rgba(255,255,255,0.1)" : "#e2e8f0" }}
              >
                {trailing}
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0 items-center" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <Link href={href} className={trigger} aria-haspopup="menu" aria-expanded={open}>
        <span className="leading-none">{label}</span>
        <Chevron open={open} />
      </Link>
      {flyout}
    </div>
  );
}
