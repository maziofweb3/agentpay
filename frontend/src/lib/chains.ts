import { defineChain, createPublicClient, http, type Chain } from "viem";

export const AGENT_PAY_REGISTRY_TESTNET_ADDRESS =
  process.env.NEXT_PUBLIC_AGENT_PAY_REGISTRY_TESTNET_ADDRESS || "";
export const AGENT_PAY_REGISTRY_IMPLEMENTATION_TESTNET_ADDRESS =
  process.env.NEXT_PUBLIC_AGENT_PAY_REGISTRY_IMPLEMENTATION_TESTNET_ADDRESS ||
  "0x60C516E2A6F3a6C034AA2D63AE32900D88B3bB4D";

export const AGENT_PAY_REGISTRY_MAINNET_ADDRESS =
  process.env.NEXT_PUBLIC_AGENT_PAY_REGISTRY_MAINNET_ADDRESS || "";

export const AGENT_PAY_REGISTRY_ARC_TESTNET_ADDRESS =
  process.env.NEXT_PUBLIC_AGENT_PAY_REGISTRY_ARC_TESTNET_ADDRESS ||
  process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT_ARC_TESTNET ||
  "";

export const AGENT_PAY_REGISTRY_ARC_MAINNET_ADDRESS =
  process.env.NEXT_PUBLIC_AGENT_PAY_REGISTRY_ARC_MAINNET_ADDRESS ||
  process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT_ARC_MAINNET ||
  "";

export function getAgentPayRegistryAddress(isMainnet: boolean): string {
  return isMainnet ? AGENT_PAY_REGISTRY_MAINNET_ADDRESS : AGENT_PAY_REGISTRY_TESTNET_ADDRESS;
}

export function getArcRegistryAddress(isMainnet: boolean): string {
  return isMainnet
    ? AGENT_PAY_REGISTRY_ARC_MAINNET_ADDRESS
    : AGENT_PAY_REGISTRY_ARC_TESTNET_ADDRESS;
}

export const USDC_ADDRESS_ARC_MAINNET =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS_ARC_MAINNET ||
    process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0x3600000000000000000000000000000000000000") as `0x${string}`;

export const USDC_ADDRESS_ARC_TESTNET =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET ||
    process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0x3600000000000000000000000000000000000000") as `0x${string}`;

/** @deprecated Use USDC_ADDRESS_ARC_MAINNET or USDC_ADDRESS_ARC_TESTNET — kept for backward compat. */
export const USDC_ADDRESS = USDC_ADDRESS_ARC_MAINNET;

export const arc = defineChain({
  id: 5042,
  name: "Arc",
  network: "arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_MAINNET_RPC ||
        process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL ||
        "https://rpc.mainnet.arc.io",
      ],
    },
    privyWalletOverride: {
      http: [
        process.env.NEXT_PUBLIC_ARC_MAINNET_RPC ||
        process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL ||
        "https://rpc.mainnet.arc.io",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://explorer.arc.io" },
  },
});

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_TESTNET_RPC ||
        process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ||
        "https://rpc.testnet.arc.io",
      ],
    },
    privyWalletOverride: {
      http: [
        process.env.NEXT_PUBLIC_ARC_TESTNET_RPC ||
        process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ||
        "https://rpc.testnet.arc.io",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Arc Testnet Explorer", url: "https://explorer.testnet.arc.io" },
  },
  testnet: true,
});

export const botChain = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.botchain.ai"] },
  },
  blockExplorers: {
    default: { name: "BOTScan", url: "https://scan.botchain.ai" },
  },
});

export const botChainTestnet = defineChain({
  id: 968,
  name: "BOT Chain Testnet",
  nativeCurrency: { name: "tBOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.bohr.life"] },
  },
  blockExplorers: {
    default: { name: "BOTScan Testnet", url: "https://scan.bohr.life" },
  },
  testnet: true,
});

export const ALL_CHAINS: Chain[] = [arc, arcTestnet, botChain, botChainTestnet];

export function isArcChainId(chainId: number): boolean {
  return chainId === 5042 || chainId === 5042002;
}

export function isBotChainId(chainId: number): boolean {
  return chainId === 677 || chainId === 968;
}

export function chainById(chainId: number): Chain {
  return ALL_CHAINS.find((c) => c.id === chainId) ?? arc;
}

export function rpcUrlFor(chainId: number): string {
  if (typeof window !== "undefined") {
    if (chainId === 5042) return "/rpc/arc";
    if (chainId === 5042002) return "/rpc/arc-testnet";
  }
  const chain = chainById(chainId);
  return chain.rpcUrls.default.http[0] ?? "https://rpc.mainnet.arc.io";
}

export function caip2(chainId: number): `eip155:${number}` {
  return `eip155:${chainId}`;
}

export function addChainParams(chainId: number) {
  const chain = chainById(chainId);
  return {
    chainId: `0x${chainId.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: [...chain.rpcUrls.default.http],
    blockExplorerUrls: chain.blockExplorers?.default?.url
      ? [chain.blockExplorers.default.url]
      : [],
  };
}

export const publicClientArc = createPublicClient({
  chain: arc,
  transport: http(typeof window !== "undefined" ? "/rpc/arc" : (process.env.NEXT_PUBLIC_ARC_MAINNET_RPC || "https://rpc.mainnet.arc.io")),
});

export const publicClientArcTestnet = createPublicClient({
  chain: arcTestnet,
  transport: http(typeof window !== "undefined" ? "/rpc/arc-testnet" : (process.env.NEXT_PUBLIC_ARC_TESTNET_RPC || "https://rpc.testnet.arc.io")),
});

export const publicClientBotChain = createPublicClient({
  chain: botChain,
  transport: http("https://rpc.botchain.ai"),
});

export const publicClientBotChainTestnet = createPublicClient({
  chain: botChainTestnet,
  transport: http("https://rpc.bohr.life"),
});
