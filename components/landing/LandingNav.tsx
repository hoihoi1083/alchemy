"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { CanvaNavMenu, CanvaNavMobileLinks } from "@/components/nav/CanvaNavMenu";
import { ProNavLink } from "@/components/nav/ProNavLink";
import { useLocale } from "@/components/LocaleProvider";
import { AuthBrandLockup } from "@/components/AuthBrandLockup";
import { SignUpPromoBar } from "@/components/SignUpPromoBar";
import { PRODUCT_WORDMARK_ALT } from "@/lib/brand";

/** Home + section anchors + product tool routes. */
const NAV = [
	{ href: "/", key: "navHome" as const },
	{ href: "/#how", key: "navHow" as const },
	{ href: "/pricing", key: "navPricing" as const },
	{ href: "/#templates", key: "navUseCases" as const },
] as const;

/** Full-bleed bar; nav sits next to logo (no bottom rule). */
export function LandingNav() {
	const { m } = useLocale();
	const L = m.landing;
	const { isSignedIn } = useAuth();
	const [open, setOpen] = useState(false);

	return (
		<div className="sticky top-0 z-40 w-full">
			<header className="w-full bg-white">
			<div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-3.5 md:px-8">
				<AuthBrandLockup
					href="/"
					className="min-w-0 shrink-0 [&_img]:h-10 [&_img]:w-10 sm:[&_img]:h-11 sm:[&_img]:w-11 [&_span]:text-lg sm:[&_span]:text-xl"
					ariaLabel={PRODUCT_WORDMARK_ALT}
				/>

				<nav className="landing-nav-links ml-8 hidden min-w-0 items-center gap-2.5 xl:ml-12 xl:gap-3.5 lg:flex">
					{NAV.slice(0, 4).map((item) => (
						<Link
							key={item.key}
							href={item.href}
							className="whitespace-nowrap text-[12px] font-medium text-slate-600 hover:text-violet-700 xl:text-[13px]"
						>
							{L[item.key]}
						</Link>
					))}
					<CanvaNavMenu />
					<ProNavLink className="whitespace-nowrap text-[12px] font-medium text-slate-600 hover:text-violet-700 xl:text-[13px]" />
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
					<div className="hidden sm:block">
						<LanguageToggle variant="light" />
					</div>
					<AuthNav compact />
					<Link
						href="/start"
						className="landing-cta-shine landing-try-free hidden rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 sm:inline-flex"
					>
						{isSignedIn ? L.startCreating : L.tryFree}
					</Link>
					<button
						type="button"
						className="landing-nav-menu-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
						aria-expanded={open}
						aria-label="Menu"
						onClick={() => setOpen((v) => !v)}
					>
						{open ? "✕" : "☰"}
					</button>
				</div>
			</div>

			{open ? (
				<div className="landing-nav-mobile border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
					<div className="mb-3 flex justify-center sm:hidden">
						<LanguageToggle variant="light" />
					</div>
					<nav className="flex flex-col gap-1">
						{NAV.slice(0, 4).map((item) => (
							<Link
								key={item.key}
								href={item.href}
								className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
								onClick={() => setOpen(false)}
							>
								{L[item.key]}
							</Link>
						))}
						<CanvaNavMobileLinks onNavigate={() => setOpen(false)} />
						<ProNavLink
							className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
							onClick={() => setOpen(false)}
						/>
						<Link
							href="/start"
							className="mt-1 rounded-full bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
							onClick={() => setOpen(false)}
						>
							{isSignedIn ? L.startCreating : L.tryFree}
						</Link>
					</nav>
				</div>
			) : null}
			</header>
			<SignUpPromoBar />
		</div>
	);
}
