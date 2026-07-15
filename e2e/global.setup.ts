import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { hasClerkE2eAuth } from "./clerk-env";

setup("clerk testing token", async () => {
  // CI passes pk_test_ci_placeholder / sk_test_ci_placeholder when GitHub secrets
  // are missing — clerkSetup() would fail. Only initialize with real keys + E2E user.
  if (!hasClerkE2eAuth()) {
    return;
  }
  await clerkSetup();
});
