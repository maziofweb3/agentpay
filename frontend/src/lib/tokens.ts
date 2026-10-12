import { isArcChainId } from "@/lib/chains";

export const TOKENS = {
  // Arc Mainnet (Chain ID: 5042)
  arcMainnet: {
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS_ARC_MAINNET ||
      process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
      process.env.NEXT_PUBLIC_USDC_ADDRESS ||
      "0x3600000000000000000000000000000000000000") as `0x${string}`,
    APAY: (process.env.NEXT_PUBLIC_APAY_TOKEN_ADDRESS_ARC || "") as `0x${string}`,
  },
  // Arc Testnet (Chain ID: 5042002)
  arcTestnet: {
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET ||
      process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
      process.env.NEXT_PUBLIC_USDC_ADDRESS ||
      "0x3600000000000000000000000000000000000000") as `0x${string}`,
    APAY: (process.env.NEXT_PUBLIC_APAY_TOKEN_ADDRESS_ARC || "") as `0x${string}`,
  },
  // BotChain Mainnet (Chain ID: 677)
  botChainMainnet: {
    APAY: (process.env.NEXT_PUBLIC_APAY_TOKEN_ADDRESS_MAINNET || "0x4a781889Ce38c08B86b02e084A5A19609376b857") as `0x${string}`,
    USDT: (process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS_MAINNET || "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C") as `0x${string}`,
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS_BOTCHAIN_MAINNET || "") as `0x${string}`,
    BOUSDT: (process.env.NEXT_PUBLIC_BOUSDT_TOKEN_ADDRESS_MAINNET || "") as `0x${string}`,
  },
  // BotChain Testnet / Devnet (Chain ID: 968)
  botChainTestnet: {
    APAY: (process.env.NEXT_PUBLIC_APAY_TOKEN_ADDRESS_TESTNET || "0xFd7bF688d5a772A81DfE39da502F69FD99cE92c7") as `0x${string}`,
    USDT: (process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS_TESTNET || "0x75edC9335175Fc0552D51D48439F229c10420fe3") as `0x${string}`,
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS_BOTCHAIN_TESTNET || "") as `0x${string}`,
  },
};

export type PaymentAsset = {
  symbol: "USDC" | "APAY";
  address: `0x${string}`;
  decimals: number;
  eip712Name: string;
  eip712Version: string;
  caip2: `eip155:${number}`;
};

/** Resolve Arc token config by chain ID (mainnet 5042 vs testnet 5042002). */
export function getArcTokens(chainId: number) {
  return chainId === 5042 ? TOKENS.arcMainnet : TOKENS.arcTestnet;
}

/** Resolve BotChain token config by chain ID (mainnet 677 vs testnet 968). */
export function getBotChainTokens(chainId: number) {
  return chainId === 677 ? TOKENS.botChainMainnet : TOKENS.botChainTestnet;
}

/** Payment token for the wallet's current chain. Arc = USDC 6-dec; BotChain = APAY 18-dec. */
export function getPaymentAsset(chainId: number): PaymentAsset {
  if (isArcChainId(chainId)) {
    const arcTokens = getArcTokens(chainId);
    return {
      symbol: "USDC",
      address: arcTokens.USDC,
      decimals: 6,
      eip712Name: "USDC",
      eip712Version: "2",
      caip2: `eip155:${chainId}`,
    };
  }
  const mainnet = chainId === 677;
  return {
    symbol: "APAY",
    address: mainnet ? TOKENS.botChainMainnet.APAY : TOKENS.botChainTestnet.APAY,
    decimals: 18,
    eip712Name: "AgentPay Token",
    eip712Version: "1",
    caip2: `eip155:${chainId}`,
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
