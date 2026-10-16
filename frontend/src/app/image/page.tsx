"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { usePaidService } from "@/hooks/usePaidService";
import { useBackendWarmup } from "@/hooks/useBackendWarmup";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { useApayPrice } from "@/hooks/useApayPrice";
import { formatServiceCharge } from "@/lib/pricing";
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
  CheckCircle2,
  Layers,
  Ratio,
  Zap,
} from "lucide-react";

interface ImageResponse {
  imageUrl?: string;
  analysis?: string;
  enhancedPrompt?: string;
  mode?: "text-to-image" | "vision";
  imageFallback?: boolean;
}

const SAMPLE_IMAGE_PROMPTS = [
  "Cybernetic autonomous agent terminal with glowing violet hologram interfaces, volumetric lighting, photorealistic 8k",
  "Arc Network cryptographic settlement matrix with streaming cyan particles and neon architecture",
  "Futuristic AI finance dashboard floating above deep space metropolis, cinematic concept art",
];

export default function ImagePage() {
  useBackendWarmup();
  const allowNetworkSwitch = useCanSwitchNetwork();
  const { disconnectWallet, switchOrAddChain } = useWallet();
  const { servicePrices } = useApayPrice();
  const {
    address,
    authenticated,
    connectWallet,
    isTestnet,
    currentChainId,
    runPaid,
    loading: paidLoading,
    error: paymentError,
    paymentStep,
    formattedAmount,
  } = usePaidService("image");
  const {
    usdcBalance,
    paymentBalance,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);

  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<"groq" | "gemini" | "claude">("groq");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Image upload state for vision mode
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  async function handleGenerate(customPrompt?: string) {
    const textPrompt = (customPrompt || prompt).trim();
    if ((!textPrompt && !uploadedImage) || loading || paidLoading) return;

    if (Number(paymentBalance) <= 0) {
      setError(
        `Insufficient USDC balance: your connected wallet has ${paymentBalance} USDC. Top up with USDC on Arc to pay for image services.`
      );
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const payload: Record<string, string> = { provider };
      if (textPrompt) payload.prompt = textPrompt;
      if (uploadedImage) payload.image = uploadedImage;

      const data = await runPaid<ImageResponse>(payload);

      if (!data) throw new Error("No response from server");
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
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Mobile BalanceBar */}
      <div className="md:hidden">
        <BalanceBar
          address={address}
          usdcBalance={usdcBalance}
          loading={balanceLoading}
          onRefresh={refetch}
          onDisconnect={disconnectWallet}
          currentChainId={currentChainId}
          isTestnet={isTestnet}
          onSwitchNetwork={(chainId) => switchOrAddChain(chainId)}
          allowNetworkSwitch={allowNetworkSwitch}
        />
      </div>

      {/* Header Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/8 bg-[#0D111C]/90 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-[#131826] text-slate-400 hover:text-white border border-white/8 hover:bg-white/5 transition"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-300">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg text-white">
                AI Image Studio
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Diffusion XL generation & Vision multimodal analysis
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
          <div className="flex bg-[#131826] p-1 rounded-xl border border-white/8 gap-1">
            <button
              onClick={() => setProvider("groq")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs ${
                provider === "groq"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Groq
            </button>
            <button
              onClick={() => setProvider("gemini")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs ${
                provider === "gemini"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ✨ Gemini
            </button>
            <button
              onClick={() => setProvider("claude")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs ${
                provider === "claude"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Claude
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            {uploadedImage
              ? `${formatServiceCharge(servicePrices.chat.targetUsdCost, servicePrices.chat.amountTokens, currentChainId)} / analysis`
              : `${formatServiceCharge(servicePrices.image.targetUsdCost, servicePrices.image.amountTokens, currentChainId)} / render`}
          </div>
        </div>
      </div>

      {/* Studio Workspace: 2-Column Split View on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Parameter & Prompt Studio */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/8 bg-[#0D111C]/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                Prompt & Parameters
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                {uploadedImage ? "Mode: Vision" : "Mode: Text-to-Image"}
              </span>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium block">
                Visual Description / Query
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  uploadedImage
                    ? "Ask questions about this image or leave empty for full breakdown..."
                    : "Describe the image in high visual detail..."
                }
                rows={4}
                disabled={busy}
                className="w-full bg-[#0A0E17] border border-white/10 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition resize-none leading-relaxed"
              />
            </div>

            {/* Aspect Ratio Selector (Text-to-Image only) */}
            {!uploadedImage && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium block flex items-center gap-1.5">
                  <Ratio className="w-3.5 h-3.5 text-slate-400" />
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded-xl text-xs font-mono font-medium border transition cursor-pointer ${
                        aspectRatio === ratio
                          ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                          : "bg-[#131826] border-white/6 text-slate-400 hover:text-white"
                      }`}
                    >
                      {ratio} {ratio === "1:1" ? "Square" : ratio === "16:9" ? "Wide" : "Portrait"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vision Mode Upload Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium block flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                Upload Reference for Vision Analysis (Optional)
              </label>

              {!uploadedImage ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                    dragOver
                      ? "border-cyan-400 bg-cyan-950/20"
                      : "border-white/10 hover:border-white/20 bg-[#0A0E17]/60"
                  }`}
                >
                  <Upload className="w-5 h-5 text-slate-500 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-300">
                    Drag & drop reference image, or <span className="text-cyan-400 font-bold">browse</span>
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    JPEG, PNG, WebP up to 5MB
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
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#131826] border border-cyan-500/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={uploadedImage}
                      alt="Upload Preview"
                      className="w-10 h-10 object-cover rounded-lg border border-white/10"
                    />
                    <div className="min-w-0">
                      <span className="text-xs text-white truncate block font-medium">
                        {uploadedFileName}
                      </span>
                      <span className="text-[10px] text-cyan-300 font-mono font-bold">
                        Vision Mode Ready
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={clearUpload}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition"
                    title="Remove upload"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Telemetry & Error States */}
            {paymentStep === "signing" && (
              <div className="rounded-xl p-3 bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span>Sign {formattedAmount || "USDC"} payment in wallet (0 gas)...</span>
              </div>
            )}

            {paymentStep === "verifying" && (
              <div className="rounded-xl p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                <span>Verifying payment receipt on Arc Network...</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {/* Execution CTA Button */}
            <button
              onClick={() => handleGenerate()}
              disabled={!canGenerate}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 active:scale-95 disabled:opacity-40 text-white font-bold text-xs tracking-wide shadow-xl shadow-cyan-600/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Visual on Arc...</span>
                </>
              ) : uploadedImage ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Execute Vision Analysis</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate High-Res Visual</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Prompt Presets */}
          <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/60 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Inspiration Presets
            </span>
            <div className="space-y-1.5">
              {SAMPLE_IMAGE_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p);
                    handleGenerate(p);
                  }}
                  disabled={busy}
                  className="w-full text-left p-2.5 rounded-xl bg-[#131826]/70 hover:bg-[#1A2234] border border-white/5 hover:border-cyan-500/30 text-xs text-slate-300 transition cursor-pointer line-clamp-2"
                >
                  &quot;{p}&quot;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Visual Stage & Synthesis Canvas */}
        <div className="lg:col-span-7">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/8 bg-[#0D111C]/90 shadow-2xl min-h-[500px] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <span className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Synthesis Canvas Stage
              </span>
              {result && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Settled on Arc
                </span>
              )}
            </div>

            {/* Canvas Main Output */}
            <div className="flex-1 flex items-center justify-center">
              {busy ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mx-auto shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <h4 className="font-display font-bold text-base text-white">
                    Synthesizing Visual Pixels...
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Executing diffusion pipeline and recording gasless micropayment proof on Arc Network.
                  </p>
                </div>
              ) : result?.imageUrl ? (
                <div className="w-full space-y-4 text-center">
                  <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-[#0A0E17] max-h-[460px] flex items-center justify-center shadow-2xl">
                    <img
                      src={result.imageUrl}
                      alt="AI Generated Visual"
                      className="w-full h-auto object-contain max-h-[460px] rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <a
                      href={result.imageUrl}
                      download="agentpay-visual.png"
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:scale-95 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download High-Res (WebP)</span>
                    </a>
                  </div>
                </div>
              ) : result?.analysis ? (
                <div className="w-full space-y-4">
                  <div className="rounded-2xl p-4 bg-[#131826]/90 border border-cyan-500/25 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                      <Eye className="w-4 h-4" />
                      <span>Multimodal Vision Analysis Report</span>
                    </div>
                    {uploadedImage && (
                      <img
                        src={uploadedImage}
                        alt="Analyzed subject"
                        className="w-full max-h-48 object-contain rounded-xl border border-white/8 bg-[#0A0E17]"
                      />
                    )}
                    <div className="text-slate-200 text-xs leading-relaxed max-h-80 overflow-y-auto pr-1">
                      <ChatMarkdown text={result.analysis} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3 max-w-sm">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <h4 className="font-display font-bold text-base text-white">
                    Stage Ready for Synthesis
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter a prompt or upload an image on the left. Visual artifacts will render here with full resolution download.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Proof Stripe */}
            <div className="border-t border-white/6 pt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Circle USDC Facilitator</span>
              <span>x402 Pay-Per-Render Protocol</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
