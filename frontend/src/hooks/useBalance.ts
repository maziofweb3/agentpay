"use client";

import { useEffect, useState, useCallback } from "react";
import { createPublicClient, formatUnits, http, isAddress } from "viem";
import { botChain, chainById, isArcChainId, rpcUrlFor } from "@/lib/chains";
import { TOKENS, ERC20_ABI } from "@/lib/tokens";
import { getExpectedChainId } from "@/lib/environment";

export interface BalanceState {
  botBalance: string;
  apayBalance: string;
  usdcBalance: string;
  usdtBalance: string;
  bousdtBalance: string;
  paymentBalance: string;
  paymentSymbol: "USDC" | "APAY";
  isLoading: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useBalance(address: string | null | undefined, chainId?: number): BalanceState {
  const [botBalance, setBotBalance] = useState<string>("0.00");
  const [apayBalance, setApayBalance] = useState<string>("0.00");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [usdtBalance, setUsdtBalance] = useState<string>("0.00");
  const [bousdtBalance, setBousdtBalance] = useState<string>("0.00");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const resolvedChainId = chainId && Number.isFinite(chainId) ? chainId : getExpectedChainId();
  const onArc = isArcChainId(resolvedChainId);
  const paymentSymbol: "USDC" | "APAY" = onArc ? "USDC" : "APAY";

  const fetchBalances = useCallback(async () => {
    if (!address || typeof window === "undefined") return;

    setIsLoading(true);

    try {
      const chain = chainById(resolvedChainId);
      const client = createPublicClient({
        chain,
        transport: http(rpcUrlFor(resolvedChainId)),
      });

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
        } catch (err) {
          console.warn(`[useBalance] Skipping un-deployed or failing token at ${tokenAddr}:`, err);
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

      if (isArcChainId(resolvedChainId)) {
        const usdcRaw = await safeReadContract(TOKENS.arc.USDC);
        const usdc = Number(formatUnits(usdcRaw, 6)).toFixed(4);
        setUsdcBalance(usdc);
        setApayBalance("0.00");
        setBotBalance("0.00");
        setUsdtBalance("0.00");
        setBousdtBalance("0.00");
      } else {
        const isMainnet = resolvedChainId === botChain.id;
        const tokenConfig = isMainnet ? TOKENS.botChainMainnet : TOKENS.botChainTestnet;
        const [botRaw, apayRaw, usdtRaw, bousdtRaw] = await Promise.all([
          safeGetBalance(address as `0x${string}`),
          safeReadContract(tokenConfig.APAY),
          safeReadContract(tokenConfig.USDT),
          isMainnet && TOKENS.botChainMainnet.BOUSDT
            ? safeReadContract(TOKENS.botChainMainnet.BOUSDT)
            : Promise.resolve(BigInt(0)),
        ]);

        setBotBalance(Number(formatUnits(botRaw, 18)).toFixed(4));
        setApayBalance(Number(formatUnits(apayRaw, 18)).toFixed(2));
        setUsdtBalance(Number(formatUnits(usdtRaw, 6)).toFixed(2));
        setBousdtBalance(Number(formatUnits(bousdtRaw, 6)).toFixed(2));
        setUsdcBalance("0.00");
      }
    } catch (err) {
      console.error("[useBalance] Error fetching balances:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address, resolvedChainId]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return {
    botBalance,
    apayBalance,
    usdcBalance,
    usdtBalance,
    bousdtBalance,
    paymentBalance: onArc ? usdcBalance : apayBalance,
    paymentSymbol,
    isLoading,
    loading: isLoading,
    refetch: fetchBalances,
  };
}
