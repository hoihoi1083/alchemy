"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

function safeInternalRedirect(value: string | null): string | null {
	if (!value) return null;
	const next = value.trim();
	if (!next.startsWith("/")) return null;
	if (next.startsWith("//")) return null;
	return next;
}

function SignUpForm() {
	const searchParams = useSearchParams();
	const redirectUrl =
		safeInternalRedirect(searchParams.get("redirect_url")) ?? "/";
	return (
		<SignUp
			appearance={clerkAuthAppearance}
			routing="path"
			path="/sign-up"
			signInUrl="/sign-in"
			fallbackRedirectUrl={redirectUrl}
			forceRedirectUrl={redirectUrl}
		/>
	);
}

export function SignUpPageClient() {
	return (
		<AuthPageShell mode="sign-up">
			<Suspense fallback={null}>
				<SignUpForm />
			</Suspense>
		</AuthPageShell>
	);
}
