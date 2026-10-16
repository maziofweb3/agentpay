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

import { getStoredHistory } from "@/lib/history";

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
  status?: "confirmed" | "confirming";
  nonce?: string;
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
      setTotalVolumeUsdc(Number(formatUnits(volumeRaw, 6)).toFixed(4));
      setVaultBalanceUsdc(Number(formatUnits(vaultBalRaw, 6)).toFixed(2));

      // 2. Query on-chain PromptRecorded event logs with block bounding
      let onChainRecords: OnChainEventRecord[] = [];
      try {
        const promptEvent = parseAbiItem(
          "event PromptRecorded(address indexed user, string agentId, string toolType, uint256 amountPaid, address indexed paymentAsset, uint256 timestamp)"
        );

        // Arc public RPC enforces max range of < 10,000 blocks. 8,000 blocks scans recent activity safely without timeouts.
        const SCAN_BLOCKS = 8_000n;
        const currentBlock = await client.getBlockNumber().catch(() => null);
        const fromBlock =
          currentBlock && currentBlock > SCAN_BLOCKS
            ? currentBlock - SCAN_BLOCKS
            : 0n;

        const logs = await client.getLogs({
          address: registryAddress,
          event: promptEvent,
          args:
            address && isAddress(address)
              ? { user: address as `0x${string}` }
              : undefined,
          fromBlock,
        });

        onChainRecords = logs.map((log, idx) => {
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
            status: "confirmed" as const,
          };
        });
      } catch (logErr) {
        console.warn("[useContractHistory] Unable to fetch on-chain logs:", logErr);
      }

      // 3. Merge optimistic local journal records from localStorage
      const localStored = getStoredHistory();
      const onChainTxSet = new Set(
        onChainRecords.map((r) => r.txHash.toLowerCase()).filter(Boolean)
      );

      const pendingLocalRecords: OnChainEventRecord[] = [];
      for (const rec of localStored) {
        if (rec.txHash && onChainTxSet.has(rec.txHash.toLowerCase())) {
          // Already indexed on chain
          continue;
        }

        const recTimeSec =
          Math.floor(new Date(rec.timestamp).getTime() / 1000) ||
          Math.floor(Date.now() / 1000);

        // Check if an on-chain record matches within 180 seconds with same tool & amount
        const alreadyMatched = onChainRecords.some((oc) => {
          const timeDiff = Math.abs(oc.timestamp - recTimeSec);
          const sameAmount = Math.abs(oc.amountNumeric - rec.amountNumeric) < 0.0001;
          const sameTool =
            oc.toolType.toLowerCase().includes(rec.category.toLowerCase()) ||
            rec.tool.toLowerCase().includes(oc.toolType.toLowerCase());
          return timeDiff < 180 && sameAmount && sameTool;
        });

        if (!alreadyMatched) {
          pendingLocalRecords.push({
            id: rec.id,
            txHash: rec.txHash || "",
            blockNumber: BigInt(0),
            user: address || "",
            agentId: "agentpay-ai",
            toolType:
              rec.tool ||
              (rec.category === "image"
                ? "AI Image Generator"
                : rec.category === "code"
                ? "Smart Contract Auditor"
                : "AI Text Assistant"),
            amountPaid: rec.amount.includes("USDC")
              ? rec.amount
              : `${rec.amountNumeric.toFixed(4)} USDC`,
            amountNumeric: rec.amountNumeric,
            paymentAsset: USDC_ADDRESS_ARC,
            timestamp: recTimeSec,
            formattedDate: new Date(rec.timestamp).toLocaleString(),
            status: "confirming" as const,
            nonce: rec.nonce,
          });
        }
      }

      // Combine: pending local first, then on-chain records sorted newest first
      const combined = [
        ...pendingLocalRecords,
        ...onChainRecords.sort((a, b) => b.timestamp - a.timestamp),
      ];
      setEvents(combined);

      // If userPromptsRaw on contract has not updated yet, show at least combined count
      const totalUserCount = Math.max(Number(userPromptsRaw), combined.length);
      setUserPrompts(totalUserCount);
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
