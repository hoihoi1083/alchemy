"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { LanguageToggle } from "@/components/LanguageToggle";

type AuthPageShellProps = {
	mode: "sign-in" | "sign-up";
	children: ReactNode;
};

function AuthPageShellBody({ mode, children }: AuthPageShellProps) {
	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-950/80 px-4 py-8">
			<div className="absolute right-4 top-4 sm:right-6 sm:top-6">
				<LanguageToggle variant="dark" />
			</div>

			<AuthCardShell mode={mode} variant="page">
				{children}
			</AuthCardShell>
		</main>
	);
}

export function AuthPageShell(props: AuthPageShellProps) {
	return (
		<Suspense
			fallback={
				<main className="flex min-h-screen items-center justify-center bg-slate-950/80">
					<div className="h-12 w-12 animate-pulse rounded-full bg-white/10" />
				</main>
			}
		>
			<AuthPageShellBody {...props} />
		</Suspense>
	);
}
