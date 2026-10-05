"use client";

import { useEffect } from "react";
import { getAbsoluteApiUrl } from "@/lib/environment";

/**
 * Fires a silent GET /health request immediately on page mount.
 *
 * Purpose: warm up the Render free-tier backend before the user submits a
 * paid request. Render free services spin down after 15 min of inactivity
 * and take 30–60 s to restart. This warmup runs in parallel with the user's
 * natural think time (reading UI, typing a prompt, connecting wallet).
 *
 * The /health route is proxied by Next.js rewrites in next.config.ts, so
 * this works in both dev (relative URL) and production (absolute Render URL)
 * without any CORS issues.
 *
 * Completely silent — no UI state, no error reporting, best-effort only.
 */
export function useBackendWarmup(): void {
  useEffect(() => {
    const controller = new AbortController();

    // In the browser getApiUrl() returns "" (same-origin via Next.js rewrite).
    // Use absolute URL here so the warmup call goes directly to Render even
    // when the Next.js middleware is bypassed (e.g. during static export).
    const base =
      typeof window !== "undefined"
        ? "" // same-origin rewrite → /health
        : getAbsoluteApiUrl();

    fetch(`${base}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => {
      // Intentionally swallowed — warmup is best-effort, not critical path.
    });

    return () => controller.abort();
  }, []); // Runs once on mount only
}
