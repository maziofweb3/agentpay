import { config } from "dotenv";
import type { FacilitatorClient } from "@x402/core/server";
import { keccak256, toBytes, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { activity } from "./activity-log.js";
import { getNetwork, isArcNetwork } from "./networks.js";

config({ path: ".env.local" });
config({ path: ".env" });

function getBofUrl(): string {
  const url = process.env.BOF_FACILITATOR_URL;
  if (!url) {
    throw new Error("FATAL: BOF_FACILITATOR_URL environment variable is missing");
  }
  return url.replace(/\/+$/, "");
}

function getCircleUrl(): string {
  return (
    process.env.CIRCLE_FACILITATOR_URL ||
    "https://api.circle.com/v1/facilitator/x402"
  ).replace(/\/+$/, "");
}

function caip(network: unknown, fallback = "eip155:5042"): string {
  if (typeof network === "string" && network.includes(":")) return network;
  if (typeof network === "string" && /^\d+$/.test(network)) return `eip155:${network}`;
  return fallback;
}

function normalizeCirclePayload(paymentPayload: any, paymentRequirements: any) {
  const network = caip(
    paymentRequirements?.network ?? paymentPayload?.network,
    "eip155:5042"
  );
  const net = getNetwork(network);
  const auth = paymentPayload?.payload?.authorization ?? paymentPayload;
  const signature = paymentPayload?.payload?.signature ?? paymentPayload?.signature;
  const payTo = paymentRequirements?.payTo ?? net.payTo ?? auth?.to;
  const amount = String(
    paymentRequirements?.amount ?? paymentRequirements?.price?.amount ?? auth?.value ?? "0"
  );
  const asset = paymentRequirements?.asset ?? net.asset;

  const body = {
    x402Version: 2,
    paymentPayload: {
      x402Version: 2,
      accepted: {
        scheme: "exact",
        network,
        amount,
        asset,
        payTo,
        maxTimeoutSeconds: 12,
        extra: {
          name: net.eip712Name,
          version: net.eip712Version,
          assetTransferMethod: "eip3009",
        },
      },
      payload: {
        signature,
        authorization: {
          from: auth?.from,
          to: auth?.to ?? payTo,
          value: String(auth?.value ?? amount),
          validAfter: String(auth?.validAfter ?? "0"),
          validBefore: String(auth?.validBefore ?? "0"),
          nonce: auth?.nonce,
        },
      },
    },
    paymentRequirements: {
      scheme: "exact",
      network,
      amount,
      asset,
      payTo,
      maxTimeoutSeconds: 12,
      extra: { name: net.eip712Name, version: net.eip712Version },
    },
  };
  return { body, network, payTo: payTo as `0x${string}`, chainId: net.chainId };
}

async function circleSellerProof(
  purpose: "verify" | "settle" | "status",
  method: string,
  body: string,
  network: string,
  payTo: `0x${string}`,
  chainId: number
): Promise<string | null> {
  const pk = process.env.SELLER_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`
  );
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = toHex(nonceBytes);
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 300;
  const signature = await account.signTypedData({
    domain: {
      name: "Circle Facilitator Seller Request",
      version: "1",
      chainId,
    },
    types: {
      SellerRequest: [
        { name: "purpose", type: "string" },
        { name: "method", type: "string" },
        { name: "bodyHash", type: "bytes32" },
        { name: "network", type: "string" },
        { name: "payTo", type: "address" },
        { name: "nonce", type: "bytes32" },
        { name: "issuedAt", type: "uint64" },
        { name: "expiresAt", type: "uint64" },
      ],
    },
    primaryType: "SellerRequest",
    message: {
      purpose,
      method: method.toUpperCase(),
      bodyHash: keccak256(toBytes(body)),
      network,
      payTo,
      nonce,
      issuedAt: BigInt(issuedAt),
      expiresAt: BigInt(expiresAt),
    },
  });
  const envelope = {
    version: 1,
    signature,
    network,
    payTo,
    nonce,
    issuedAt,
    expiresAt,
  };
  return Buffer.from(JSON.stringify(envelope)).toString("base64url");
}

function circleApiKeyFor(chainId: number): string {
  const testnet = (process.env.CIRCLE_API_KEY_TESTNET || "").trim();
  const mainnet = (process.env.CIRCLE_API_KEY_MAINNET || "").trim();
  const fallback = (process.env.CIRCLE_API_KEY || "").trim();
  if (chainId === 5042) return mainnet || fallback;
  return testnet || fallback;
}

async function circleHeaders(
  purpose: "verify" | "settle" | "status",
  body: string,
  network: string,
  payTo: `0x${string}`,
  chainId: number
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = circleApiKeyFor(chainId);
  if (apiKey) {
    // API key auth allows payTo to be the Registry contract (no seller EOA signature).
    headers.Authorization = `Bearer ${apiKey}`;
    return headers;
  }
  const proof = await circleSellerProof(purpose, "POST", body, network, payTo, chainId);
  if (proof) headers["Facilitator-Seller-Proof"] = proof;
  return headers;
}

async function circlePost(
  path: "verify" | "settle",
  paymentPayload: any,
  paymentRequirements: any
) {
  const { body, network, payTo, chainId } = normalizeCirclePayload(
    paymentPayload,
    paymentRequirements
  );
  const serialized = JSON.stringify(body);
  const headers = await circleHeaders(path, serialized, network, payTo, chainId);
  const res = await fetch(`${getCircleUrl()}/${path}`, {
    method: "POST",
    headers,
    body: serialized,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Circle /${path} HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return data;
}

const bofClient = {
  async verify(paymentPayload: any, paymentRequirements: any) {
    const bofUrl = getBofUrl();
    const chainId = Number(paymentRequirements?.network?.split(":")[1] ?? 968);
    const asset =
      paymentRequirements?.asset ??
      paymentRequirements?.price?.asset ??
      paymentPayload?.asset;
    const res = await fetch(`${bofUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheme: "ExactEvmScheme",
        chainId,
        asset,
        payload: paymentPayload,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`BOF /verify HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    if (!data.valid) {
      throw new Error(data.reason || "BOF: payment authorization invalid");
    }
    return {
      isValid: true,
      payer: data.signer ?? paymentPayload?.from ?? "0x0",
    };
  },
  async settle(paymentPayload: any, paymentRequirements: any) {
    const bofUrl = getBofUrl();
    const chainId = Number(paymentRequirements?.network?.split(":")[1] ?? 968);
    const asset =
      paymentRequirements?.asset ??
      paymentRequirements?.price?.asset ??
      paymentPayload?.asset;
    const res = await fetch(`${bofUrl}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheme: "ExactEvmScheme",
        chainId,
        asset,
        payload: paymentPayload,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`BOF /settle HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    if (!data.success) {
      throw new Error(data.error || "BOF: settlement failed");
    }
    return {
      success: true,
      transaction: data.txHash,
      network: paymentRequirements?.network ?? "eip155:968",
    };
  },
};

export const facilitator: FacilitatorClient = {
  async getSupported() {
    return {
      kinds: [
        { x402Version: 2, scheme: "exact", network: "eip155:5042" },
        { x402Version: 2, scheme: "exact", network: "eip155:5042002" },
      ],
      extensions: [],
      signers: {},
    };
  },

  async verify(paymentPayload: any, paymentRequirements: any): Promise<any> {
    const network = caip(paymentRequirements?.network ?? paymentPayload?.network);
    if (isArcNetwork(network)) {
      activity("payment.x402_verified", { phase: "contacting_circle", network });
      const data = await circlePost("verify", paymentPayload, paymentRequirements);
      if (data?.isValid === false || data?.valid === false) {
        throw new Error(data?.invalidReason || data?.reason || "Circle: authorization invalid");
      }
      return {
        isValid: true,
        payer:
          data?.payer ??
          paymentPayload?.from ??
          paymentPayload?.payload?.authorization?.from ??
          "0x0",
      };
    }
    activity("payment.x402_verified", { phase: "contacting_bof", network });
    return bofClient.verify(paymentPayload, paymentRequirements);
  },

  async settle(paymentPayload: any, paymentRequirements: any): Promise<any> {
    const network = caip(paymentRequirements?.network ?? paymentPayload?.network);
    if (isArcNetwork(network)) {
      activity("payment.x402_settled", { phase: "contacting_circle", network });
      const data = await circlePost("settle", paymentPayload, paymentRequirements);
      if (data?.success === false) {
        throw new Error(data?.errorReason || data?.reason || "Circle: settlement failed");
      }
      return {
        success: true,
        transaction: data?.transaction ?? data?.txHash,
        network,
        pending: data?.success !== true && Boolean(data?.transaction || data?.status === "pending"),
      };
    }
    activity("payment.x402_settled", { phase: "contacting_bof", network });
    return bofClient.settle(paymentPayload, paymentRequirements);
  },
};

export interface FacilitatorHealth {
  url: string;
  status: "healthy" | "unreachable" | "error";
  statusCode?: number;
  latencyMs?: number;
  data?: any;
  error?: string;
}

export async function checkFacilitatorHealth(timeoutMs = 5000): Promise<{
  default: FacilitatorHealth;
  circle: FacilitatorHealth;
  bof: FacilitatorHealth;
}> {
  const circleUrl = `${getCircleUrl()}/supported`;
  const circle = await probe(circleUrl, timeoutMs);
  let bof: FacilitatorHealth;
  try {
    bof = await probe(`${getBofUrl()}/health`, timeoutMs);
  } catch (err: any) {
    bof = {
      url: process.env.BOF_FACILITATOR_URL || "",
      status: "error",
      error: err?.message || String(err),
    };
  }
  const preferArc = isArcNetwork(getNetwork().caip2);
  return { default: preferArc ? circle : bof, circle, bof };
}

async function probe(url: string, timeoutMs: number): Promise<FacilitatorHealth> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { url, status: "error", statusCode: res.status, latencyMs, error: `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => null);
    return { url, status: "healthy", statusCode: res.status, latencyMs, data };
  } catch (err: any) {
    return {
      url,
      status: "unreachable",
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
}
