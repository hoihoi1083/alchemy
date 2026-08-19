"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export function SignUpPageClient() {
	return (
		<AuthPageShell mode="sign-up">
			<SignUp
				appearance={clerkAuthAppearance}
				routing="path"
				path="/sign-up"
				signInUrl="/sign-in"
				fallbackRedirectUrl="/"
				forceRedirectUrl="/"
			/>
		</AuthPageShell>
	);
}
