import Link from "next/link";
import {
	PRODUCT_LOGO_SRC,
	PRODUCT_NAME,
	PRODUCT_WORDMARK_ALT,
	PRODUCT_WORDMARK_BLACK_SRC,
	PRODUCT_WORDMARK_WHITE_SRC,
} from "@/lib/brand";

type AuthBrandLockupProps = {
	/** Dark text on light auth cards; light text on dark panels. */
	variant?: "light" | "dark";
	className?: string;
	href?: string;
	/** Accessible label for the link lockup. */
	ariaLabel?: string;
};

/** Flask mark + stacked Alchemy / AI Lab wordmark (same asset as landing float CTA / footer). */
export function AuthBrandLockup({
	variant = "light",
	className = "",
	href,
	ariaLabel = PRODUCT_WORDMARK_ALT,
}: AuthBrandLockupProps) {
	const wordmarkSrc =
		variant === "dark"
			? `${PRODUCT_WORDMARK_WHITE_SRC}?v=2`
			: `${PRODUCT_WORDMARK_BLACK_SRC}?v=2`;

	const inner = (
		<>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={PRODUCT_LOGO_SRC}
				alt=""
				className="brand-mark h-10 w-10 shrink-0 object-contain"
			/>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={wordmarkSrc}
				alt={PRODUCT_NAME}
				className="brand-wordmark h-8 w-auto max-w-[9.5rem] object-contain object-left sm:h-9 sm:max-w-[11rem]"
			/>
		</>
	);

	const base = `inline-flex items-center gap-2.5 sm:gap-3 ${className}`;

	if (href) {
		return (
			<Link href={href} className={`${base} hover:opacity-90`} aria-label={ariaLabel}>
				{inner}
			</Link>
		);
	}

	return (
		<div className={base} aria-label={ariaLabel}>
			{inner}
		</div>
	);
}
