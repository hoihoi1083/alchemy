"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/** Save Clerk user to MongoDB as soon as they sign in (not only on generate). */
export function SyncUserOnAuth() {
  const { isSignedIn, isLoaded } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synced.current) return;

    synced.current = true;
    void fetch("/api/me").then((res) => {
      if (!res.ok) synced.current = false;
    });
  }, [isLoaded, isSignedIn]);

  return null;
}
