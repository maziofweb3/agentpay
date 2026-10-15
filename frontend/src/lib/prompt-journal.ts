/**
 * prompt-journal.ts
 *
 * Lightweight localStorage journal that records each successful paid prompt
 * immediately after the x402 flow completes — before the on-chain event is
 * indexed and available via getLogs.
 *
 * Keys: "agentpay:journal:<address_lower>"
 * Each address has a capped circular buffer of at most MAX_ENTRIES items.
 */

const JOURNAL_PREFIX = "agentpay:journal:";
const MAX_ENTRIES = 100;

export type JournalTool = "chat" | "image" | "code" | "dex" | string;

export interface JournalEntry {
  /** ISO-8601 timestamp of the payment. */
  timestamp: string;
  /** Tool label, e.g. "chat", "image", "code". */
  tool: JournalTool;
  /** Human-readable amount, e.g. "0.0058 USDC". */
  amountFormatted: string;
  /** Atomic amount string (6 decimals). */
  amountAtomic: string;
  /** CAIP-2 network, e.g. "eip155:5042". */
  network: string;
  /**
   * EIP-3009 nonce used as a deterministic local id.
   * Becomes the key to match against the on-chain PromptRecorded event once
   * the backend records it — but is NOT the settlement tx hash.
   */
  nonce: string;
  /**
   * Settlement tx hash returned by the facilitator settle() call.
   * Populated asynchronously by the backend response header
   * (X-AgentPay-Tx) when available; otherwise null.
   */
  settlementTx: string | null;
  /** Block explorer base URL for the chain. */
  explorerUrl: string;
}

function storageKey(address: string): string {
  return `${JOURNAL_PREFIX}${address.toLowerCase()}`;
}

function explorerForNetwork(network: string): string {
  if (network.includes("5042002")) return "https://explorer.testnet.arc.io";
  return "https://explorer.arc.io";
}

/** Tool path → display label. */
export function toolDisplayLabel(tool: JournalTool): string {
  switch (tool) {
    case "chat": return "AI Text Assistant";
    case "image": return "AI Image Generator";
    case "code": return "Smart Contract Auditor";
    case "dex": return "DEX";
    default: return tool.charAt(0).toUpperCase() + tool.slice(1);
  }
}

/** API path → tool key. */
export function pathToTool(path: string): JournalTool {
  if (path.includes("/chat")) return "chat";
  if (path.includes("/image")) return "image";
  if (path.includes("/code")) return "code";
  if (path.includes("/dex")) return "dex";
  return path.replace(/^\/api\//, "").replace(/\//g, "-") || "unknown";
}

function readJournal(address: string): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(address));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as JournalEntry[];
  } catch {
    return [];
  }
}

function writeJournal(address: string, entries: JournalEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(address), JSON.stringify(entries));
  } catch {
    /* quota exceeded or SSR — ignore */
  }
}

/**
 * Append a new entry to the journal for the given address.
 * Entries are prepended (newest first) and capped at MAX_ENTRIES.
 */
export function appendJournalEntry(
  address: string,
  entry: Omit<JournalEntry, "explorerUrl">
): void {
  if (!address) return;
  const existing = readJournal(address);
  const full: JournalEntry = {
    ...entry,
    explorerUrl: explorerForNetwork(entry.network),
  };
  const updated = [full, ...existing].slice(0, MAX_ENTRIES);
  writeJournal(address, updated);
}

/** Update the settlementTx field on an existing entry by nonce. */
export function updateJournalSettlementTx(
  address: string,
  nonce: string,
  settlementTx: string
): void {
  if (!address || !nonce) return;
  const entries = readJournal(address);
  let changed = false;
  const updated = entries.map((e) => {
    if (e.nonce === nonce && !e.settlementTx) {
      changed = true;
      return { ...e, settlementTx };
    }
    return e;
  });
  if (changed) writeJournal(address, updated);
}

/** Load all journal entries for an address, newest first. */
export function loadJournal(address: string | null): JournalEntry[] {
  if (!address) return [];
  return readJournal(address);
}

/** Clear the entire journal for an address (e.g. on disconnect). */
export function clearJournal(address: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(address));
  } catch {
    /* ignore */
  }
}
