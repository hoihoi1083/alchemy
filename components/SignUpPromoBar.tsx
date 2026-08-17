"use client";

import { useAuth } from "@clerk/nextjs";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useLocale } from "@/components/LocaleProvider";

/** Slim black bar under site header — visible only when signed out. */
export function SignUpPromoBar() {
	const { isSignedIn, isLoaded } = useAuth();
	const { openAuthModal } = useAuthModal();
	const { m } = useLocale();

	if (!isLoaded || isSignedIn) return null;

	return (
		<button
			type="button"
			onClick={() => openAuthModal({ mode: "sign-up" })}
			className="block w-full bg-black px-3 py-2 text-center text-xs font-medium tracking-wide text-white transition-colors hover:bg-neutral-900 sm:py-2.5 sm:text-sm"
		>
			{m.auth.signupPromoBar}
		</button>
	);
}
