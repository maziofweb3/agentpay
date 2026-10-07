"use client";

import { useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
  isAddress,
  type Hash,
} from "viem";
import { addChainParams, chainById, rpcUrlFor } from "@/lib/chains";
import { formatPaymentAtomic } from "@/lib/pricing";
import { getPaymentAsset } from "@/lib/tokens";

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/** Header the API uses to accept a verified on-chain USDT transfer as payment (legacy). */
export const PAYMENT_TX_HEADER = "X-AgentPay-Payment-Tx";

const BOTCHAIN_IDS = new Set([968, 677]);
const USER_ACTION_TIMEOUT_MS = 120_000;
const RECEIPT_TIMEOUT_MS = 120_000;
const SILENT_RPC_TIMEOUT_MS = 8_000;

const ERC20_TRANSFER_ABI = [
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
] as const;

interface PaymentAccept {
  scheme: string;
  network: string;
  amount: string;
  asset: `0x${string}`;
  payTo: `0x${string}`;
  extra?: { name?: string; version?: string };
}

interface Eip3009Payload {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: string;
}

export interface PayRequestOptions {
  preferTestnet?: boolean;
  provider?: EthereumProvider | null;
  account?: `0x${string}` | string | null;
  switchChain?: (chainId: number) => Promise<void>;
}

function getInjectedEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = window.ethereum as unknown as EthereumProvider | undefined;
  return eth?.request ? eth : undefined;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `${label} timed out after ${Math.round(ms / 1000)}s. ` +
                  `Check for a wallet popup (including behind this window) and try again.`
              )
            ),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function jsonInit(options: RequestInit = {}): RequestInit {
  return {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };
}

function mergeHeaders(base: RequestInit, extra: Record<string, string>): RequestInit {
  return {
    ...base,
    headers: {
      ...(base.headers as Record<string, string>),
      ...extra,
    },
  };
}

async function errorFromResponse(response: Response): Promise<string> {
  const status = response.status;
  let body = "";
  try {
    body = await response.text();
  } catch {
    /* ignore */
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = body ? (JSON.parse(body) as Record<string, unknown>) : null;
  } catch {
    /* not JSON */
  }

  const message =
    (typeof parsed?.error === "string" && parsed.error) ||
    (typeof parsed?.message === "string" && parsed.message) ||
    body.slice(0, 200) ||
    response.statusText;

  if (status === 402) {
    return `Payment required or settlement failed. ${message}`;
  }
  if (status === 503) {
    return `Service unavailable: ${message}`;
  }
  return `HTTP ${status}: ${message}`;
}

function decodePaymentRequired(response: Response): PaymentAccept | null {
  // Header names are case-insensitive in Fetch, but some proxies rename them.
  const candidates = [
    "payment-required",
    "Payment-Required",
    "PAYMENT-REQUIRED",
    "x-payment-required",
  ];
  let raw: string | null = null;
  for (const name of candidates) {
    raw = response.headers.get(name);
    if (raw) break;
  }

  // Fallback: scan all exposed headers (helps when casing/proxy differs).
  if (!raw) {
    try {
      response.headers.forEach((value, key) => {
        if (!raw && key.toLowerCase().includes("payment-required")) {
          raw = value;
        }
      });
    } catch {
      /* ignore */
    }
  }

  if (!raw) {
    console.warn(
      "[agentpay] 402 without readable payment-required header. " +
        "If this is a cross-origin call, the API must set Access-Control-Expose-Headers. " +
        "Prefer same-origin /api/* via Next rewrites."
    );
    return null;
  }

  try {
    const pad = "=".repeat((4 - (raw.length % 4)) % 4);
    const json = JSON.parse(atob(raw + pad)) as { accepts?: PaymentAccept[] };
    const accepts = json.accepts ?? [];
    const preferred = (globalThis as { __agentpayChainId?: number }).__agentpayChainId;
    const accept =
      accepts.find((a) => a.network === `eip155:${preferred}`) ||
      accepts.find((a) => a.network?.includes("5042")) ||
      accepts[0];
    if (!accept?.asset || !accept?.payTo || !accept?.amount || !accept?.network) {
      console.warn("[agentpay] payment-required missing required fields", json);
      return null;
    }
    return accept;
  } catch (err) {
    console.warn("[agentpay] failed to decode payment-required header", err);
    return null;
  }
}

function chainFromCaip(network: string): {
  chainId: number;
  chain: ReturnType<typeof chainById>;
  rpcUrl: string;
  isTestnet: boolean;
} {
  const chainId = parseInt(network.split(":").pop() || "5042002", 10);
  const chain = chainById(chainId);
  return {
    chainId,
    chain,
    rpcUrl: rpcUrlFor(chainId),
    isTestnet: chainId === 968 || chainId === 5042002,
  };
}

async function readChainId(ethereum: EthereumProvider): Promise<number> {
  const chainIdHex = (await withTimeout(
    ethereum.request({ method: "eth_chainId" }) as Promise<string>,
    SILENT_RPC_TIMEOUT_MS,
    "Read wallet chain id"
  )) as string;
  return parseInt(chainIdHex, 16);
}

async function resolveAccount(
  ethereum: EthereumProvider,
  knownAccount?: string | null
): Promise<`0x${string}`> {
  if (knownAccount && /^0x[0-9a-fA-F]{40}$/.test(knownAccount)) {
    return knownAccount as `0x${string}`;
  }

  try {
    const existing = (await withTimeout(
      ethereum.request({ method: "eth_accounts" }) as Promise<string[]>,
      SILENT_RPC_TIMEOUT_MS,
      "Read wallet accounts"
    )) as string[];
    if (existing?.[0]) return existing[0] as `0x${string}`;
  } catch (err) {
    console.warn("[agentpay] eth_accounts failed:", err);
  }

  const requested = (await withTimeout(
    ethereum.request({ method: "eth_requestAccounts" }) as Promise<string[]>,
    USER_ACTION_TIMEOUT_MS,
    "Wallet connection"
  )) as string[];
  const account = requested?.[0] as `0x${string}` | undefined;
  if (!account) {
    throw new Error(
      "No wallet account connected. Connect your wallet, then try again."
    );
  }
  return account;
}

async function ensureChain(
  ethereum: EthereumProvider,
  target: ReturnType<typeof chainFromCaip>,
  switchChain?: (chainId: number) => Promise<void>
): Promise<void> {
  try {
    if ((await readChainId(ethereum)) === target.chainId) return;
  } catch {
    /* force switch */
  }

  if (switchChain) {
    try {
      await withTimeout(switchChain(target.chainId), USER_ACTION_TIMEOUT_MS, "Network switch");
      if ((await readChainId(ethereum)) === target.chainId) return;
    } catch (err) {
      console.warn("[agentpay] Privy switchChain failed:", err);
    }
  }

  const targetHex = `0x${target.chainId.toString(16)}`;
  const chainParams = addChainParams(target.chainId);

  try {
    await withTimeout(
      ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetHex }],
      }),
      USER_ACTION_TIMEOUT_MS,
      "Network switch"
    );
  } catch (switchErr: unknown) {
    const err = switchErr as { code?: number; message?: string };
    if (
      err.code === 4902 ||
      err.message?.includes("Unrecognized chain") ||
      err.message?.includes("Could not find chain")
    ) {
      await withTimeout(
        ethereum.request({
          method: "wallet_addEthereumChain",
          params: [chainParams],
        }),
        USER_ACTION_TIMEOUT_MS,
        "Add BotChain network"
      );
    } else if (err.code === 4001) {
      throw new Error(
        `Network switch rejected. Switch to ${target.chain.name} to pay.`
      );
    } else {
      try {
        if ((await readChainId(ethereum)) === target.chainId) return;
      } catch {
        /* fall through */
      }
      throw new Error(
        `Switch your wallet to ${target.chain.name} (${target.chainId}) to pay. ${
          err.message ?? ""
        }`.trim()
      );
    }
  }

  if ((await readChainId(ethereum)) !== target.chainId) {
    throw new Error(
      `Wallet is still not on ${target.chain.name} (${target.chainId}). Switch network and retry.`
    );
  }
}

/**
 * Sign an EIP-3009 TransferWithAuthorization using eth_signTypedData_v4.
 *
 * This is a pure signature — no gas, no on-chain transaction from the user.
 * The backend verifies the signature via BOF and the relayer settles on-chain.
 */
async function signEip3009Authorization(
  ethereum: EthereumProvider,
  accept: PaymentAccept,
  account: `0x${string}`
): Promise<Eip3009Payload> {
  const target = chainFromCaip(accept.network);

  if (!accept.asset || !isAddress(accept.asset)) {
    throw new Error(
      `Payment token is not configured on ${target.chain.name} (Chain ID ${target.chainId}).`
    );
  }

  if (!accept.payTo || !isAddress(accept.payTo)) {
    throw new Error(
      `Payment recipient is not configured on ${target.chain.name} (Chain ID ${target.chainId}).`
    );
  }

  // ★ On-Chain Balance Check — Stop immediately if user balance < required APAY amount
  const publicClient = createPublicClient({
    chain: target.chain,
    transport: http(target.rpcUrl),
  });
  const userBalance = await publicClient.readContract({
    address: accept.asset,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "uint256" }],
      },
    ] as const,
    functionName: "balanceOf",
    args: [account],
  });
  const requiredValue = BigInt(accept.amount ?? "0");
  const paymentAsset = getPaymentAsset(target.chainId);
  if (userBalance < requiredValue) {
    const userFormatted = formatPaymentAtomic(
      userBalance.toString(),
      paymentAsset.decimals,
      paymentAsset.symbol
    );
    const reqFormatted = formatPaymentAtomic(
      requiredValue.toString(),
      paymentAsset.decimals,
      paymentAsset.symbol
    );
    throw new Error(
      `Insufficient balance: wallet has ${userFormatted}, but ${reqFormatted} is required.`
    );
  }

  // Random 32-byte nonce
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce =
    "0x" +
    Array.from(nonceBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 30;   // tolerate 30s clock skew
  const validBefore = now + 300; // 5-minute validity window

  const typedData = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    domain: {
      name: accept.extra?.name ?? (target.chainId === 5042 || target.chainId === 5042002 ? "USDC" : "AgentPay Token"),
      version: accept.extra?.version ?? (target.chainId === 5042 || target.chainId === 5042002 ? "2" : "1"),
      chainId: target.chainId,
      verifyingContract: accept.asset,
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: account,
      to: accept.payTo,
      value: accept.amount, // atomic string from 402 challenge (e.g. "1000000000000000000")
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce,
    },
  };

  const formattedAmount = formatPaymentAtomic(
    accept.amount,
    paymentAsset.decimals,
    paymentAsset.symbol
  );
  console.info(
    `[agentpay] signing EIP-3009 auth → from=${account} to=${accept.payTo} amount=${formattedAmount} (${accept.amount} wei)`
  );

  const signature = (await withTimeout(
    ethereum.request({
      method: "eth_signTypedData_v4",
      params: [account, JSON.stringify(typedData)],
    }) as Promise<string>,
    USER_ACTION_TIMEOUT_MS,
    "Payment authorization signature"
  )) as string;

  console.info("[agentpay] EIP-3009 auth signed");

  return {
    from: account,
    to: accept.payTo,
    value: accept.amount,
    validAfter,
    validBefore,
    nonce,
    signature,
  };
}

/**
 * Legacy: pay with a raw on-chain ERC-20 transfer (kept as fallback for old servers).
 * Not called by the primary flow anymore — EIP-3009 sign is used instead.
 */
async function payExactUsdtTransfer(
  ethereum: EthereumProvider,
  accept: PaymentAccept,
  opts: PayRequestOptions
): Promise<Hash> {
  const target = chainFromCaip(accept.network);
  if (!BOTCHAIN_IDS.has(target.chainId)) {
    throw new Error(`Unsupported payment network ${accept.network}`);
  }

  const account = await resolveAccount(ethereum, opts.account);
  await ensureChain(ethereum, target, opts.switchChain);

  const amount = BigInt(accept.amount);
  if (amount <= BigInt(0)) {
    throw new Error("Invalid payment amount in 402 challenge.");
  }

  const asset = accept.asset || getPaymentAsset(target.chainId).address;

  const walletClient = createWalletClient({
    account,
    chain: target.chain,
    transport: custom(ethereum as unknown as Parameters<typeof custom>[0]),
  });
  const publicClient = createPublicClient({
    chain: target.chain,
    transport: http(target.rpcUrl),
  });

  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [accept.payTo, amount],
  });

  const hash = await withTimeout(
    walletClient.sendTransaction({
      account,
      chain: target.chain,
      to: asset,
      data,
      value: BigInt(0),
    }),
    USER_ACTION_TIMEOUT_MS,
    "APAY payment confirmation"
  );

  const receipt = await withTimeout(
    publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: RECEIPT_TIMEOUT_MS,
    }),
    RECEIPT_TIMEOUT_MS + 5_000,
    "APAY payment receipt"
  );

  if (receipt.status !== "success") {
    throw new Error("APAY payment failed on-chain. No charge was completed.");
  }

  return hash;
}

async function parseResponseOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const rawMessage =
      (typeof json?.error === "string" && json.error) ||
      (typeof json?.details === "string" && json.details) ||
      (typeof json?.message === "string" && json.message) ||
      text.slice(0, 200) ||
      res.statusText;
    const hint = typeof json?.hint === "string" && json.hint ? ` (${json.hint})` : "";
    const isQuota =
      res.status === 429 ||
      json?.errorType === "rate_limit" ||
      /quota|RESOURCE_EXHAUSTED|rate_limit|limit: 20|429/i.test(rawMessage);
    const prefix = isQuota ? "AI Quota Exceeded (429 Rate Limit): " : "";
    throw new Error(`${prefix}${rawMessage}${hint}`);
  }

  return (json ?? text) as T;
}

export type PaymentStep =
  | "idle"
  | "probing"
  | "signing"
  | "verifying"
  | "completed"
  | "error";

export function useX402Payment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [step, setStep] = useState<PaymentStep>("idle");
  const [formattedAmount, setFormattedAmount] = useState<string | null>(null);

  /**
   * Single-click x402 payment flow:
   *  1. POST unpaid → 402 challenge (payTo / asset / amount / extra)
   *  2. Sign EIP-3009 TransferWithAuthorization (wallet sign popup, no gas)
   *  3. Re-send with X-Payment: base64(signed payload) → backend verifies via BOF + serves response
   *  4. Backend settles on-chain via BOF asynchronously after response
   */
  async function executePaidRequest<T = unknown>(
    url: string,
    options: RequestInit = {},
    payOpts: PayRequestOptions = {}
  ): Promise<T> {
    setLoading(true);
    setError(null);
    setTxHash(null);
    setStep("probing");

    const init = jsonInit(options);

    try {
      console.info("[agentpay] request →", url);

      // Step 1: probe — get 402 challenge
      const probe = await fetch(url, init);
      console.info("[agentpay] probe ←", probe.status, url);

      if (probe.status !== 402) {
        setStep("completed");
        return await parseResponseOrThrow<T>(probe);
      }

      const accept = decodePaymentRequired(probe);
      if (!accept) {
        throw new Error(
          `Payment required, but the server did not return a parseable challenge.`
        );
      }

      const ethereum = payOpts.provider ?? getInjectedEthereum();
      if (!ethereum?.request) {
        throw new Error(
          `Payment required. Connect a wallet to pay for this prompt.`
        );
      }

      const account = await resolveAccount(ethereum, payOpts.account as string);
      await ensureChain(ethereum, chainFromCaip(accept.network), payOpts.switchChain);

      // Step 2: Sign EIP-3009 authorization (signature popup — no gas, no tx confirmation)
      const paidAsset = getPaymentAsset(chainFromCaip(accept.network).chainId);
      const paidFormatted = formatPaymentAtomic(
        accept.amount,
        paidAsset.decimals,
        paidAsset.symbol
      );
      setFormattedAmount(paidFormatted);
      setStep("signing");
      const authPayload = await signEip3009Authorization(ethereum, accept, account);

      // btoa produces standard base64; backend decodes with Buffer.from(str, "base64") ✓
      const xPayment = btoa(
        JSON.stringify({
          ...authPayload,
          network: accept.network,
          asset: accept.asset,
        })
      );
      setTxHash(authPayload.nonce); // use nonce as the reference token

      // Step 3: Re-send with X-Payment header (single request, no retry dance)
      setStep("verifying");
      const paid = await fetch(url, mergeHeaders(init, { "X-Payment": xPayment }));
      const result = await parseResponseOrThrow<T>(paid);
      if (result && typeof result === "object") {
        (result as any)._paidAmountFormatted = paidFormatted;
      }
      setStep("completed");
      return result;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Payment execution failed";
      console.error("[agentpay] request failed:", errMsg);
      setError(errMsg);
      setStep("error");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    executePaidRequest,
    loading,
    error,
    txHash,
    paymentStep: step,
    formattedAmount,
    clearError: () => {
      setError(null);
      setStep("idle");
      setFormattedAmount(null);
    },
  };
}
