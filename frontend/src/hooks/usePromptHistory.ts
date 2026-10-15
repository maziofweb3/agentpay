"use client";

/**
 * usePromptHistory
 *
 * Returns the user's prompt history by:
 *   1. Loading the local journal immediately (instant, no network).
 *   2. Fetching PromptRecorded events from the AgentPayRegistry contract in
 *      the background using getLogs, then merging with the local cache.
 *
 * On-chain data is authoritative — it enriches the local journal with real
 * block timestamps and tx hashes from the settlement. When the contract address
 * is not configured the hook gracefully falls back to journal-only mode.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { parseAbi, type Log } from "viem";
import { getPublicClient, getArcRegistryAddress } from "@/lib/chains";
import {
  loadJournal,
  toolDisplayLabel,
  type JournalEntry,
} from "@/lib/prompt-journal";

export interface HistoryItem {
  /** Stable key for React list rendering. */
  id: string;
  /** Display label, e.g. "AI Text Assistant". */
  tool: string;
  /** Human-readable amount, e.g. "0.0058 USDC". */
  amountFormatted: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Settlement tx hash — null if not yet confirmed. */
  txHash: string | null;
  /** Full explorer URL for the tx, or base explorer URL. */
  explorerUrl: string;
  /** "settled" | "pending" */
  status: "settled" | "pending";
  /** Which chain the event lives on. */
  network: string;
}

const PROMPT_RECORDED_ABI = parseAbi([
  "event PromptRecorded(address indexed user, string agentId, string toolType, uint256 amountPaid, address indexed paymentAsset, uint256 timestamp)",
]);

/** How many blocks back to scan. ~7 days at ~1s/block on Arc. */
const SCAN_BLOCKS = BigInt(604_800);

function explorerTxUrl(baseUrl: string, txHash: string): string {
  return `${baseUrl}/tx/${txHash}`;
}

function formatAmountAtomic(atomic: bigint, decimals = 6): string {
  const val = Number(atomic) / 10 ** decimals;
  return `${val.toFixed(4)} USDC`;
}

function relativeTime(isoOrUnix: string | number): string {
  const ms =
    typeof isoOrUnix === "number"
      ? isoOrUnix * 1000
      : new Date(isoOrUnix).getTime();
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
}

/** Convert a local journal entry → HistoryItem (pending state). */
function journalToItem(e: JournalEntry): HistoryItem {
  return {
    id: `journal:${e.nonce}`,
    tool: toolDisplayLabel(e.tool),
    amountFormatted: e.amountFormatted,
    timestamp: relativeTime(e.timestamp),
    txHash: e.settlementTx ?? null,
    explorerUrl: e.settlementTx
      ? explorerTxUrl(e.explorerUrl, e.settlementTx)
      : e.explorerUrl,
    status: e.settlementTx ? "settled" : "pending",
    network: e.network,
  };
}

export interface UsePromptHistoryResult {
  items: HistoryItem[];
  loading: boolean;
  /** True while on-chain fetch is running (journal data is already shown). */
  syncing: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePromptHistory(
  address: string | null,
  chainId: number
): UsePromptHistoryResult {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setItems([]);
      setLoading(false);
      setSyncing(false);
      return;
    }

    setLoading(true);
    setError(null);

    // ── Step 1: show local journal immediately ────────────────────────────
    const journal = loadJournal(address);
    const localItems = journal.map(journalToItem);
    setItems(localItems);
    setLoading(false);

    // ── Step 2: fetch on-chain events in the background ───────────────────
    const isMainnet = chainId !== 5042002;
    const registryAddr = getArcRegistryAddress(!isMainnet) as `0x${string}` | "";

    if (!registryAddr || registryAddr.length !== 42) {
      // No contract address configured — journal-only mode.
      setSyncing(false);
      return;
    }

    setSyncing(true);

    // Cancel any in-flight fetch if address/chain changed.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const client = getPublicClient(chainId);
      const latestBlock = await client.getBlockNumber();
      const fromBlock =
        latestBlock > SCAN_BLOCKS ? latestBlock - SCAN_BLOCKS : BigInt(0);

      const logs: Log[] = await client.getLogs({
        address: registryAddr as `0x${string}`,
        event: PROMPT_RECORDED_ABI[0],
        args: { user: address as `0x${string}` } as never,
        fromBlock,
        toBlock: latestBlock,
      });

      if (controller.signal.aborted) return;

      const explorerBase =
        chainId === 5042002
          ? "https://explorer.testnet.arc.io"
          : "https://explorer.arc.io";
      const network = `eip155:${chainId}`;

      type PromptLog = Log & {
        args: { toolType?: string; amountPaid?: bigint; timestamp?: bigint };
        transactionHash: `0x${string}` | null;
        logIndex: number;
      };

      // Build on-chain items newest first.
      const onChainItems: HistoryItem[] = (logs as PromptLog[])
        .slice()
        .reverse()
        .map((log) => {
          const args = log.args as {
            toolType?: string;
            amountPaid?: bigint;
            timestamp?: bigint;
          };
          const txHash = log.transactionHash;
          const blockTimestamp = args.timestamp
            ? Number(args.timestamp)
            : undefined;
          const ts = blockTimestamp
            ? relativeTime(blockTimestamp)
            : "unknown";

          return {
            id: `onchain:${log.transactionHash ?? log.logIndex}`,
            tool: toolDisplayLabel(args.toolType ?? "unknown"),
            amountFormatted: formatAmountAtomic(args.amountPaid ?? BigInt(0)),
            timestamp: ts,
            txHash: txHash ?? null,
            explorerUrl: txHash
              ? explorerTxUrl(explorerBase, txHash)
              : explorerBase,
            status: "settled" as const,
            network,
          };
        });

      // Merge: on-chain is authoritative. Prepend any local-only pending
      // entries (those whose nonce doesn't appear in on-chain txHashes).
      const onChainTxHashes = new Set(
        onChainItems.map((i) => i.txHash).filter(Boolean)
      );
      const pendingLocal = localItems.filter(
        (i) => i.status === "pending" || !onChainTxHashes.has(i.txHash)
      );

      const merged = [...pendingLocal, ...onChainItems].slice(0, 100);
      setItems(merged);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Failed to load history";
      setError(msg);
      // Keep showing local items on error.
    } finally {
      if (!controller.signal.aborted) setSyncing(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  return { items, loading, syncing, error, refresh: load };
}
