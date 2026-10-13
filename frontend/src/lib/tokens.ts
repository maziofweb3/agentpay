import { isArcChainId } from "@/lib/chains";

export const TOKENS = {
  // Arc Mainnet (Chain ID: 5042)
  arcMainnet: {
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS_ARC_MAINNET ||
      process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
      process.env.NEXT_PUBLIC_USDC_ADDRESS ||
      "0x3600000000000000000000000000000000000000") as `0x${string}`,
  },
  // Arc Testnet (Chain ID: 5042002)
  arcTestnet: {
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET ||
      process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
      process.env.NEXT_PUBLIC_USDC_ADDRESS ||
      "0x3600000000000000000000000000000000000000") as `0x${string}`,
  },
};

export type PaymentAsset = {
  symbol: "USDC";
  address: `0x${string}`;
  decimals: number;
  eip712Name: string;
  eip712Version: string;
  caip2: `eip155:${number}`;
};

/** Resolve Arc token config by chain ID (mainnet 5042 vs testnet 5042002). */
export function getArcTokens(chainId: number = 5042) {
  return chainId === 5042002 ? TOKENS.arcTestnet : TOKENS.arcMainnet;
}

/** Payment token for the wallet's current chain: strictly Arc USDC (6 decimals). */
export function getPaymentAsset(chainId: number = 5042): PaymentAsset {
  const arcTokens = getArcTokens(chainId);
  const activeChainId = chainId === 5042002 ? 5042002 : 5042;
  return {
    symbol: "USDC",
    address: arcTokens.USDC,
    decimals: 6,
    eip712Name: "USDC",
    eip712Version: "2",
    caip2: `eip155:${activeChainId}`,
  };
}

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "authorizationState",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "authorizer", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
