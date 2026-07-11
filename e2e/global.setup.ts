import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

setup("clerk testing token", async () => {
  if (!process.env.CLERK_SECRET_KEY?.trim()) {
    return;
  }
  await clerkSetup();
});
