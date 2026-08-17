"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export function SignInPageClient() {
	return (
		<AuthPageShell mode="sign-in">
			<SignIn
				appearance={clerkAuthAppearance}
				routing="path"
				path="/sign-in"
				signUpUrl="/sign-up"
			/>
		</AuthPageShell>
	);
}
