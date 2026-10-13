"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useX402Payment } from "@/hooks/useX402Payment";
import { SERVICE_PRICES, ServiceKey } from "@/lib/pricing";
import { getApiUrl } from "@/lib/environment";

/**
 * Pay-per-prompt orchestration (no prepaid deposits / no budget modal).
 * Each tool call: 402 challenge → EIP-3009 USDC on Arc → retry.
 */
export function usePaidService(service: ServiceKey) {
  const pricing = SERVICE_PRICES[service];
  const apiUrl = getApiUrl();
  const {
    address,
    ready,
    authenticated,
    isTestnet,
    currentChainId,
    connectWallet,
    getProvider,
    primaryWallet,
    isArc,
    switchOrAddChain,
  } = useWallet();
  const {
    executePaidRequest,
    loading: paymentLoading,
    error: paymentError,
    clearError,
    txHash,
    paymentStep,
    formattedAmount,
  } = useX402Payment();

  const [settling, setSettling] = useState(false);

  const runPaid = useCallback(
    async <T = unknown>(body: unknown): Promise<T> => {
      clearError();

      if (ready && (!authenticated || !address)) {
        try {
          await connectWallet();
        } catch {
          /* continue — wallet may still inject for payment */
        }
      }

      if (ready && authenticated && !address) {
        throw new Error(
          "Wallet is connected to Privy but no address is available yet. Wait a moment and retry."
        );
      }

      setSettling(true);
      try {
        const url = `${apiUrl}${pricing.path}`;
        console.info("[agentpay] settle (pay-per-prompt)", service, url);

        const provider = await getProvider();
        const switchChain = primaryWallet
          ? async (chainId: number) => {
              await primaryWallet.switchChain(chainId);
            }
          : async (chainId: number) => {
              await switchOrAddChain(chainId);
            };

        return (await executePaidRequest(
          url,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Chain-Id": String(currentChainId),
              "X-Network": `eip155:${currentChainId}`,
            },
            body: JSON.stringify(body),
          },
          {
            preferTestnet: isTestnet,
            provider: provider ?? null,
            account: address,
            chainId: currentChainId,
            switchChain,
          }
        )) as T;
      } finally {
        setSettling(false);
      }
    },
    [
      ready,
      authenticated,
      address,
      connectWallet,
      clearError,
      apiUrl,
      pricing.path,
      service,
      getProvider,
      primaryWallet,
      switchOrAddChain,
      executePaidRequest,
      isTestnet,
    ]
  );

  return {
    address,
    authenticated,
    ready,
    isTestnet,
    isArc,
    currentChainId,
    connectWallet,
    pricing,
    runPaid,
    loading: paymentLoading || settling,
    error: paymentError,
    clearError,
    txHash,
    paymentStep,
    formattedAmount,
    // Kept for page compatibility; no prepaid modal in this mode.
    modalOpen: false,
    closeModal: () => {},
    confirmBudgetAndPay: async () => {},
    allowance: {
      remainingUsd: 0,
      remainingFormatted: "$0.00 USDT",
      remainingAtomic: BigInt(0),
      ready: true,
      hasEnough: () => false,
      grant: () => BigInt(0),
      setBudgetUsd: () => BigInt(0),
      consume: () => false,
      clear: () => {},
      refresh: () => {},
    },
    sessionRemaining: null,
    sessionRemainingFormatted: null,
  };
}
