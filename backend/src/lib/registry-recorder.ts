/**
 * registry-recorder.ts
 *
 * Calls AgentPayRegistry.recordPaymentAndPrompt() after every successful
 * x402 settlement so that user activity is logged on-chain.
 *
 * Requirements:
 *   REGISTRY_OWNER_PRIVATE_KEY  — the deployer/owner EOA that controls the proxy.
 *                                 If absent, recording is silently skipped (no throw).
 *
 * Network selection mirrors the existing X402_NETWORK env var so that mainnet
 * payments are recorded on mainnet and testnet payments on testnet.
 */

import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getNetwork, getDefaultNetwork } from "./networks.js";
import { activity } from "./activity-log.js";

/** Minimal ABI — only the function we call. */
const REGISTRY_ABI = parseAbi([
  "function recordPaymentAndPrompt(address user, string calldata tool, address token, uint256 amount) external",
]);

/** Map API path → human-readable tool label stored on-chain. */
function toolLabel(path: string): string {
  if (path.includes("/chat")) return "chat";
  if (path.includes("/image")) return "image";
  if (path.includes("/code")) return "code";
  if (path.includes("/dex")) return "dex";
  return path.replace(/^\/api\//, "").replace(/\//g, "-") || "unknown";
}

/** Resolve chain-aware viem clients from the caip2 network string. */
function buildClients(caip2: string) {
  const net = getNetwork(caip2);
  const pk = (process.env.REGISTRY_OWNER_PRIVATE_KEY ?? "").trim();
  if (!pk) return null;

  const privateKey = (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const chain = {
    id: net.chainId,
    name: net.name,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [net.rpcUrl] } },
  } as const;

  const transport = http(net.rpcUrl, { timeout: 20_000 });

  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account, chain, transport });

  return { account, publicClient, walletClient, net };
}

/**
 * Derive the Registry proxy address for the given network.
 * Uses the same payTo address from networks.ts — the proxy IS the payTo vault.
 */
function registryAddress(caip2: string): `0x${string}` | null {
  const net = getNetwork(caip2);
  const addr = net.payTo;
  if (!addr || addr.length !== 42 || !addr.startsWith("0x")) return null;
  return addr as `0x${string}`;
}

export interface RecordPromptParams {
  /** Payer wallet address extracted from the EIP-3009 payload. */
  user: string;
  /** API path that was paid for, e.g. "/api/chat". */
  path: string;
  /** Amount paid in atomic units (6 decimals for USDC). */
  amountAtomic: bigint;
  /** Token asset address (USDC on Arc). */
  assetAddress: `0x${string}`;
  /** CAIP-2 network identifier, e.g. "eip155:5042". */
  network: string;
}

/**
 * Fire-and-forget: call recordPaymentAndPrompt on the Registry contract.
 *
 * Never throws — any failure is logged as a warn so the payment flow
 * is never affected by a recording error.
 *
 * Returns the transaction hash on success, or null if skipped/failed.
 */
export async function recordPromptOnChain(
  params: RecordPromptParams
): Promise<string | null> {
  const { user, path, amountAtomic, assetAddress, network } = params;

  if (!user || !/^0x[0-9a-fA-F]{40}$/.test(user)) {
    activity("registry.record_skip", { reason: "invalid_user_address", user, path }, "warn");
    return null;
  }

  const pk = (process.env.REGISTRY_OWNER_PRIVATE_KEY ?? "").trim();
  if (!pk) {
    activity("registry.record_skip", { reason: "no_owner_key_configured", path }, "warn");
    return null;
  }

  const proxy = registryAddress(network);
  if (!proxy) {
    activity("registry.record_skip", { reason: "no_registry_address", network, path }, "warn");
    return null;
  }

  const clients = buildClients(network);
  if (!clients) {
    activity("registry.record_skip", { reason: "client_build_failed", path }, "warn");
    return null;
  }

  const { account, walletClient, publicClient, net } = clients;
  const tool = toolLabel(path);

  try {
    // Simulate first to surface revert reasons cheaply.
    await publicClient.simulateContract({
      address: proxy,
      abi: REGISTRY_ABI,
      functionName: "recordPaymentAndPrompt",
      args: [user as `0x${string}`, tool, assetAddress, amountAtomic],
      account: account.address,
    });

    const txHash = await walletClient.writeContract({
      address: proxy,
      abi: REGISTRY_ABI,
      functionName: "recordPaymentAndPrompt",
      args: [user as `0x${string}`, tool, assetAddress, amountAtomic],
    });

    activity("registry.record_ok", {
      path,
      tool,
      user: user.slice(0, 12),
      amountAtomic: amountAtomic.toString(),
      network: net.caip2,
      tx: txHash.slice(0, 14),
    });

    return txHash;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Truncate long revert strings to keep logs readable.
    activity(
      "registry.record_fail",
      {
        path,
        tool,
        user: user.slice(0, 12),
        network: net.caip2,
        reason: msg.slice(0, 200),
      },
      "warn"
    );
    return null;
  }
}
