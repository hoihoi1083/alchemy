import { isMongoConfigured } from "@/lib/mongodb";

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

/** In production, MongoDB is required for project persistence. */
export function isMongoRequired(): boolean {
  return isProductionEnv();
}

export function isMongoReady(): boolean {
  if (!isMongoRequired()) return true;
  return isMongoConfigured();
}

export function mongoRequiredErrorMessage(): string {
  return "MONGODB_URI is required in production for project save and restore.";
}
