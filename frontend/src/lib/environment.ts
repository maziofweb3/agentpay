/**
 * Environment and network-mode helpers.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so a production bundle cannot be flipped
 * into development mode at runtime.
 */

export type AppEnvironment = "development" | "production";

export function getEnvironment(): AppEnvironment {
  return process.env.NEXT_PUBLIC_ENVIRONMENT === "production" ? "production" : "development";
}

/**
 * Expected default chain ID:
 * Production  -> 5042 (Arc Mainnet)
 * Development -> 5042002 (Arc Testnet)
 */
export function getExpectedChainId(): number {
  const override = process.env.NEXT_PUBLIC_DEFAULT_CHAIN;
  if (override === "botchain") {
    return getEnvironment() === "production" ? 677 : 968;
  }
  return getEnvironment() === "production" ? 5042 : 5042002;
}

export function isExpectedTestnet(): boolean {
  return getEnvironment() !== "production";
}

/**
 * Base URL for the Hono API used by browser `fetch`.
 *
 * In the browser we always use same-origin relative URLs (`""` → `/api/...`).
 * Next.js rewrites proxy those to the real gateway (NEXT_PUBLIC_API_URL / API_URL).
 *
 * Why not call the API host directly from the browser?
 * Cross-origin responses hide non-CORS-safelisted headers (including x402's
 * `payment-required`) unless Access-Control-Expose-Headers is set. Same-origin
 * rewrites avoid that class of bug entirely.
 *
 * Server-side (SSR / rewrites config) still needs the absolute gateway origin.
 */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }

  const configured = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";
  return configured.replace(/\/$/, "");
}

/**
 * Absolute API origin for tooling that cannot use relative URLs.
 * Prefer getApiUrl() in browser code.
 */
export function getAbsoluteApiUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001").replace(
    /\/$/,
    ""
  );
}

/**
 * Whether the network switcher should be offered.
 *
 * This is UX gating, not a security boundary — client code can always be edited. The binding
 * guarantee is server-side: the API registers only its configured network's payment scheme,
 * so a payload for the other network cannot be settled regardless of what the client does.
 *
 * Client-side only; returns false during SSR. Read it through `useCanSwitchNetwork` so the
 * first client render matches the server output.
 */
export function canSwitchNetwork(): boolean {
  return typeof window !== "undefined";
}
