export const USDC_ADDRESS =
  (process.env.USDC_ADDRESS ||
    "0x3600000000000000000000000000000000000000") as `0x${string}`;

/** First non-empty 0x address. Arc payTo is the Registry proxy (same pattern as BotChain). */
function addr(...candidates: (string | undefined)[]): `0x${string}` {
  for (const v of candidates) {
    const s = (v ?? "").trim();
    if (s.startsWith("0x") && s.length === 42) return s as `0x${string}`;
  }
  return "" as `0x${string}`;
}

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
    process.env.AGENT_PAY_REGISTRY_ARC_TESTNET
  ),
};

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
    process.env.AGENT_PAY_REGISTRY_ARC_MAINNET
  ),
};

export const BOTCHAIN_TESTNET = {
  name: "BotChain Testnet",
  caip2: "eip155:968" as const,
  chainId: 968,
  rpcUrl:
    process.env.BOTCHAIN_TESTNET_RPC_URL ||
    process.env.BOTCHAIN_RPC_URL ||
    "https://rpc.bohr.life",
  asset: (process.env.APAY_TOKEN_ADDRESS_TESTNET ||
    process.env.APAY_TOKEN_ADDRESS ||
    "0xFd7bF688d5a772A81DfE39da502F69FD99cE92c7") as `0x${string}`,
  assetSymbol: "APAY" as const,
  decimals: 18,
  eip712Name: "AgentPay Token",
  eip712Version: "1",
  payTo: (process.env.PAYMENT_RECIPIENT_ADDRESS_TESTNET ||
    process.env.PAYMENT_RECIPIENT_ADDRESS ||
    "0xc1eBB154EFf9bf9c08e39978E1447cC05e726dC6") as `0x${string}`,
};

export const BOTCHAIN_MAINNET = {
  name: "BotChain Mainnet",
  caip2: "eip155:677" as const,
  chainId: 677,
  rpcUrl:
    process.env.BOTCHAIN_MAINNET_RPC_URL ||
    process.env.BOTCHAIN_RPC_URL ||
    "https://rpc.botchain.ai",
  asset: (process.env.APAY_TOKEN_ADDRESS_MAINNET ||
    process.env.APAY_TOKEN_ADDRESS ||
    "0x4a781889Ce38c08B86b02e084A5A19609376b857") as `0x${string}`,
  assetSymbol: "APAY" as const,
  decimals: 18,
  eip712Name: "AgentPay Token",
  eip712Version: "1",
  payTo: (process.env.PAYMENT_RECIPIENT_ADDRESS_MAINNET ||
    process.env.PAYMENT_RECIPIENT_ADDRESS ||
    "") as `0x${string}`,
};

export type NetworkConfig =
  | typeof ARC_TESTNET
  | typeof ARC_MAINNET
  | typeof BOTCHAIN_TESTNET
  | typeof BOTCHAIN_MAINNET;

const BY_CAIP: Record<string, NetworkConfig> = {
  [ARC_TESTNET.caip2]: ARC_TESTNET,
  [ARC_MAINNET.caip2]: ARC_MAINNET,
  [BOTCHAIN_TESTNET.caip2]: BOTCHAIN_TESTNET,
  [BOTCHAIN_MAINNET.caip2]: BOTCHAIN_MAINNET,
};

export function isArcNetwork(network?: string): boolean {
  return network === ARC_TESTNET.caip2 || network === ARC_MAINNET.caip2;
}

export function parseX402NetworkEnv(raw?: string): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "arc-mainnet" || v === "arc_mainnet") return ARC_MAINNET.caip2;
  if (v === "arc-testnet" || v === "arc_testnet" || v === "arc") return ARC_TESTNET.caip2;
  if (v === "mainnet") return BOTCHAIN_MAINNET.caip2;
  if (v === "testnet") return BOTCHAIN_TESTNET.caip2;
  if (v.startsWith("eip155:")) return v;
  return "";
}

export function getDefaultNetwork(): NetworkConfig {
  const fromEnv = parseX402NetworkEnv(process.env.X402_NETWORK);
  if (fromEnv && BY_CAIP[fromEnv]) return BY_CAIP[fromEnv];
  const prod = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  return prod ? ARC_MAINNET : ARC_TESTNET;
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
  return [ARC_TESTNET, ARC_MAINNET, BOTCHAIN_TESTNET, BOTCHAIN_MAINNET];
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
    const formatted =
      tokens % 1 === 0
        ? tokens.toFixed(decimals === 6 ? 2 : 1)
        : tokens.toFixed(Math.min(4, decimals));
    return `${formatted} $${symbol}`;
  } catch {
    return `${amount} ${symbol}`;
  }
}
