"use client";

import { useEffect, useState, useCallback } from "react";
import { formatUnits, isAddress, parseAbiItem } from "viem";
import { getPublicClient } from "@/lib/chains";
import {
  AGENT_PAY_REGISTRY_ABI,
  ERC20_ABI,
  getRegistryAddress,
  USDC_ADDRESS_ARC,
} from "@/lib/contracts";

export interface OnChainEventRecord {
  id: string;
  txHash: string;
  blockNumber: bigint;
  user: string;
  agentId: string;
  toolType: string;
  amountPaid: string;
  amountNumeric: number;
  paymentAsset: string;
  timestamp: number;
  formattedDate: string;
}

export interface ContractHistoryState {
  userPrompts: number;
  totalPrompts: number;
  totalVolumeUsdc: string;
  vaultBalanceUsdc: string;
  events: OnChainEventRecord[];
  registryAddress: `0x${string}`;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useContractHistory(
  address: string | null | undefined,
  chainId: number = 5042
): ContractHistoryState {
  const [userPrompts, setUserPrompts] = useState<number>(0);
  const [totalPrompts, setTotalPrompts] = useState<number>(0);
  const [totalVolumeUsdc, setTotalVolumeUsdc] = useState<string>("0.0000");
  const [vaultBalanceUsdc, setVaultBalanceUsdc] = useState<string>("0.00");
  const [events, setEvents] = useState<OnChainEventRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const registryAddress = getRegistryAddress(chainId);

  const fetchContractData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const client = getPublicClient(chainId);

      // 1. Parallel contract reads
      const reads = await Promise.allSettled([
        // Global total prompts recorded
        client.readContract({
          address: registryAddress,
          abi: AGENT_PAY_REGISTRY_ABI,
          functionName: "totalPromptsRecorded",
        }),
        // User prompt count
        address && isAddress(address)
          ? client.readContract({
              address: registryAddress,
              abi: AGENT_PAY_REGISTRY_ABI,
              functionName: "userPromptCounts",
              args: [address as `0x${string}`],
            })
          : Promise.resolve(BigInt(0)),
        // Total volume per asset for USDC
        client.readContract({
          address: registryAddress,
          abi: AGENT_PAY_REGISTRY_ABI,
          functionName: "totalVolumePerAsset",
          args: [USDC_ADDRESS_ARC],
        }),
        // Vault USDC balance
        client.readContract({
          address: USDC_ADDRESS_ARC,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [registryAddress],
        }),
      ]);

      const globalPromptsRaw =
        reads[0].status === "fulfilled" ? (reads[0].value as bigint) : BigInt(0);
      const userPromptsRaw =
        reads[1].status === "fulfilled" ? (reads[1].value as bigint) : BigInt(0);
      const volumeRaw =
        reads[2].status === "fulfilled" ? (reads[2].value as bigint) : BigInt(0);
      const vaultBalRaw =
        reads[3].status === "fulfilled" ? (reads[3].value as bigint) : BigInt(0);

      setTotalPrompts(Number(globalPromptsRaw));
      setUserPrompts(Number(userPromptsRaw));
      setTotalVolumeUsdc(Number(formatUnits(volumeRaw, 6)).toFixed(4));
      setVaultBalanceUsdc(Number(formatUnits(vaultBalRaw, 6)).toFixed(2));

      // 2. Query on-chain PromptRecorded event logs
      try {
        const promptEvent = parseAbiItem(
          "event PromptRecorded(address indexed user, string agentId, string toolType, uint256 amountPaid, address indexed paymentAsset, uint256 timestamp)"
        );

        const logs = await client.getLogs({
          address: registryAddress,
          event: promptEvent,
          args:
            address && isAddress(address)
              ? { user: address as `0x${string}` }
              : undefined,
          fromBlock: "earliest",
        });

        const parsedEvents: OnChainEventRecord[] = logs.map((log, idx) => {
          const rawAmount = log.args.amountPaid ? log.args.amountPaid : BigInt(0);
          const numericAmount = Number(formatUnits(rawAmount, 6));
          const timestampSec = log.args.timestamp
            ? Number(log.args.timestamp)
            : Math.floor(Date.now() / 1000);

          return {
            id: `${log.transactionHash}-${log.logIndex ?? idx}`,
            txHash: log.transactionHash || "",
            blockNumber: log.blockNumber || BigInt(0),
            user: log.args.user || "",
            agentId: log.args.agentId || "agentpay-ai",
            toolType: log.args.toolType || "AI Service",
            amountPaid: `${numericAmount.toFixed(4)} USDC`,
            amountNumeric: numericAmount,
            paymentAsset: log.args.paymentAsset || USDC_ADDRESS_ARC,
            timestamp: timestampSec,
            formattedDate: new Date(timestampSec * 1000).toLocaleString(),
          };
        });

        // Sort latest first
        parsedEvents.reverse();
        setEvents(parsedEvents);
      } catch (logErr) {
        console.warn("[useContractHistory] Unable to fetch logs (from earliest):", logErr);
        setEvents([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useContractHistory] Contract read error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [address, chainId, registryAddress]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchContractData();
  }, [fetchContractData]);

  return {
    userPrompts,
    totalPrompts,
    totalVolumeUsdc,
    vaultBalanceUsdc,
    events,
    registryAddress,
    loading,
    error,
    refetch: fetchContractData,
  };
}
