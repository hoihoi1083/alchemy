"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { useLocale } from "@/components/LocaleProvider";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

type AuthMode = "sign-in" | "sign-up";

type OpenAuthModalOptions = {
	mode?: AuthMode;
	redirectUrl?: string;
};

type AuthModalContextValue = {
	openAuthModal: (options?: OpenAuthModalOptions) => void;
	closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

function AuthModalOverlay({
	mode,
	redirectUrl,
	onClose,
	onModeChange,
}: {
	mode: AuthMode;
	redirectUrl: string;
	onClose: () => void;
	onModeChange: (mode: AuthMode) => void;
}) {
	const { m } = useLocale();
	const [wide, setWide] = useState(true);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		const sync = () => setWide(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
			role="dialog"
			aria-modal="true"
			aria-label={mode === "sign-in" ? m.auth.signInTab : m.auth.signUpTab}
			onClick={onClose}
		>
			<div
				className="relative"
				style={
					wide
						? { width: "50vw", minWidth: "50vw", maxWidth: "50vw", flexShrink: 0 }
						: { width: "92vw", maxWidth: "92vw" }
				}
				onClick={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm text-white shadow-lg transition hover:bg-neutral-800"
					aria-label={m.auth.closeModal}
				>
					×
				</button>
				<AuthCardShell
					mode={mode}
					variant="modal"
					onModeChange={onModeChange}
				>
					{mode === "sign-in" ? (
						<SignIn
							key="sign-in"
							appearance={clerkAuthAppearance}
							forceRedirectUrl={redirectUrl}
							fallbackRedirectUrl={redirectUrl}
						/>
					) : (
						<SignUp
							key="sign-up"
							appearance={clerkAuthAppearance}
							forceRedirectUrl="/start?welcome=1"
							fallbackRedirectUrl="/start?welcome=1"
						/>
					)}
				</AuthCardShell>
			</div>
		</div>
	);
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
	const { isSignedIn, isLoaded } = useAuth();
	const [state, setState] = useState<{
		open: boolean;
		mode: AuthMode;
		redirectUrl: string;
	}>({ open: false, mode: "sign-in", redirectUrl: "/" });

	const closeAuthModal = useCallback(() => {
		setState((current) => ({ ...current, open: false }));
	}, []);

	const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
		setState({
			open: true,
			mode: options?.mode ?? "sign-in",
			redirectUrl:
				options?.redirectUrl ??
				window.location.pathname + window.location.search,
		});
	}, []);

	useEffect(() => {
		if (isLoaded && isSignedIn && state.open) {
			closeAuthModal();
		}
	}, [isLoaded, isSignedIn, state.open, closeAuthModal]);

	return (
		<AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
			{children}
			{state.open ? (
				<AuthModalOverlay
					mode={state.mode}
					redirectUrl={state.redirectUrl}
					onClose={closeAuthModal}
					onModeChange={(mode) => setState((current) => ({ ...current, mode }))}
				/>
			) : null}
		</AuthModalContext.Provider>
	);
}

export function useAuthModal() {
	const context = useContext(AuthModalContext);
	if (!context) {
		throw new Error("useAuthModal must be used within AuthModalProvider");
	}
	return context;
}
