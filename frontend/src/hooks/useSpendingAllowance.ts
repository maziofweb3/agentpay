"use client";

import { useCallback, useEffect, useState } from "react";
import { atomicToUsd, formatAtomicUsdt, usdToAtomic } from "@/lib/pricing";

const STORAGE_PREFIX = "agentpay:usdt-allowance:";

export interface AllowanceState {
  /** Remaining spendable USDT budget in atomic units (6 decimals). */
  remainingAtomic: bigint;
  remainingUsd: number;
  remainingFormatted: string;
  /** True once we've loaded from localStorage (client-only). */
  ready: boolean;
}

function storageKey(address: string, chainId: number): string {
  return `${STORAGE_PREFIX}${chainId}:${address.toLowerCase()}`;
}

const ZERO = BigInt(0);

function readAtomic(address: string | null, chainId: number): bigint {
  if (!address || typeof window === "undefined") return ZERO;
  try {
    const raw = window.localStorage.getItem(storageKey(address, chainId));
    if (!raw) return ZERO;
    const value = BigInt(raw);
    return value < ZERO ? ZERO : value;
  } catch {
    return ZERO;
  }
}

function writeAtomic(address: string, chainId: number, amount: bigint): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(address, chainId), amount.toString());
}

/**
 * Client-side USDT spending budget for AgentPay tools.
 *
 * x402 settles each call with an EIP-3009 signature for the exact service price.
 * This hook tracks a user-chosen budget so the UI can:
 *  1. Prompt once for a desired total stablecoin budget
 *  2. Deduct per successful paid request
 *  3. Re-prompt when the budget is exhausted
 *
 * Only USDT is tracked — native BOT is never part of the payment budget.
 * Mutations always re-read localStorage so concurrent grant/consume calls stay consistent.
 */
export function useSpendingAllowance(address: string | null, chainId: number = 968) {
  const [remainingAtomic, setRemainingAtomic] = useState<bigint>(ZERO);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setRemainingAtomic(readAtomic(address, chainId));
  }, [address, chainId]);

  useEffect(() => {
    refresh();
    setReady(true);
  }, [refresh]);

  const hasEnough = useCallback(
    (priceAtomic: bigint) => readAtomic(address, chainId) >= priceAtomic,
    [address, chainId]
  );

  /** Add to the remaining budget (user just approved more USDT). Returns new total. */
  const grant = useCallback(
    (amountUsd: number): bigint => {
      if (!address || amountUsd <= 0) return readAtomic(address, chainId);
      const current = readAtomic(address, chainId);
      const next = current + usdToAtomic(amountUsd);
      writeAtomic(address, chainId, next);
      setRemainingAtomic(next);
      return next;
    },
    [address, chainId]
  );

  /** Set the remaining budget absolutely (overwrite). */
  const setBudgetUsd = useCallback(
    (amountUsd: number): bigint => {
      if (!address) return ZERO;
      const next = amountUsd <= 0 ? ZERO : usdToAtomic(amountUsd);
      writeAtomic(address, chainId, next);
      setRemainingAtomic(next);
      return next;
    },
    [address, chainId]
  );

  /** Deduct after a successful paid request. Returns false if insufficient. */
  const consume = useCallback(
    (priceAtomic: bigint): boolean => {
      if (!address) return false;
      const current = readAtomic(address, chainId);
      if (current < priceAtomic) return false;
      const next = current - priceAtomic;
      writeAtomic(address, chainId, next);
      setRemainingAtomic(next);
      return true;
    },
    [address, chainId]
  );

  const clear = useCallback(() => {
    if (!address) return;
    writeAtomic(address, chainId, ZERO);
    setRemainingAtomic(ZERO);
  }, [address, chainId]);

  const state: AllowanceState = {
    remainingAtomic,
    remainingUsd: atomicToUsd(remainingAtomic),
    remainingFormatted: formatAtomicUsdt(remainingAtomic),
    ready,
  };

  return {
    ...state,
    hasEnough,
    grant,
    setBudgetUsd,
    consume,
    clear,
    refresh,
  };
}
