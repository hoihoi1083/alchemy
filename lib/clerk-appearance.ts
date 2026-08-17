import { BRAND_PURPLE, PRODUCT_LOGO_SRC, productSiteUrl } from "@/lib/brand";

function clerkLogoUrl(): string {
	return `${productSiteUrl()}${PRODUCT_LOGO_SRC}`;
}

const clerkBaseAppearance = {
	variables: {
		colorPrimary: BRAND_PURPLE,
		borderRadius: "0.625rem",
		fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
		colorText: "#0f172a",
		colorTextSecondary: "#64748b",
		colorInputBackground: "#ffffff",
		colorInputText: "#0f172a",
	},
	layout: {
		logoImageUrl: clerkLogoUrl(),
		logoPlacement: "inside" as const,
		socialButtonsPlacement: "bottom" as const,
		socialButtonsVariant: "blockButton" as const,
	},
	elements: {
		formButtonPrimary: {
			backgroundColor: BRAND_PURPLE,
			fontSize: "0.9375rem",
			fontWeight: "600",
			padding: "0.625rem 1rem",
			"&:hover": {
				backgroundColor: "#5B32E6",
			},
		},
		socialButtonsBlockButton: {
			borderColor: "#e2e8f0",
			height: "2.5rem",
		},
		socialButtonsRoot: {
			overflow: "visible",
			paddingTop: "1.25rem",
		},
		lastAuthenticationStrategyBadge: {
			fontSize: "0.6875rem",
			right: "0.5rem",
			top: "0",
			zIndex: 2,
		},
		formFieldInput: {
			borderColor: "#e2e8f0",
			fontSize: "0.9375rem",
		},
		formFieldLabel: {
			fontSize: "0.8125rem",
			fontWeight: "500",
			color: "#334155",
		},
		footerActionLink: {
			color: BRAND_PURPLE,
			fontWeight: "500",
		},
		dividerLine: {
			backgroundColor: "#e2e8f0",
		},
		dividerText: {
			color: "#94a3b8",
			fontSize: "0.75rem",
		},
	},
};

/** Modal / default Clerk chrome — shows flask logo. */
export const clerkAppearance = {
	...clerkBaseAppearance,
	elements: {
		...clerkBaseAppearance.elements,
		headerTitle: { display: "none" },
		logoBox: {
			height: "3rem",
			justifyContent: "center",
		},
		logoImage: {
			height: "2.5rem",
			width: "auto",
		},
	},
};

/** Branded auth shell — our card supplies logo, tabs, subtitle. */
export const clerkAuthAppearance = {
	...clerkBaseAppearance,
	elements: {
		...clerkBaseAppearance.elements,
		rootBox: {
			width: "100%",
			maxWidth: "100%",
			boxShadow: "none",
		},
		cardBox: {
			width: "100%",
			maxWidth: "100%",
			boxShadow: "none",
		},
		card: {
			width: "100%",
			maxWidth: "100%",
			boxShadow: "none",
			border: "none",
			backgroundColor: "transparent",
			padding: "0",
			gap: "0.75rem",
		},
		header: { display: "none" },
		logoBox: { display: "none" },
		headerTitle: { display: "none" },
		headerSubtitle: { display: "none" },
		modalCloseButton: { display: "none" },
		main: { gap: "0.75rem" },
		form: { gap: "0.75rem" },
		formFieldRow: { marginBottom: "0" },
		footer: {
			display: "none",
		},
		footerAction: { display: "none" },
		identityPreview: { display: "none" },
	},
};
