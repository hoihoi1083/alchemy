"use client";

import { useAuth } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export function SignInPageClient() {
	const { isSignedIn, isLoaded } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (!isLoaded || !isSignedIn) return;
		const next = searchParams.get("redirect_url") || "/start";
		router.replace(next);
	}, [isLoaded, isSignedIn, searchParams, router]);

	const redirectUrl = searchParams.get("redirect_url") || null;
	// Pass redirect_url to sign-up so brand-new users also land back on the
	// intended destination (e.g. /team/invite?token=...) after creating an account.
	const signUpUrl = redirectUrl
		? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
		: "/sign-up";

	return (
		<AuthPageShell mode="sign-in">
			<SignIn
				appearance={clerkAuthAppearance}
				routing="path"
				path="/sign-in"
				signUpUrl={signUpUrl}
				fallbackRedirectUrl={redirectUrl ?? "/start"}
			/>
		</AuthPageShell>
	);
}
