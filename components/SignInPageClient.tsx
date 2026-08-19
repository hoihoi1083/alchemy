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

	return (
		<AuthPageShell mode="sign-in">
			<SignIn
				appearance={clerkAuthAppearance}
				routing="path"
				path="/sign-in"
				signUpUrl="/sign-up"
				fallbackRedirectUrl="/start"
			/>
		</AuthPageShell>
	);
}
