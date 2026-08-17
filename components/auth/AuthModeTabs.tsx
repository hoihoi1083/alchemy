"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLocale } from "@/components/LocaleProvider";

type AuthModeTabsProps = {
	mode: "sign-in" | "sign-up";
	variant?: "page" | "modal";
	onModeChange?: (mode: "sign-in" | "sign-up") => void;
};

function AuthModeTabsBody({ mode, variant = "page", onModeChange }: AuthModeTabsProps) {
	const { m } = useLocale();
	const searchParams = useSearchParams();
	const query = searchParams.toString();
	const suffix = query ? `?${query}` : "";

	const tabClass = (active: boolean) =>
		`flex-1 rounded-md py-2 text-center text-sm font-semibold transition ${
			active
				? "bg-white text-slate-900 shadow-sm"
				: "text-slate-500 hover:text-slate-700"
		}`;

	if (variant === "modal" && onModeChange) {
		return (
			<nav
				className={`flex rounded-xl bg-slate-100 p-1 ${variant === "modal" ? "mb-3" : "mb-5"}`}
				aria-label={mode === "sign-in" ? m.auth.signInTab : m.auth.signUpTab}
			>
				<button
					type="button"
					className={tabClass(mode === "sign-in")}
					onClick={() => onModeChange("sign-in")}
				>
					{m.auth.signInTab}
				</button>
				<button
					type="button"
					className={tabClass(mode === "sign-up")}
					onClick={() => onModeChange("sign-up")}
				>
					{m.auth.signUpTab}
				</button>
			</nav>
		);
	}

	return (
		<nav
			className="mb-5 flex rounded-xl bg-slate-100 p-1"
			aria-label={mode === "sign-in" ? m.auth.signInTab : m.auth.signUpTab}
		>
			<Link href={`/sign-in${suffix}`} className={tabClass(mode === "sign-in")}>
				{m.auth.signInTab}
			</Link>
			<Link href={`/sign-up${suffix}`} className={tabClass(mode === "sign-up")}>
				{m.auth.signUpTab}
			</Link>
		</nav>
	);
}

export function AuthModeTabs(props: AuthModeTabsProps) {
	if (props.variant === "modal") {
		return <AuthModeTabsBody {...props} />;
	}

	return (
		<Suspense fallback={<div className="mb-5 h-10 rounded-xl bg-slate-100" aria-hidden />}>
			<AuthModeTabsBody {...props} />
		</Suspense>
	);
}
