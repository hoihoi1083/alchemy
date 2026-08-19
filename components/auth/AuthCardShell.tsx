"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AuthBrandLockup } from "@/components/AuthBrandLockup";
import { AuthModeTabs } from "@/components/auth/AuthModeTabs";
import { AuthPanelFeatures } from "@/components/auth/AuthPanelFeatures";
import { useLocale } from "@/components/LocaleProvider";

type AuthCardShellProps = {
	mode: "sign-in" | "sign-up";
	variant?: "page" | "modal";
	onModeChange?: (mode: "sign-in" | "sign-up") => void;
	children: ReactNode;
};

const MODAL_CARD_STYLE: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "220px minmax(0, 1fr)",
	width: "100%",
	maxHeight: "90vh",
	overflow: "hidden",
	borderRadius: "16px",
	background: "#fff",
	boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
};

const MODAL_FORM_STYLE: CSSProperties = {
	minWidth: 0,
	maxHeight: "90vh",
	overflowY: "auto",
	overflowX: "hidden",
	padding: "1.5rem 1.75rem 2.5rem",
	background: "#fff",
	borderTopRightRadius: "16px",
	borderBottomRightRadius: "16px",
};

export function AuthCardShell({
	mode,
	variant = "page",
	onModeChange,
	children,
}: AuthCardShellProps) {
	const { m } = useLocale();
	const compact = variant === "modal";
	const subtitle =
		mode === "sign-in" ? m.auth.signInSubtitle : m.auth.signUpSubtitle;
	const [sideBySide, setSideBySide] = useState(true);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 640px)");
		const sync = () => setSideBySide(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	if (!compact) {
		return (
			<div className="relative flex w-full max-w-[880px] overflow-hidden rounded-2xl bg-white shadow-2xl">
				<AuthPanelFeatures />
				<div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-8 sm:px-8 sm:py-10">
					<div className="mb-5 flex justify-center">
						<AuthBrandLockup href="/" className="[&_img]:h-9 [&_img]:w-9 [&_span]:text-base" />
					</div>
					<AuthModeTabs mode={mode} variant={variant} onModeChange={onModeChange} />
					<p className="mb-2 text-center text-sm leading-relaxed text-slate-500">
						{subtitle}
					</p>
					{mode === "sign-in" ? (
						<p className="mb-4 text-center text-xs leading-relaxed text-slate-500">
							{m.auth.signInOAuthHint}
						</p>
					) : null}
					<div className="auth-clerk-root w-full">{children}</div>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				...MODAL_CARD_STYLE,
				gridTemplateColumns: sideBySide ? "220px minmax(0, 1fr)" : "1fr",
			}}
		>
			{sideBySide ? <AuthPanelFeatures compact modal /> : null}

			<div style={MODAL_FORM_STYLE} className="auth-modal-form-panel relative flex flex-col">
				<div className="mb-3 flex justify-center">
					<AuthBrandLockup className="[&_img]:h-8 [&_img]:w-8 [&_span]:text-sm" />
				</div>
				<AuthModeTabs mode={mode} variant={variant} onModeChange={onModeChange} />
				<p className="mb-2 text-center text-xs leading-relaxed text-slate-500">
					{subtitle}
				</p>
				{mode === "sign-in" ? (
					<p className="mb-3 text-center text-[11px] leading-relaxed text-slate-500">
						{m.auth.signInOAuthHint}
					</p>
				) : null}
				<div className="auth-clerk-root min-h-0 w-full pb-2">{children}</div>
			</div>
		</div>
	);
}
