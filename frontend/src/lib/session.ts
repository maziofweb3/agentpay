/**
 * Client-side storage for prepaid session tokens.
 *
 * Always key by the **payment network** chain id (API's chain: 968 testnet / 677 mainnet),
 * not whatever chain the wallet UI currently displays — those used to diverge and make
 * valid sessions look "missing".
 */

const PREFIX = "agentpay:session:";
/** Also scan legacy keys that used a wrong chain id. */
const LEGACY_PREFIX = "agentpay:session:";

export interface StoredSession {
  token: string;
  address: string;
  /** Payment network chain id (968 or 677). */
  chainId: number;
  remainingAtomic: string;
  updatedAt: number;
}

function key(address: string, chainId: number): string {
  return `${PREFIX}${chainId}:${address.toLowerCase()}`;
}

/**
 * Load session for address on the payment chain. Also recovers sessions stored
 * under other chain ids for the same address (legacy / wallet-chain mismatch).
 */
export function loadSession(
  address: string | null,
  paymentChainId: number
): StoredSession | null {
  if (!address || typeof window === "undefined") return null;
  const addr = address.toLowerCase();

  // Preferred key
  const preferred = readKey(key(addr, paymentChainId));
  if (preferred) return preferred;

  // Recover: any agentpay:session:*:address entry
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(LEGACY_PREFIX)) continue;
      if (!k.toLowerCase().endsWith(`:${addr}`)) continue;
      const s = readKey(k);
      if (s?.token) {
        // Re-home under the payment chain id so future loads are consistent.
        const fixed: StoredSession = {
          ...s,
          address: addr,
          chainId: paymentChainId,
          updatedAt: Date.now(),
        };
        saveSession(fixed);
        if (k !== key(addr, paymentChainId)) {
          window.localStorage.removeItem(k);
        }
        console.info("[agentpay] recovered session from legacy key", k);
        return fixed;
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

function readKey(k: string): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.token || !parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  const addr = session.address.toLowerCase();
  const payload: StoredSession = {
    ...session,
    address: addr,
  };
  window.localStorage.setItem(key(addr, session.chainId), JSON.stringify(payload));
}

export function clearSession(address: string | null, paymentChainId: number): void {
  if (!address || typeof window === "undefined") return;
  const addr = address.toLowerCase();
  window.localStorage.removeItem(key(addr, paymentChainId));
  // Also clear any legacy keys for this address
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k.toLowerCase().endsWith(`:${addr}`)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function updateSessionRemaining(
  address: string,
  paymentChainId: number,
  remainingAtomic: string
): void {
  const existing = loadSession(address, paymentChainId);
  if (!existing) return;
  saveSession({
    ...existing,
    chainId: paymentChainId,
    remainingAtomic,
    updatedAt: Date.now(),
  });
}
