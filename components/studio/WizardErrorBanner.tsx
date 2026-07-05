"use client";

type WizardErrorBannerProps = {
  message: string;
  variant?: "light" | "dark";
};

export function WizardErrorBanner({ message, variant = "light" }: WizardErrorBannerProps) {
  const classes =
    variant === "dark"
      ? "rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
      : "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800";

  return <div className={classes}>{message}</div>;
}
