import { isR2Configured } from "@/lib/storage/r2";
import { isProductionEnv } from "@/lib/mongodb-production";

/** In production, R2 is required for durable library media. */
export function isR2Required(): boolean {
  return isProductionEnv();
}

export function isR2Ready(): boolean {
  if (!isR2Required()) return true;
  return isR2Configured();
}

export function r2RequiredErrorMessage(): string {
  return "Cloud storage (R2) is required in production. Media cannot be saved to My library without it.";
}
