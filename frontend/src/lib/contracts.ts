import { parseAbi } from "viem";

export const AGENT_PAY_REGISTRY_ABI = parseAbi([
  "function totalPromptsRecorded() external view returns (uint256)",
  "function userPromptCounts(address user) external view returns (uint256)",
  "function totalVolumePerAsset(address paymentAsset) external view returns (uint256)",
  "function defaultPaymentToken() external view returns (address)",
  "function acceptedTokens(address token) external view returns (bool)",
  "function apayToken() external view returns (address)",
  "function paused() external view returns (bool)",
  "event PromptRecorded(address indexed user, string agentId, string toolType, uint256 amountPaid, address indexed paymentAsset, uint256 timestamp)",
  "event PaymentReceived(address indexed user, address indexed token, uint256 amount, string tool)",
]);

export const ERC20_ABI = parseAbi([
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
]);

export const REGISTRY_ADDRESSES: Record<number, `0x${string}`> = {
  // Arc Mainnet
  5042: "0x2c126Af5F25e02B11DaB8aeD74A27340e018D9F0",
  // Arc Testnet
  5042002: "0xc3129d520a799e6e27c9dd0bb7891ac92b4146c2",
};

export const USDC_ADDRESS_ARC: `0x${string}` =
  "0x3600000000000000000000000000000000000000";

export function getRegistryAddress(chainId: number): `0x${string}` {
  return REGISTRY_ADDRESSES[chainId] || REGISTRY_ADDRESSES[5042];
}
