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
 * 5042 (Arc Mainnet) unconditionally by default.
 * 5042002 (Arc Testnet) if NEXT_PUBLIC_DEFAULT_CHAIN=arc-testnet.
 */
export function getExpectedChainId(): number {
  const override = process.env.NEXT_PUBLIC_DEFAULT_CHAIN;
  if (override === "arc-testnet") {
    return 5042002;
  }
  return 5042; // Arc Mainnet is the absolute default
}

export function isExpectedTestnet(): boolean {
  return getExpectedChainId() === 5042002;
}

/**
 * Base URL for the Hono API used by browser `fetch`.
 *
 * In the browser we always use same-origin relative URLs (`""` → `/api/...`).
 * Next.js rewrites proxy those to the real gateway (NEXT_PUBLIC_API_URL / API_URL).
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

export function canSwitchNetwork(): boolean {
  return typeof window !== "undefined";
}
