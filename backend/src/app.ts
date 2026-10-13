import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { paymentMiddleware } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { x402ResourceServer, RoutesConfig } from "@x402/core/server";
import { facilitator, checkFacilitatorHealth } from "./lib/x402-facilitator.js";
import {
  allNetworks,
  formatAtomic,
  getDefaultNetwork,
  getNetwork,
  usdToAtomic,
} from "./lib/networks.js";
import {
  getActiveModel,
  getActiveGeminiModel,
  getActiveGroqModel,
  generateChatResponse,
  enhanceImagePrompt,
  generateImageVisual,
  auditCodeSnippet,
  checkQuotaStatus,
  AIProvider,
} from "./lib/ai.js";
import {
  amountForPaidRoute,
  PAYMENT_TX_HEADER,
  verifyUsdtTransferPayment,
  consumePaymentTx,
} from "./lib/usdt-transfer-payment.js";
import { trySessionPayment } from "./lib/session-payment.js";
import { activity } from "./lib/activity-log.js";
import {
  validateTextField,
  preview,
  aiErrorStatus,
  aiErrorHint,
  cleanErrorMessage,
} from "./lib/validation.js";
import { handleCreditsDeposit } from "./lib/prepaid-ledger.js";
import { formatReputationSummary } from "./lib/erc8004.js";
import { appendAttributionTag } from "./lib/attribution.js";
import {
  getApayPriceUsd,
  calculatePromptApayWei,
} from "./lib/apay-price.js";
import { createPublicClient, http, isAddress, parseAbi } from "viem";

async function checkApayOnChainBalance(
  userAddress: string,
  tokenAddress: `0x${string}`,
  rpcUrl: string
): Promise<bigint> {
  if (!userAddress || !isAddress(userAddress) || !tokenAddress || !isAddress(tokenAddress)) {
    return BigInt(0);
  }
  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const bal = await client.readContract({
      address: tokenAddress,
      abi: parseAbi([
        "function balanceOf(address account) view returns (uint256)",
      ]),
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    });
    return bal as bigint;
  } catch (err) {
    console.warn(`[balance-check] Failed to read on-chain APAY balance for ${userAddress}:`, err);
    return BigInt(0);
  }
}

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-AgentPay-Payment-Tx",
      "PAYMENT-SIGNATURE",
      "X-Payment",
      "X-Network",
      "X-Chain-Id",
      "x-network",
      "x-chain-id",
    ],
    exposedHeaders: [
      "Payment-Required",
      "payment-required",
      "PAYMENT-REQUIRED",
      "PAYMENT-RESPONSE",
      "X-PAYMENT-RESPONSE",
      "X-AgentPay-Charged",
      "X-AgentPay-Remaining",
      "X-AgentPay-Payment-Tx",
    ],
    maxAge: 86400,
  }),
);

// Route-aware JSON body limit:
//   /api/image — 10 MB (accepts base64-encoded image uploads up to ~7 MB)
//   all others  — 1 MB  (tight limit to prevent abuse)
const jsonParserImage = express.json({ limit: "10mb" });
const jsonParserDefault = express.json({ limit: "1mb" });

app.use((req: Request, res: Response, next: NextFunction) => {
  const url = req.originalUrl || req.url || "";
  if (url.includes("/api/image")) {
    return jsonParserImage(req, res, next);
  }
  return jsonParserDefault(req, res, next);
});

function formatPayment(amount: bigint | string, net = getDefaultNetwork()): string {
  return formatAtomic(amount, net.assetSymbol, net.decimals);
}

// Request Access Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;

  res.on("finish", () => {
    // Skip health probes and CORS preflight — they add noise with zero signal
    if (!url.includes("/health") && method !== "OPTIONS") {
      activity("request.access", {
        method,
        path: url,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    }
  });

  next();
});

const defaultNet = getDefaultNetwork();
const activeCaip = defaultNet.caip2;
const activeChainId = defaultNet.chainId;
const activeRpcUrl = defaultNet.rpcUrl;
const apayAddress = defaultNet.asset;
const payToAddress = defaultNet.payTo;

const server = new x402ResourceServer(facilitator);
for (const net of allNetworks()) {
  server.register(net.caip2, new ExactEvmScheme());
}

// GET /api/price — returns current pricing status and cache info
app.get("/api/price", async (_req: Request, res: Response) => {
  const priceInfo = await getApayPriceUsd();
  return res.json({
    status: "ok",
    token: "USDC",
    ...priceInfo,
  });
});

// Health check endpoints
const healthHandler = async (_req: Request, res: Response) => {
  const [priceInfo, facilitatorHealth] = await Promise.all([
    getApayPriceUsd(),
    checkFacilitatorHealth(),
  ]);

  const isHealthy = facilitatorHealth.default.status === "healthy";
  return res.json({
    status: isHealthy ? "ok" : "degraded",
    service: "AgentPay AI API Gateway (Express)",
    timestamp: new Date().toISOString(),
    aiProvider: `Groq ${getActiveGroqModel()} (Primary) / Google ${getActiveGeminiModel()} (Backup) / Anthropic ${getActiveModel()}`,
    defaultModel: `groq (${getActiveGroqModel()})`,
    groqModel: getActiveGroqModel(),
    geminiModel: getActiveGeminiModel(),
    claudeModel: getActiveModel(),
    network: defaultNet.caip2,
    chainId: defaultNet.chainId,
    paymentAsset: defaultNet.assetSymbol,
    paymentAssetOnly: false,
    usdcAsset: defaultNet.asset,
    apayPriceUsd: priceInfo.priceUsd,
    apayPriceSource: priceInfo.source,
    baseComputeUnitUsd: priceInfo.baseComputeUnitUsd,
    servicePrices: priceInfo.servicePrices,
    paymentMethods: ["prepaid-session", "x402-exact-eip3009"],
    paymentTxHeader: "X-AgentPay-Payment-Tx",
    sessionHeader: "Authorization: Bearer <sessionToken>",
    creditsDeposit: "/api/credits/deposit",
    rpcUrl: defaultNet.rpcUrl,
    supportedNetworks: allNetworks().map((n) => ({
      name: n.name,
      caip2: n.caip2,
      chainId: n.chainId,
      paymentAsset: n.assetSymbol,
      asset: n.asset,
      decimals: n.decimals,
    })),
    payTo: defaultNet.payTo,
    payToType: "AgentPayRegistry UUPS ERC1967 Proxy Smart Contract Vault",
    facilitator: facilitatorHealth.default,
    facilitators: {
      circle: facilitatorHealth.circle,
      bof: facilitatorHealth.bof,
    },
    circleApiKeyConfigured: {
      testnet: Boolean(
        (process.env.CIRCLE_API_KEY_TESTNET || process.env.CIRCLE_API_KEY || "").trim()
      ),
      mainnet: Boolean(
        (process.env.CIRCLE_API_KEY_MAINNET || process.env.CIRCLE_API_KEY || "").trim()
      ),
    },
  });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// Payment Gate Middleware with Single Source of Truth Dynamic Billing
app.use("/api/*", async (req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  const pathname = req.baseUrl
    ? req.baseUrl.replace(/\/+$/, "") + req.path
    : req.path;
  const fullPath = pathname.startsWith("/api") ? pathname : `/api${pathname}`;

  if (method !== "POST") {
    return next();
  }

  const priceInfo = await getApayPriceUsd();
  const promptText = (req.body?.prompt ?? req.body?.code ?? req.body?.message ?? "").toString();
  const provider = (req.body?.provider ?? (req.headers["x-provider"] as string) ?? "").toString();
  const hasImage = typeof req.body?.image === "string" && req.body.image.length > 0;

  const billing = calculatePromptApayWei({
    fullPath,
    promptText,
    provider,
    hasImage,
    apayPriceUsd: priceInfo.priceUsd,
  });

  if (billing === null) {
    return next();
  }

  const requestedNetworkHeader = (
    req.headers["x-network"] ||
    req.headers["x-chain-id"] ||
    (req.body && (req.body.network || req.body.chainId))
  ) as string | number | undefined;

  let requestedNet = defaultNet;
  if (requestedNetworkHeader !== undefined && requestedNetworkHeader !== "") {
    try {
      requestedNet = getNetwork(String(requestedNetworkHeader));
    } catch {
      requestedNet = defaultNet;
    }
  }

  // ★ Pre-Flight Quota Check — reject BEFORE payment challenge if model key is out of quota
  const resolvedProvider: AIProvider = provider === "claude" ? "claude" : provider === "gemini" ? "gemini" : "groq";
  let quotaCheck = checkQuotaStatus(resolvedProvider);
  if (quotaCheck.exceeded && resolvedProvider === "groq") {
    // If Groq is temporarily exhausted, check if fallback Gemini is available!
    const geminiCheck = checkQuotaStatus("gemini");
    if (!geminiCheck.exceeded) {
      quotaCheck = { exceeded: false, retryInSec: 0 };
    }
  }
  if (quotaCheck.exceeded) {
    activity(
      "request.reject",
      { path: fullPath, provider: resolvedProvider, reason: "quota_circuit_breaker", retryInSec: quotaCheck.retryInSec },
      "warn"
    );
    return res.status(429).json({
      success: false,
      tool: fullPath,
      error: `AI provider (${resolvedProvider}) rate limit or quota is currently exhausted. Please retry in ${quotaCheck.retryInSec}s or switch model provider.`,
      errorType: "rate_limit",
      hint: `${resolvedProvider.toUpperCase()} rate limit reached. Retry in ${quotaCheck.retryInSec}s or select another provider.`,
      retryInSeconds: quotaCheck.retryInSec,
      timestamp: new Date().toISOString(),
    });
  }

  const {
    targetUsdCost,
    modelKey,
    modelName,
    inputTokens,
    outputTokenBudget,
    rawComputeUsd,
    profitUsd,
  } = {
    targetUsdCost: billing.totalUsd,
    modelKey: billing.modelKey,
    modelName: billing.modelName,
    inputTokens: billing.inputTokens,
    outputTokenBudget: billing.outputTokenBudget,
    rawComputeUsd: billing.rawComputeUsd,
    profitUsd: billing.profitUsd,
  };

  const requiredOn = (net: ReturnType<typeof getNetwork>) =>
    net.assetSymbol === "USDC"
      ? usdToAtomic(billing.totalUsd, 6)
      : billing.requiredAmount;

  // ── Path 0: EIP-3009 x402 authorization (new single-click flow) ───────────
  const xPayment = (req.headers["x-payment"] ?? req.headers["X-Payment"]) as
    | string
    | undefined;
  if (xPayment) {
    try {
      const payload = JSON.parse(
        Buffer.from(xPayment, "base64").toString("utf8"),
      );

      const payNet = getNetwork(
        payload.network ?? payload.accepted?.network ?? requestedNet.caip2
      );
      (req as any).activeNetwork = payNet;
      const requiredAmount = requiredOn(payNet);
      const paymentValue = BigInt(payload.value ?? payload.payload?.authorization?.value ?? "0");
      if (paymentValue < requiredAmount) {
        const needFormatted = formatPayment(requiredAmount, payNet);
        const gotFormatted = formatPayment(paymentValue, payNet);
        activity(
          "payment.x402_fail",
          {
            path: fullPath,
            reason: `underpaid: got ${gotFormatted}, need ${needFormatted}`,
          },
          "warn"
        );
        return res.status(402).json({
          error: `Insufficient payment: need ${needFormatted}, got ${gotFormatted}`,
          requiredAmount: requiredAmount.toString(),
          requiredAmountFormatted: needFormatted,
          network: payNet.caip2,
        });
      }

      await facilitator.verify(payload, {
        network: payNet.caip2,
        asset: payNet.asset,
        payTo: payNet.payTo,
        amount: requiredAmount.toString(),
      } as any);
      activity("payment.x402_verified", {
        path: fullPath,
        amount: formatPayment(paymentValue, payNet),
        from: String(payload.from ?? payload.payload?.authorization?.from).slice(0, 12),
        network: payNet.caip2,
      });

      const payer = String(payload.from ?? payload.payload?.authorization?.from ?? "");
      const userOnChainBalance = await checkApayOnChainBalance(
        payer,
        payNet.asset,
        payNet.rpcUrl
      );
      if (userOnChainBalance < paymentValue) {
        const needFormatted = formatPayment(paymentValue, payNet);
        const userFormatted = formatPayment(userOnChainBalance, payNet);
        activity(
          "payment.x402_fail",
          {
            path: fullPath,
            reason: `insufficient on-chain balance: user has ${userFormatted}, requires ${needFormatted}`,
          },
          "warn"
        );
        return res.status(402).json({
          error: `Insufficient ${payNet.assetSymbol} balance on-chain: wallet has ${userFormatted}, required ${needFormatted}`,
          requiredAmount: paymentValue.toString(),
          requiredAmountFormatted: needFormatted,
          userBalance: userOnChainBalance.toString(),
          userBalanceFormatted: userFormatted,
          network: payNet.caip2,
        });
      }

      res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          (
            facilitator.settle(payload, {
              network: payNet.caip2,
              asset: payNet.asset,
              payTo: payNet.payTo,
              amount: requiredAmount.toString(),
            } as any) as Promise<any>
          )
            .then((r: any) =>
              activity("payment.x402_settled", {
                path: fullPath,
                amount: formatPayment(paymentValue, payNet),
                tx: String(r.transaction ?? "").slice(0, 14),
                network: payNet.caip2,
              })
            )
            .catch((e: Error) =>
              activity(
                "payment.settle_fail",
                { path: fullPath, amount: formatPayment(paymentValue, payNet), reason: e.message },
                "warn"
              )
            );
        }
      });

      return next();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Payment verification failed";
      activity("payment.x402_fail", { path: fullPath, reason: msg }, "warn");
      return res.status(402).json({
        error: msg,
        paymentAsset: requestedNet.assetSymbol,
        network: requestedNet.caip2,
      });
    }
  }

  // ── Path 1: Legacy on-chain USDT transfer proof ───────────────────────────
  const txHash = (req.headers[PAYMENT_TX_HEADER.toLowerCase()] ||
    req.headers["x-agentpay-payment-tx"]) as string | undefined;
  if (txHash) {
    try {
      (req as any).activeNetwork = requestedNet;
      const result = await verifyUsdtTransferPayment({
        txHash,
        apayAddress,
        payTo: payToAddress,
        minAmountAtomic: requiredOn(requestedNet),
        chainId: requestedNet.chainId,
        rpcUrl: requestedNet.rpcUrl,
      });
      activity("payment.transfer_ok", {
        path: fullPath,
        txHash: result.txHash,
        from: result.from,
        amountAtomic: result.amount.toString(),
      });

      // Hook response listener to consume tx after successful response
      res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          consumePaymentTx(result.txHash);
          activity("payment.consumed", {
            path: fullPath,
            txHash: result.txHash,
            status: res.statusCode,
          });
        } else {
          activity(
            "payment.transfer_ok",
            {
              path: fullPath,
              txHash: result.txHash,
              note: "handler_failed_tx_not_consumed",
              status: res.statusCode,
            },
            "warn",
          );
        }
      });

      return next();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid USDT payment transaction";
      activity(
        "payment.transfer_fail",
        { path: fullPath, reason: message },
        "warn",
      );
      return res.status(402).json({
        error: message,
        paymentAsset: requestedNet.assetSymbol,
        payTo: requestedNet.payTo,
        requiredAmount: requiredOn(requestedNet).toString(),
        network: requestedNet.caip2,
      });
    }
  }

  // 2) Prepaid session
  const auth = req.headers["authorization"];
  if (auth) {
    try {
      (req as any).activeNetwork = requestedNet;
      const paid = trySessionPayment(auth, requiredOn(requestedNet), fullPath);
      if (paid) {
        res.setHeader("X-AgentPay-Charged", paid.chargedAtomic.toString());
        res.setHeader("X-AgentPay-Remaining", paid.remainingAtomic.toString());
        return next();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Session payment failed";
      activity(
        "payment.session_fail",
        { path: fullPath, reason: message },
        "warn",
      );
    }
  }

  // 3) Fallback x402 Challenge — clean 402 response with dynamic pre-challenge token billing
  const challengeNet = requestedNet;

  activity("payment.challenge", {
    path: fullPath,
    modelKey,
    modelName,
    inputTokens,
    outputTokenBudget,
    rawComputeUsd,
    profitUsd,
    computeCostUsd: targetUsdCost,
    apayPriceUsd: priceInfo.priceUsd,
    requiredAmount: requiredOn(challengeNet).toString(),
    requiredAmountFormatted: formatPayment(requiredOn(challengeNet), challengeNet),
    network: challengeNet.caip2,
  });

  const availableNetworks = allNetworks().filter((n) => n.payTo);
  availableNetworks.sort((a, b) => (a.caip2 === challengeNet.caip2 ? -1 : b.caip2 === challengeNet.caip2 ? 1 : 0));

  const paymentAccept = {
    accepts: availableNetworks.map((n) => ({
      scheme: "exact",
      network: n.caip2,
      amount: requiredOn(n).toString(),
      asset: n.asset,
      payTo: n.payTo,
      extra: {
        name: n.eip712Name,
        version: n.eip712Version,
        assetTransferMethod: "eip3009",
      },
    })),
  };

  const headerBase64 = Buffer.from(JSON.stringify(paymentAccept)).toString(
    "base64"
  );
  res.setHeader("payment-required", headerBase64);
  res.setHeader("Payment-Required", headerBase64);

  return res.status(402).json({
    error: `Payment required: ${formatPayment(requiredOn(challengeNet), challengeNet)}`,
    accepts: paymentAccept.accepts,
    paymentAsset: challengeNet.assetSymbol,
    requiredAmount: requiredOn(challengeNet).toString(),
    requiredAmountFormatted: formatPayment(requiredOn(challengeNet), challengeNet),
    modelKey,
    modelName,
    inputTokens,
    outputTokenBudget,
    rawComputeUsd,
    profitUsd,
    totalUsd: targetUsdCost,
    computeCostUsd: targetUsdCost,
    apayPriceUsd: priceInfo.priceUsd,
    network: challengeNet.caip2,
    payTo: challengeNet.payTo,
  });
});

// Route Endpoints
app.post("/api/chat", async (req: Request, res: Response) => {
  const body = req.body || {};
  const validated = validateTextField(body.prompt, "prompt");
  if (!validated.ok) {
    activity(
      "request.reject",
      { tool: "chat", reason: validated.error },
      "warn",
    );
    return res
      .status(400)
      .json({ success: false, tool: "chat", error: validated.error });
  }
  const prompt = validated.value;
  const rawProvider = (body.provider || req.headers["x-provider"] || "groq").toString().toLowerCase();
  const provider: AIProvider = rawProvider === "claude" ? "claude" : rawProvider === "gemini" ? "gemini" : "groq";

  const requestedNetHeader = (
    req.headers["x-network"] ||
    req.headers["x-chain-id"] ||
    body.network ||
    body.chainId
  ) as string | number | undefined;
  let activeNet = (req as any).activeNetwork;
  if (!activeNet && requestedNetHeader !== undefined && requestedNetHeader !== "") {
    try {
      activeNet = getNetwork(String(requestedNetHeader));
    } catch {
      activeNet = defaultNet;
    }
  }
  if (!activeNet) {
    activeNet = defaultNet;
  }
  const networkName = activeNet?.name;

  activity("ai.chat", {
    phase: "start",
    provider,
    network: activeNet?.caip2,
    networkName,
    promptPreview: preview(prompt),
  });

  const priceInfo = await getApayPriceUsd();
  const billing = calculatePromptApayWei({
    fullPath: "/api/chat",
    promptText: prompt,
    provider,
    apayPriceUsd: priceInfo.priceUsd,
  });

  const result = await generateChatResponse(
    prompt,
    provider,
    billing?.outputTokenBudget,
    networkName
  );
  if (!result.ok) {
    const status = aiErrorStatus(result.errorType);
    activity(
      "ai.error",
      {
        tool: "chat",
        errorType: result.errorType,
        status,
        details: cleanErrorMessage(result.error),
      },
      "error",
    );
    return res.status(status).json({
      success: false,
      tool: "chat",
      error:
        result.errorType === "rate_limit"
          ? "AI provider quota/rate limit exceeded (429 RESOURCE_EXHAUSTED)"
          : result.error || "AI response unavailable",
      errorType: result.errorType,
      hint: aiErrorHint(result.errorType),
      details: result.error,
      timestamp: new Date().toISOString(),
    });
  }

  activity("ai.chat", {
    phase: "ok",
    model: result.model,
    chars: result.text.length,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    truncated: result.truncated,
  });

  return res.json({
    success: true,
    tool: "chat",
    prompt,
    response: result.text,
    model: result.model,
    truncated: result.truncated,
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/image", async (req: Request, res: Response) => {
  const body = req.body || {};

  // Vision mode: image uploaded for analysis
  const imageBase64: string | undefined =
    typeof body.image === "string" && body.image.length > 0 ? body.image : undefined;

  const rawPrompt: string = typeof body.prompt === "string" ? body.prompt.trim() : "";

  // Require at least a prompt (for text-to-image) or an image (for vision)
  if (!rawPrompt && !imageBase64) {
    return res.status(400).json({ success: false, tool: "image", error: "prompt or image is required" });
  }

  const rawProvider = (body.provider || req.headers["x-provider"] || "groq").toString().toLowerCase();
  const provider: AIProvider = rawProvider === "claude" ? "claude" : rawProvider === "gemini" ? "gemini" : "groq";
  activity("ai.image", { phase: "start", provider, hasImage: !!imageBase64, promptPreview: preview(rawPrompt) });

  // ── Vision mode: analyze the uploaded image ──────────────────────────────
  if (imageBase64) {
    const priceInfo = await getApayPriceUsd();
    const billing = calculatePromptApayWei({
      fullPath: "/api/image",
      promptText: rawPrompt || "",
      provider,
      hasImage: true,
      apayPriceUsd: priceInfo.priceUsd,
    });
    const result = await enhanceImagePrompt(
      rawPrompt || "",
      provider,
      imageBase64,
      billing?.outputTokenBudget
    );
    if (!result.ok) {
      const status = aiErrorStatus(result.errorType);
      activity("ai.error", { tool: "image", errorType: result.errorType, status, details: cleanErrorMessage(result.error) }, "error");
      return res.status(status).json({
        success: false,
        tool: "image",
        error:
          result.errorType === "rate_limit"
            ? "AI provider quota/rate limit exceeded (429 RESOURCE_EXHAUSTED)"
            : result.error || "Image vision analysis unavailable",
        errorType: result.errorType,
        hint: aiErrorHint(result.errorType),
        details: result.error,
        timestamp: new Date().toISOString(),
      });
    }
    activity("ai.image", { phase: "vision_ok", chars: result.text.length });
    return res.json({
      success: true,
      tool: "image",
      mode: "vision",
      rawPrompt,
      analysis: result.text,
      model: result.model,
      usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
      timestamp: new Date().toISOString(),
    });
  }

  // ── Text-to-Image mode ────────────────────────────────────────────────────
  // Step 1: Enhance the prompt
  const validated = validateTextField(rawPrompt, "prompt");
  if (!validated.ok) {
    activity("request.reject", { tool: "image", reason: validated.error }, "warn");
    return res.status(400).json({ success: false, tool: "image", error: validated.error });
  }

  const enhanceResult = await enhanceImagePrompt(validated.value, provider);
  if (!enhanceResult.ok) {
    const status = aiErrorStatus(enhanceResult.errorType);
    activity("ai.error", { tool: "image", errorType: enhanceResult.errorType, status, details: cleanErrorMessage(enhanceResult.error) }, "error");
    return res.status(status).json({
      success: false,
      tool: "image",
      error:
        enhanceResult.errorType === "rate_limit"
          ? "AI provider quota/rate limit exceeded (429 RESOURCE_EXHAUSTED)"
          : enhanceResult.error || "Image prompt enhancement unavailable",
      errorType: enhanceResult.errorType,
      hint: aiErrorHint(enhanceResult.errorType),
      details: enhanceResult.error,
      timestamp: new Date().toISOString(),
    });
  }

  // Step 2: Generate image with Imagen 3
  const imageResult = await generateImageVisual(enhanceResult.text);
  if (!imageResult.ok) {
    // Fallback: return enhanced prompt text and a placeholder if Imagen fails
    activity("ai.image", { phase: "imagen_failed_fallback", reason: imageResult.error }, "warn");
    return res.json({
      success: true,
      tool: "image",
      mode: "text-to-image",
      rawPrompt: validated.value,
      enhancedPrompt: enhanceResult.text,
      imageUrl: `https://placehold.co/512x512/0f172a/f59e0b?text=${encodeURIComponent(validated.value)}`,
      imageFallback: true,
      model: enhanceResult.model,
      usage: { inputTokens: enhanceResult.inputTokens, outputTokens: enhanceResult.outputTokens },
      timestamp: new Date().toISOString(),
    });
  }

  activity("ai.image", { phase: "ok", mode: "text-to-image" });
  return res.json({
    success: true,
    tool: "image",
    mode: "text-to-image",
    rawPrompt: validated.value,
    enhancedPrompt: enhanceResult.text,
    imageUrl: imageResult.imageDataUri,
    model: enhanceResult.model,
    usage: { inputTokens: enhanceResult.inputTokens, outputTokens: enhanceResult.outputTokens },
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/code", async (req: Request, res: Response) => {
  const body = req.body || {};
  const validated = validateTextField(body.code, "code");
  if (!validated.ok) {
    activity(
      "request.reject",
      { tool: "code", reason: validated.error },
      "warn",
    );
    return res
      .status(400)
      .json({ success: false, tool: "code", error: validated.error });
  }
  const code = validated.value;
  const rawProvider = (body.provider || req.headers["x-provider"] || "groq").toString().toLowerCase();
  const provider: AIProvider = rawProvider === "claude" ? "claude" : rawProvider === "gemini" ? "gemini" : "groq";
  activity("ai.code", { phase: "start", provider, codePreview: preview(code) });

  const priceInfo = await getApayPriceUsd();
  const billing = calculatePromptApayWei({
    fullPath: "/api/code",
    promptText: code,
    provider,
    apayPriceUsd: priceInfo.priceUsd,
  });

  const result = await auditCodeSnippet(
    code,
    provider,
    billing?.outputTokenBudget
  );
  if (!result.ok) {
    const status = aiErrorStatus(result.errorType);
    activity(
      "ai.error",
      {
        tool: "code",
        errorType: result.errorType,
        status,
        details: cleanErrorMessage(result.error),
      },
      "error",
    );
    return res.status(status).json({
      success: false,
      tool: "code",
      error:
        result.errorType === "rate_limit"
          ? "AI provider quota/rate limit exceeded (429 RESOURCE_EXHAUSTED)"
          : result.error || "Code audit unavailable — no verdict was produced",
      errorType: result.errorType,
      hint: aiErrorHint(result.errorType),
      details: result.error,
      timestamp: new Date().toISOString(),
    });
  }

  activity("ai.code", {
    phase: "ok",
    score: result.audit.score,
    vulnerabilities: result.audit.vulnerabilities,
  });
  return res.json({
    success: true,
    tool: "code",
    audit: result.audit,
    model: result.model,
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/reputation", async (req: Request, res: Response) => {
  const body = req.body || {};
  const agentAddress =
    typeof body.agentAddress === "string" ? body.agentAddress : undefined;
  const formatted = formatReputationSummary(85, 12);
  return res.json({
    success: true,
    tool: "reputation",
    agentAddress: agentAddress ?? null,
    reputation: formatted,
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/attribution", async (req: Request, res: Response) => {
  const body = req.body || {};
  const data = typeof body.data === "string" ? body.data : "0x";
  const taggedData = appendAttributionTag(data);
  return res.json({
    success: true,
    tool: "attribution",
    originalData: data,
    taggedData,
    attributionTag: "0x8021",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/credits/deposit", async (req: Request, res: Response) => {
  return handleCreditsDeposit(req, res, {
    usdtAddress: apayAddress,
    payTo: payToAddress,
    chainId: activeChainId,
    rpcUrl: activeRpcUrl,
    network: activeCaip,
  });
});

export { app };
export default app;
