/**
 * BotChain DEX & Hybrid Zap Configuration & Getters
 */

export function getHybridZapAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_HYBRID_ZAP_ADDRESS_MAINNET ||
    "0x3dE7Ad9D36586C8aA69AD6d72c5F3aadE611689d") as `0x${string}`;
}

export function getDexFactoryAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_BDEX_V2_FACTORY_MAINNET ||
    "0x117115f3B72C8d1989178089A67D0C26f8EE0AA3") as `0x${string}`;
}

export function getDexRouterAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_BDEX_V2_ROUTER_MAINNET ||
    "0x1414eD29FdFD322c3c0a830330ed982E2D629e76") as `0x${string}`;
}

export function getWbotAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_WBOT_TOKEN_ADDRESS_MAINNET ||
    "0xD5452816194a3784dBa983426cCe7c122F4abd30") as `0x${string}`;
}

export function getUsdtAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS_MAINNET ||
    "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C") as `0x${string}`;
}

export function getApayAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_APAY_TOKEN_ADDRESS_MAINNET ||
    "0x4a781889Ce38c08B86b02e084A5A19609376b857") as `0x${string}`;
}

export const DEX_CONFIG = {
  mainnet: {
    chainId: 677,
    get factory() {
      return getDexFactoryAddress();
    },
    get router() {
      return getDexRouterAddress();
    },
    get apay() {
      return getApayAddress();
    },
    get usdt() {
      return getUsdtAddress();
    },
    get wbot() {
      return getWbotAddress();
    },
    get hybridZap() {
      return getHybridZapAddress();
    },
    maxSupplyCap: 1_000_000_000n * 10n ** 18n,
    lockerProofs: {
      usdtApay: "https://dex.botchain.ai/pool/lock/proof/v2-3",
      botApay: "https://dex.botchain.ai/pool/lock/proof/v2-4",
    },
    swapEmbedUrl:
      "https://dex.botchain.ai/#/swap?inputCurrency=0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C&outputCurrency=0x4a781889Ce38c08B86b02e084A5A19609376b857",
  },
};

export const HYBRID_ZAP_ABI = [
  {
    name: "zapInToken",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "inputToken", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minLpOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "zapInETH",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "minLpOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "estimateZapIn",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "inputToken", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "isMintPhase", type: "bool" },
      { name: "expectedApay", type: "uint256" },
      { name: "expectedLp", type: "uint256" },
    ],
  },
  {
    name: "getPoolStats",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "inputToken", type: "address" }],
    outputs: [
      { name: "pairAddress", type: "address" },
      { name: "reserveToken", type: "uint256" },
      { name: "reserveApay", type: "uint256" },
      { name: "totalLpSupply", type: "uint256" },
      { name: "currentApaySupply", type: "uint256" },
      { name: "isMintingActive", type: "bool" },
    ],
  },
] as const;

export const UNISWAP_V2_FACTORY_ABI = [
  {
    name: "getPair",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

export const UNISWAP_V2_PAIR_ABI = [
  {
    name: "getReserves",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
  },
  {
    name: "token0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "token1",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
