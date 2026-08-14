"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type NavHoverMenuItem = {
  href: string;
  label: string;
  description?: string;
  icon?: "edit" | "captions";
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

const FLYOUT_WIDTH_PX = 300;

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

function MenuIcon({ kind, dark }: { kind: "edit" | "captions"; dark: boolean }) {
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

  if (kind === "edit") {
    return (
      <span style={shellStyle} aria-hidden>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </span>
    );
  }

  return (
    <span style={shellStyle} aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
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
  };
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

  const trigger =
    triggerClassName ??
    (dark
      ? "inline-flex items-center gap-0.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-300 hover:bg-white/10 hover:text-white xl:text-[13px]"
      : "inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-medium text-slate-600 hover:text-violet-700 xl:text-[13px]");

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
    lineHeight: 1.4,
    color: dark ? "#94a3b8" : "#64748b",
    whiteSpace: "nowrap",
  };

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
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="nav-hover-flyout__item"
                style={flyoutItemStyle(dark)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = dark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "#f5f3ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {item.icon ? <MenuIcon kind={item.icon} dark={dark} /> : null}
                <span style={{ flex: "1 1 auto", paddingTop: 1 }}>
                  <span style={labelStyle}>{item.label}</span>
                  {item.description ? <span style={hintStyle}>{item.description}</span> : null}
                </span>
              </Link>
            ))}
            {trailing}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative shrink-0" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <Link href={href} className={trigger} aria-haspopup="menu" aria-expanded={open}>
        {label}
        <Chevron open={open} />
      </Link>
      {flyout}
    </div>
  );
}
