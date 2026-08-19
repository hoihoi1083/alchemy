import { redirect } from "next/navigation";

type SsoCallbackPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

function safeInternalRedirect(value: string | undefined): string | null {
  if (!value) return null;
  const next = value.trim();
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  return next;
}

export default async function SsoCallbackPage({
  searchParams,
}: SsoCallbackPageProps) {
  const params = await searchParams;
  redirect(safeInternalRedirect(params.redirect_url) ?? "/start");
}
