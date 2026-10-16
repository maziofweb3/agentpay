export const USDC_ADDRESS =
  (process.env.USDC_ADDRESS ||
    "0x3600000000000000000000000000000000000000") as `0x${string}`;

/** First non-empty 0x address. Arc payTo is the Registry proxy. */
function addr(...candidates: (string | undefined)[]): `0x${string}` {
  for (const v of candidates) {
    const s = (v ?? "").trim();
    if (s.startsWith("0x") && s.length === 42) return s as `0x${string}`;
  }
  return "" as `0x${string}`;
}

export const ARC_MAINNET = {
  name: "Arc Mainnet",
  caip2: "eip155:5042" as const,
  chainId: 5042,
  rpcUrl: process.env.ARC_MAINNET_RPC_URL || "https://rpc.mainnet.arc.io",
  asset: USDC_ADDRESS,
  assetSymbol: "USDC" as const,
  decimals: 6,
  eip712Name: "USDC",
  eip712Version: "2",
  payTo: addr(
    process.env.PAYMENT_RECIPIENT_ADDRESS_ARC_MAINNET,
    process.env.AGENT_PAY_REGISTRY_ARC_MAINNET,
    "0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0"
  ),
};

export const ARC_TESTNET = {
  name: "Arc Testnet",
  caip2: "eip155:5042002" as const,
  chainId: 5042002,
  rpcUrl: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io",
  asset: USDC_ADDRESS,
  assetSymbol: "USDC" as const,
  decimals: 6,
  eip712Name: "USDC",
  eip712Version: "2",
  payTo: addr(
    process.env.PAYMENT_RECIPIENT_ADDRESS_ARC_TESTNET,
    process.env.AGENT_PAY_REGISTRY_ARC_TESTNET,
    "0xc3129d520a799e6e27c9dd0bb7891ac92b4146c2"
  ),
};

export type NetworkConfig = typeof ARC_MAINNET | typeof ARC_TESTNET;

const BY_CAIP: Record<string, NetworkConfig> = {
  [ARC_MAINNET.caip2]: ARC_MAINNET,
  [ARC_TESTNET.caip2]: ARC_TESTNET,
};

export function isArcNetwork(_network?: string): boolean {
  return true;
}

export function parseX402NetworkEnv(raw?: string): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "arc-testnet" || v === "arc_testnet" || v === "testnet" || v === "5042002" || v === "eip155:5042002") {
    return ARC_TESTNET.caip2;
  }
  return ARC_MAINNET.caip2;
}

export function getDefaultNetwork(): NetworkConfig {
  const fromEnv = parseX402NetworkEnv(process.env.X402_NETWORK);
  if (fromEnv && BY_CAIP[fromEnv]) return BY_CAIP[fromEnv];
  return ARC_MAINNET;
}

export function getNetwork(caipOrId?: string | number): NetworkConfig {
  if (typeof caipOrId === "number") {
    const found = Object.values(BY_CAIP).find((n) => n.chainId === caipOrId);
    return found ?? getDefaultNetwork();
  }
  if (caipOrId && BY_CAIP[caipOrId]) return BY_CAIP[caipOrId];
  const asNum = Number(String(caipOrId ?? "").split(":").pop());
  if (Number.isFinite(asNum)) {
    const found = Object.values(BY_CAIP).find((n) => n.chainId === asNum);
    if (found) return found;
  }
  return getDefaultNetwork();
}

export function allNetworks(): NetworkConfig[] {
  return [ARC_MAINNET, ARC_TESTNET];
}

export function usdToAtomic(usd: number, decimals: number): bigint {
  const scale = 10 ** decimals;
  const raw = Math.ceil(usd * scale - 1e-9);
  return BigInt(Math.max(1, raw));
}

export function formatAtomic(
  amount: bigint | string,
  symbol: string,
  decimals: number
): string {
  try {
    const val = typeof amount === "bigint" ? amount : BigInt(amount);
    const tokens = Number(val) / 10 ** decimals;
    return `${tokens.toFixed(4)} $${symbol}`;
  } catch {
    return `${amount} ${symbol}`;
  }
}
