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

export const SEED_HISTORY_DATA: PaymentRecord[] = [
  {
    id: "tx-1",
    category: "chat",
    tool: "AI Text Assistant",
    model: "Groq 120B (LPU)",
    amount: "0.0058 USDC",
    amountNumeric: 0.0058,
    timestamp: "2 mins ago",
    txHash: "0x3f7a1b4908...89c2",
    nonce: "0x892a01948ba",
    facilitator: "0xCircleArcFacilitator01",
    status: "Settled (Arc 5042)",
  },
  {
    id: "tx-2",
    category: "image",
    tool: "AI Image Creator",
    model: "Diffusion XL WebP",
    amount: "0.0300 USDC",
    amountNumeric: 0.03,
    timestamp: "18 mins ago",
    txHash: "0x9e2c4d8120...11a4",
    nonce: "0x892a01948bb",
    facilitator: "0xCircleArcFacilitator01",
    status: "Settled (Arc 5042)",
  },
  {
    id: "tx-3",
    category: "code",
    tool: "Smart Contract Auditor",
    model: "Solidity AST Analyzer",
    amount: "0.0156 USDC",
    amountNumeric: 0.0156,
    timestamp: "45 mins ago",
    txHash: "0x6a8f0b1294...55d9",
    nonce: "0x892a01948bc",
    facilitator: "0xCircleArcFacilitator01",
    status: "Settled (Arc 5042)",
  },
  {
    id: "tx-4",
    category: "chat",
    tool: "AI Text Assistant",
    model: "Google Gemini 3.8 Flash",
    amount: "0.0058 USDC",
    amountNumeric: 0.0058,
    timestamp: "2 hours ago",
    txHash: "0x1b4a92ff01...44a8",
    nonce: "0x892a01948bd",
    facilitator: "0xCircleArcFacilitator01",
    status: "Settled (Arc 5042)",
  },
];

const STORAGE_KEY = "agentpay_payment_history";

export function getStoredHistory(): PaymentRecord[] {
  if (typeof window === "undefined") {
    return SEED_HISTORY_DATA;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_HISTORY_DATA;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return [...parsed, ...SEED_HISTORY_DATA];
    }
  } catch (err) {
    console.error("Failed to parse stored payment history", err);
  }
  return SEED_HISTORY_DATA;
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
