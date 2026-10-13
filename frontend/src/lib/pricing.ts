/**
 * Service prices for AgentPay AI on Arc.
 * All payments settle in USDC (6 decimals) via EIP-3009 TransferWithAuthorization.
 */

export const PAYMENT_ASSET = "USDC" as const;
export const PAYMENT_DECIMALS = 6;

/** Per-service prices in USDC atomic units (6 decimals). Must match the API gateway. */
export const SERVICE_PRICES = {
  chat: {
    amountAtomic: BigInt("5800"), // 0.0058 USDC
    amountTokens: 0.0058,
    label: "AI Text Assistant",
    path: "/api/chat",
  },
  image: {
    amountAtomic: BigInt("20000"), // 0.0200 USDC
    amountTokens: 0.0200,
    label: "AI Image Generator",
    path: "/api/image",
  },
  vision: {
    amountAtomic: BigInt("10000"), // 0.0100 USDC
    amountTokens: 0.0100,
    label: "AI Vision Analysis",
    path: "/api/image",
  },
  code: {
    amountAtomic: BigInt("15000"), // 0.0150 USDC
    amountTokens: 0.0150,
    label: "Smart Contract Auditor",
    path: "/api/code",
  },
} as const;

export type ServiceKey = keyof typeof SERVICE_PRICES;

export const BUDGET_PRESETS_TOKENS = [1, 5, 10, 50] as const;

export function formatApay(tokens: number): string {
  return `${tokens.toFixed(4)} USDC`;
}

export function tokensToAtomic(tokens: number): bigint {
  return BigInt(Math.round(tokens * 10 ** PAYMENT_DECIMALS));
}

export function atomicToTokens(amountAtomic: bigint): number {
  return Number(amountAtomic) / 10 ** PAYMENT_DECIMALS;
}

export function formatAtomicApay(amountAtomic: bigint): string {
  return formatApay(atomicToTokens(amountAtomic));
}

export function formatApayAmount(atomicWei: string | bigint): string {
  try {
    const val = typeof atomicWei === "bigint" ? atomicWei : BigInt(atomicWei);
    return formatAtomicApay(val);
  } catch {
    return `${atomicWei} USDC`;
  }
}

export function formatPaymentAtomic(
  amountAtomic: string | bigint,
  decimals: number,
  symbol: string
): string {
  try {
    const val = typeof amountAtomic === "bigint" ? amountAtomic : BigInt(amountAtomic);
    const tokens = Number(val) / 10 ** decimals;
    const formatted = tokens.toFixed(4);
    return `${formatted} ${symbol}`;
  } catch {
    return `${amountAtomic} ${symbol}`;
  }
}

/** Display the charge as USDC on Arc. */
export function formatServiceCharge(usd: number, _tokens?: number, _chainId?: number): string {
  return `${usd.toFixed(4)} USDC`;
}

// Backward compatibility helpers
export const BUDGET_PRESETS_USD = BUDGET_PRESETS_TOKENS;
export const formatUsdt = formatAtomicApay;
export const formatAtomicUsdt = formatAtomicApay;
export const usdToAtomic = tokensToAtomic;
export const atomicToUsd = atomicToTokens;
