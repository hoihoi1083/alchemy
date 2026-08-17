import Link from "next/link";
import {
	PRODUCT_LOGO_ALT,
	PRODUCT_LOGO_SRC,
	PRODUCT_NAME,
} from "@/lib/brand";

type AuthBrandLockupProps = {
	/** Dark text on light auth cards; light text on dark panels. */
	variant?: "light" | "dark";
	className?: string;
	href?: string;
	/** Accessible label for the link lockup. */
	ariaLabel?: string;
};

/** Flask icon + Alchemy AI Lab wordmark. */
export function AuthBrandLockup({
	variant = "light",
	className = "",
	href,
	ariaLabel = PRODUCT_LOGO_ALT,
}: AuthBrandLockupProps) {
	const textClass =
		variant === "dark" ? "text-white" : "text-slate-900";

	const inner = (
		<>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={PRODUCT_LOGO_SRC}
				alt=""
				className="h-10 w-10 shrink-0 object-contain"
			/>
			<span
				className={`text-lg font-bold leading-tight tracking-tight ${textClass}`}
			>
				{PRODUCT_NAME}
			</span>
		</>
	);

	const base = `inline-flex items-center gap-3 ${className}`;

	if (href) {
		return (
			<Link href={href} className={`${base} hover:opacity-90`} aria-label={ariaLabel}>
				{inner}
			</Link>
		);
	}

	return <div className={base}>{inner}</div>;
}
