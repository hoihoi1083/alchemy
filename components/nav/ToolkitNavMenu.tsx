"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import { NavHoverMenu, type NavHoverMenuItem } from "@/components/nav/NavHoverMenu";
import { PRICING_ULTRA_CANVAS_HREF, ULTRA_CANVAS_PATH } from "@/lib/ultra-canvas-path";
import { canUseProCanvas } from "@/lib/billing/entitlements";
import { normalizeUserPlan } from "@/lib/billing/plans";

type ToolkitNavMenuProps = {
  variant?: "light" | "dark";
  triggerClassName?: string;
};

function useProCanvasAccess() {
  const { isSignedIn, isLoaded } = useAuth();
  const [hasPro, setHasPro] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setHasPro(false);
      return;
    }
    let cancelled = false;
    void fetch("/api/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          user?: { plan?: string | null; effectivePlan?: string | null } | null;
        };
        if (cancelled) return;
        setHasPro(canUseProCanvas(normalizeUserPlan(data.user?.effectivePlan ?? data.user?.plan)));
      })
      .catch(() => {
        /* keep pricing fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return { hasPro, isSignedIn, isLoaded };
}

/** Desktop: Toolkit hover flyout — brand kit, edit-image, captions, Ultra canvas, Start creating. */
export function ToolkitNavMenu({ variant = "light", triggerClassName }: ToolkitNavMenuProps) {
  const { m } = useLocale();
  const L = m.landing;
  const { hasPro, isSignedIn } = useProCanvasAccess();
  const [gateOpen, setGateOpen] = useState(false);
  const dark = variant === "dark";

  const items = useMemo((): NavHoverMenuItem[] => {
    const proItem: NavHoverMenuItem = hasPro
      ? {
          id: "pro",
          href: ULTRA_CANVAS_PATH,
          label: L.toolUltraCanvasTitle,
          description: L.toolUltraCanvasDesc,
          icon: "pro",
        }
      : {
          id: "pro",
          label: L.toolUltraCanvasTitle,
          description: L.toolUltraCanvasDesc,
          icon: "pro",
          badge: L.ultraCanvasMasterBadge,
          onClick: (e) => {
            e.preventDefault();
            if (isSignedIn) {
              setGateOpen(true);
            } else {
              window.location.href = PRICING_ULTRA_CANVAS_HREF;
            }
          },
        };

    return [
      {
        id: "brand-kit",
        href: "/brand-kit",
        label: L.toolBrandTitle,
        description: L.toolBrandDesc,
        icon: "brand",
      },
      {
        id: "edit-image",
        href: "/edit-image",
        label: L.toolEditTitle,
        description: L.toolEditDesc,
        icon: "edit",
      },
      {
        id: "captions",
        href: "/captions",
        label: L.toolCaptionsTitle,
        description: L.toolCaptionsDesc,
        icon: "captions",
      },
      proItem,
    ];
  }, [L, hasPro, isSignedIn]);

  const startLabel = isSignedIn ? L.startCreating : L.tryFree;

  return (
    <>
      <NavHoverMenu
        label={L.navToolkit}
        href="/#tools"
        variant={variant}
        triggerClassName={triggerClassName}
        items={items}
        trailing={
          <Link
            href="/start"
            role="menuitem"
            className={
              dark
                ? "mx-1 flex items-center gap-3 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
                : "mx-1 flex items-center gap-3 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            }
          >
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">{startLabel}</span>
              <span className="mt-0.5 block text-[11px] font-normal leading-snug text-violet-100">
                {L.toolStartDesc}
              </span>
            </span>
          </Link>
        }
      />
      <PlanGateDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requiredPlan="master"
        featureLabel={L.navUltraCanvas}
      />
    </>
  );
}

/** Mobile drawer: toolkit routes + Start creating. */
export function ToolkitNavMobileLinks({
  variant = "light",
  onNavigate,
}: {
  variant?: "light" | "dark";
  onNavigate?: () => void;
}) {
  const { m } = useLocale();
  const L = m.landing;
  const { hasPro, isSignedIn } = useProCanvasAccess();
  const [gateOpen, setGateOpen] = useState(false);
  const dark = variant === "dark";

  const itemClass = dark
    ? "rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
    : "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700";

  const subClass = dark
    ? "rounded-lg py-2 pl-6 pr-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
    : "rounded-lg py-2 pl-6 pr-3 text-sm text-slate-600 hover:bg-violet-50 hover:text-violet-800";

  const proHref = hasPro ? ULTRA_CANVAS_PATH : PRICING_ULTRA_CANVAS_HREF;
  const startLabel = isSignedIn ? L.startCreating : L.tryFree;

  return (
    <>
      <Link href="/#tools" className={itemClass} onClick={onNavigate}>
        {L.navToolkit}
      </Link>
      <Link href="/brand-kit" className={subClass} onClick={onNavigate}>
        {L.toolBrandTitle}
      </Link>
      <Link href="/edit-image" className={subClass} onClick={onNavigate}>
        {L.toolEditTitle}
      </Link>
      <Link href="/captions" className={subClass} onClick={onNavigate}>
        {L.toolCaptionsTitle}
      </Link>
      {hasPro ? (
        <Link href={proHref} className={subClass} onClick={onNavigate}>
          {L.toolUltraCanvasTitle}
        </Link>
      ) : (
        <button
          type="button"
          className={`${subClass} w-full text-left`}
          onClick={() => {
            onNavigate?.();
            if (isSignedIn) setGateOpen(true);
            else window.location.href = proHref;
          }}
        >
          {L.toolUltraCanvasTitle}
          <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
            {L.ultraCanvasMasterBadge}
          </span>
        </button>
      )}
      <Link
        href="/start"
        className={
          dark
            ? "mt-1 rounded-lg bg-violet-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
            : "mt-1 rounded-lg bg-violet-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
        }
        onClick={onNavigate}
      >
        {startLabel}
      </Link>
      <PlanGateDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requiredPlan="master"
        featureLabel={L.navUltraCanvas}
      />
    </>
  );
}
