"use client";

import { useState, useRef } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { usePaidService } from "@/hooks/usePaidService";
import { useBackendWarmup } from "@/hooks/useBackendWarmup";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import {
  Image as ImageIcon,
  Sparkles,
  Loader2,
  ArrowLeft,
  Download,
  Wallet,
  Cpu,
  Upload,
  X,
  Eye,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

import { useApayPrice } from "@/hooks/useApayPrice";
import { formatServiceCharge } from "@/lib/pricing";

interface ImageResponse {
  imageUrl?: string;
  analysis?: string;
  enhancedPrompt?: string;
  mode?: "text-to-image" | "vision";
  imageFallback?: boolean;
}

export default function ImagePage() {
  // Wake the Render free-tier backend on page load (prevents cold-start payment timeouts)
  useBackendWarmup();
  const allowNetworkSwitch = useCanSwitchNetwork();
  const { disconnectWallet, switchOrAddChain } = useWallet();
  const { servicePrices } = useApayPrice();
  const {
    address,
    authenticated,
    connectWallet,
    isTestnet,
    isArc,
    currentChainId,
    runPaid,
    loading: paidLoading,
    error: paymentError,
    paymentStep,
    formattedAmount,
  } = usePaidService("image");
  const {
    botBalance,
    apayBalance,
    usdcBalance,
    usdtBalance,
    bousdtBalance,
    paymentBalance,
    paymentSymbol,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);

  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<"gemini" | "claude">("gemini");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // base64 data URL
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setUploadedFileName(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function clearUpload() {
    setUploadedImage(null);
    setUploadedFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate() {
    if ((!prompt.trim() && !uploadedImage) || loading || paidLoading) return;
    if (Number(paymentBalance) <= 0) {
      setError(
        `Insufficient ${paymentSymbol} balance: your wallet currently has ${paymentBalance} ${paymentSymbol}. Top up on ${isArc ? "Arc" : "BotChain"} to pay for image services.`
      );
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const payload: Record<string, string> = { provider };
      if (prompt.trim()) payload.prompt = prompt.trim();
      if (uploadedImage) payload.image = uploadedImage;

      const data = await runPaid<ImageResponse>(payload);

      if (!data) throw new Error("No response from server");
      // Vision mode returns analysis text; text-to-image returns imageUrl
      if (!data.imageUrl && !data.analysis) {
        throw new Error("No image or analysis returned from the server");
      }
      setResult(data);
      refetch();
    } catch (err: unknown) {
      console.error("Image generation error:", err);
      setError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || paidLoading;
  const canGenerate = !busy && (!!prompt.trim() || !!uploadedImage);

  return (
    <main className="flex flex-col h-[calc(100dvh-0px)] max-w-md mx-auto bg-slate-950 text-slate-100 shadow-2xl border-x border-slate-800 overflow-hidden">
      <BalanceBar
        address={address}
        botBalance={botBalance}
        apayBalance={apayBalance}
        usdcBalance={usdcBalance}
        usdtBalance={usdtBalance}
        bousdtBalance={bousdtBalance}
        loading={balanceLoading}
        onRefresh={refetch}
        onDisconnect={disconnectWallet}
        currentChainId={currentChainId}
        isTestnet={isTestnet}
        onSwitchNetwork={(chainId) => switchOrAddChain(chainId)}
        allowNetworkSwitch={allowNetworkSwitch}
      />

      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="p-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <h1 className="font-bold text-white text-base">AI Image Studio</h1>
          </div>
        </div>
        <span className="text-xs font-bold bg-slate-900 text-amber-400 px-2.5 py-1 rounded-lg border border-slate-800">
          {uploadedImage
            ? `${formatServiceCharge(servicePrices.chat.targetUsdCost, servicePrices.chat.amountTokens, currentChainId)} / analysis (Vision)`
            : `${formatServiceCharge(servicePrices.image.targetUsdCost, servicePrices.image.amountTokens, currentChainId)} / image (Imagen 3)`}
        </span>
      </div>

      {/* Model Selector Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
          <Cpu className="w-3.5 h-3.5 text-amber-400" />
          <span>Model:</span>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 space-x-1">
          <button
            onClick={() => setProvider("gemini")}
            className={`px-2.5 py-1 rounded-md font-semibold transition text-[11px] ${
              provider === "gemini"
                ? "bg-amber-500 text-slate-950 shadow font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ✨ Gemini 3.6 Flash
          </button>
          <button
            onClick={() => setProvider("claude")}
            className={`px-2.5 py-1 rounded-md font-semibold transition text-[11px] ${
              provider === "claude"
                ? "bg-purple-500 text-white shadow font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Claude 3.5
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Info Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Text-to-Image & Vision Analysis</span>
          </div>
          <p className="text-slate-400">
            Generate images with Imagen 3 (~5 $APAY) or upload an image for AI vision analysis (~1 $APAY). Powered by x402 micropayments.
          </p>
        </div>

        {/* Connect Wallet Prompt */}
        {!authenticated || !address ? (
          <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-4 space-y-3 text-xs">
            <p className="text-purple-100 font-medium">Connect a wallet to pay with $APAY</p>
            <button
              onClick={() => connectWallet()}
              className="w-full flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-400 text-white font-semibold py-2.5 rounded-xl transition"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </div>
        ) : null}

        {/* Payment Status */}
        {paymentStep === "signing" && (
          <div className="bg-amber-950/40 border border-amber-800/80 text-amber-300 rounded-xl p-3 text-xs flex items-center space-x-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>🔑 Sign {formattedAmount || "$APAY"} payment authorization in your wallet (0 gas)...</span>
          </div>
        )}
        {paymentStep === "verifying" && (
          <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 rounded-xl p-3 text-xs flex items-center space-x-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>🔍 Authorization signed! Verifying payment with BOF Facilitator...</span>
          </div>
        )}

        {/* Errors */}
        {paymentError && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl p-3 text-xs">
            {paymentError}
          </div>
        )}
        {error && (
          <div
            className={`rounded-xl p-3.5 text-xs space-y-1.5 ${
              /quota|429|rate_limit|RESOURCE_EXHAUSTED|limit: 20/i.test(error)
                ? "bg-amber-950/60 border border-amber-500/60 text-amber-200"
                : "bg-rose-950/40 border border-rose-800 text-rose-300"
            }`}
          >
            <div className="font-semibold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {/quota|429|rate_limit|RESOURCE_EXHAUSTED|limit: 20/i.test(error)
                  ? "AI Quota Exceeded (HTTP 429)"
                  : "Request Error"}
              </span>
            </div>
            <p className="leading-relaxed opacity-90">{error}</p>
          </div>
        )}

        {/* Generated Image Result */}
        {result?.imageUrl && (
          <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-4 space-y-3 text-center">
            {result.imageFallback && (
              <p className="text-xs text-amber-400/70 italic">
                Imagen 3 unavailable — showing placeholder. Enhanced prompt was generated.
              </p>
            )}
            {result.enhancedPrompt && !result.imageFallback && (
              <p className="text-xs text-slate-500 italic truncate">"{result.enhancedPrompt}"</p>
            )}
            <img
              src={result.imageUrl}
              alt="AI Generated Visual"
              className="w-full rounded-lg border border-slate-800 object-contain max-h-80"
            />
            <div className="flex justify-center">
              <a
                href={result.imageUrl}
                download="agentpay-image.png"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Image</span>
              </a>
            </div>
          </div>
        )}

        {/* Vision Analysis Result */}
        {result?.analysis && (
          <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>Vision Analysis</span>
            </div>
            {uploadedImage && (
              <img
                src={uploadedImage}
                alt="Uploaded for analysis"
                className="w-full max-h-40 object-contain rounded-lg border border-slate-800 opacity-70"
              />
            )}
            <div className="text-slate-200 leading-relaxed text-xs">
              <ChatMarkdown text={result.analysis} />
            </div>
          </div>
        )}
      </div>

      {/* Input Panel */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 space-y-3 shrink-0">
        {/* Image Upload Dropzone */}
        {!uploadedImage ? (
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center space-y-1.5 border-2 border-dashed rounded-xl p-3 cursor-pointer transition text-xs ${
              dragOver
                ? "border-amber-400 bg-amber-950/20"
                : "border-slate-700 hover:border-slate-600 hover:bg-slate-900/40"
            }`}
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500">
              Drop an image to analyze, or <span className="text-amber-400 font-medium">browse</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-900 border border-emerald-800/40 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <img src={uploadedImage} alt="preview" className="w-8 h-8 object-cover rounded" />
              <span className="text-slate-300 truncate">{uploadedFileName}</span>
              <span className="text-emerald-400 font-semibold shrink-0">Vision Mode</span>
            </div>
            <button onClick={clearUpload} className="ml-2 text-slate-500 hover:text-rose-400 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Prompt input */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
            }}
            placeholder={
              uploadedImage
                ? "Ask about the image (optional) or leave blank to describe it..."
                : authenticated && address
                ? "Describe the image to generate..."
                : "Connect wallet to use AI Image Studio..."
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pr-12 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 resize-none h-16"
          />
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            title={uploadedImage ? "Analyze Image (Vision mode ~1 $APAY)" : "Generate Image (Imagen 3 ~5 $APAY)"}
            className="absolute bottom-2.5 right-2.5 p-2 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 text-slate-950 rounded-lg transition"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : uploadedImage ? (
              <Eye className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
