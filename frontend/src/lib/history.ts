export interface PaymentRecord {
  id: string;
  category: "chat" | "image" | "code";
  tool: string;
  model: string;
  amount: string;
  amountNumeric: number;
  timestamp: string;
  txHash: string;
  nonce: string;
  facilitator: string;
  status: string;
}

const STORAGE_KEY = "agentpay_payment_history";

export function getStoredHistory(): PaymentRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error("Failed to parse stored payment history", err);
  }
  return [];
}

export function saveHistoryRecord(record: PaymentRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: PaymentRecord[] = raw ? JSON.parse(raw) : [];
    existing.unshift(record);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error("Failed to save payment history record", err);
  }
}
