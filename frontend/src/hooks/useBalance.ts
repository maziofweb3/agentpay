"use client";

import { useEffect, useState, useCallback } from "react";
import { formatUnits, isAddress } from "viem";
import { getPublicClient } from "@/lib/chains";
import { ERC20_ABI, getArcTokens } from "@/lib/tokens";
import { getExpectedChainId } from "@/lib/environment";

export interface BalanceState {
  botBalance: string;
  apayBalance: string;
  usdcBalance: string;
  usdtBalance: string;
  bousdtBalance: string;
  paymentBalance: string;
  paymentSymbol: "USDC";
  isLoading: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useBalance(address: string | null | undefined, chainId?: number): BalanceState {
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const resolvedChainId = chainId && Number.isFinite(chainId) ? chainId : getExpectedChainId();

  const fetchBalances = useCallback(async () => {
    if (!address || !isAddress(address) || typeof window === "undefined") {
      setUsdcBalance("0.00");
      return;
    }

    setIsLoading(true);

    try {
      const client = getPublicClient(resolvedChainId);

      async function safeReadContract(tokenAddr: string): Promise<bigint> {
        if (!tokenAddr || !isAddress(tokenAddr)) {
          return BigInt(0);
        }
        try {
          return await client.readContract({
            address: tokenAddr as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
          console.warn(`[useBalance] Unable to read balance for ${tokenAddr}: ${msg}`);
          return BigInt(0);
        }
      }

      async function safeGetBalance(userAddr: `0x${string}`): Promise<bigint> {
        try {
          return await client.getBalance({ address: userAddr });
        } catch {
          return BigInt(0);
        }
      }

      const arcTokens = getArcTokens(resolvedChainId);
      const [erc20Raw, nativeRaw] = await Promise.all([
        safeReadContract(arcTokens.USDC),
        safeGetBalance(address as `0x${string}`),
      ]);
      // Arc dual-view: USDC is exposed as both an ERC-20 (6 decimals) and
      // native gas (18 decimals). Both views represent the same underlying balance.
      // Convert native 18-decimal units to 6-decimal ERC-20 scale
      const nativeAsErc20 = nativeRaw / BigInt(1e12);
      // Use the larger of the two views
      const usdcRaw = erc20Raw > nativeAsErc20 ? erc20Raw : nativeAsErc20;
      const usdc = Number(formatUnits(usdcRaw, 6)).toFixed(4);
      setUsdcBalance(usdc);
    } catch (err) {
      console.error("[useBalance] Error fetching balances:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address, resolvedChainId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBalances();
    const interval = setInterval(() => { void fetchBalances(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return {
    botBalance: "0.00",
    apayBalance: "0.00",
    usdcBalance,
    usdtBalance: "0.00",
    bousdtBalance: "0.00",
    paymentBalance: usdcBalance,
    paymentSymbol: "USDC",
    isLoading,
    loading: isLoading,
    refetch: fetchBalances,
  };
}
