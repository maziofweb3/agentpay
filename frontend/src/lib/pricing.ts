/**
 * Service prices. USD cost is chain-agnostic; the 402 challenge is source of truth.
 * Arc settles USDC (6 decimals). BotChain settles $APAY (18 decimals).
 */

import { isArcChainId } from "@/lib/chains";

export const PAYMENT_ASSET = "APAY" as const;
export const PAYMENT_DECIMALS = 18;

/** Per-service prices in APAY atomic units (18 decimals). Must match the API gateway. */
export const SERVICE_PRICES = {
  chat: {
    amountAtomic: BigInt("1000000000000000000"), // 1.0 APAY
    amountTokens: 1.0,
    label: "AI Text Assistant",
    path: "/api/chat",
  },
  image: {
    amountAtomic: BigInt("5000000000000000000"), // 5.0 APAY
    amountTokens: 5.0,
    label: "AI Image Generator",
    path: "/api/image",
  },
  vision: {
    amountAtomic: BigInt("1000000000000000000"), // 1.0 APAY
    amountTokens: 1.0,
    label: "AI Vision Analysis",
    path: "/api/image",
  },
  code: {
    amountAtomic: BigInt("2000000000000000000"), // 2.0 APAY
    amountTokens: 2.0,
    label: "Smart Contract Auditor",
    path: "/api/code",
  },
  relay: {
    amountAtomic: BigInt("1000000000000000000"), // 1.0 APAY
    amountTokens: 1.0,
    label: "BotChain Agent Relay",
    path: "/api/botchain/relay",
  },
} as const;

export type ServiceKey = keyof typeof SERVICE_PRICES;

/** Suggested spending budgets the user can pre-authorize (APAY). */
export const BUDGET_PRESETS_TOKENS = [10, 50, 100, 500] as const;

export function formatApay(tokens: number): string {
  const formatted =
    tokens % 1 === 0
      ? tokens.toFixed(1)
      : Number.isInteger(tokens * 100)
      ? tokens.toFixed(2)
      : tokens.toFixed(4);
  return `${formatted} $APAY`;
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
    return `${atomicWei} $APAY`;
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
    const formatted =
      decimals === 6
        ? tokens.toFixed(4)
        : tokens % 1 === 0
          ? tokens.toFixed(1)
          : tokens.toFixed(4);
    return `${formatted} $${symbol}`;
  } catch {
    return `${amountAtomic} $${symbol}`;
  }
}

/** Display the USD bill as USDC on Arc, APAY tokens on BotChain. */
export function formatServiceCharge(usd: number, apayTokens: number, chainId: number): string {
  if (isArcChainId(chainId)) {
    return `${usd.toFixed(4)} USDC`;
  }
  return formatApay(apayTokens);
}

// Backward compatibility helpers
export const BUDGET_PRESETS_USD = BUDGET_PRESETS_TOKENS;
export const formatUsdt = formatAtomicApay;
export const formatAtomicUsdt = formatAtomicApay;
export const usdToAtomic = tokensToAtomic;
export const atomicToUsd = atomicToTokens;
