import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/how(.*)",
  "/pricing(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/refund(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
  // Stripe webhooks have no Clerk session — verified via stripe-signature.
  "/api/stripe/webhook(.*)",
]);

/** Beta/orphan surfaces — hidden unless NEXT_PUBLIC_ENABLE_BETA_SURFACES=1 */
const isHiddenBetaRoute = createRouteMatcher(["/captions/visual(.*)", "/ugc(.*)"]);

function betaSurfacesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_BETA_SURFACES?.trim() === "1";
}

export default clerkMiddleware(async (auth, req) => {
  if (isHiddenBetaRoute(req) && !betaSurfacesEnabled()) {
    const target = req.nextUrl.pathname.startsWith("/ugc") ? "/studio" : "/captions";
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (isPublicRoute(req)) return;

  const { userId } = await auth();
  if (!userId) {
    const signIn = new URL("/sign-in", req.url);
    // Pass path-only redirect target to avoid baking in a specific host (e.g. `www.`).
    // SignInPageClient will do `router.replace(redirectUrl)`.
    signIn.searchParams.set(
      "redirect_url",
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );
    return NextResponse.redirect(signIn);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mov)).*)",
    "/(api|trpc)(.*)",
  ],
};
