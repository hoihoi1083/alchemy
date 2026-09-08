import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Legacy `/edit-image` → Magic Layers (`/edit-image-2`).
 * Preserves `image`, `returnTo`, and any other query params.
 */
export default async function EditImageRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") q.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) q.append(key, item);
    }
  }
  const qs = q.toString();
  redirect(qs ? `/edit-image-2?${qs}` : "/edit-image-2");
}
