"use client";

import { useState } from "react";
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
  Bot,
  Send,
  Sparkles,
  Loader2,
  ArrowLeft,
  User,
  Wallet,
  Cpu,
  AlertTriangle,
  Zap,
  Coins,
  CheckCircle2,
} from "lucide-react";

interface MessageItem {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  provider?: "groq" | "gemini" | "claude";
  isError?: boolean;
  paidAmountFormatted?: string | null;
}

const QUICK_PROMPTS = [
  "Explain EIP-3009 gasless authorizations",
  "How does Circle USDC Facilitator work on Arc?",
  "Audit this Solidity vault for reentrancy bugs",
];

export default function ChatPage() {
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
  } = usePaidService("chat");
  const {
    usdcBalance,
    paymentBalance,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);

  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<"groq" | "gemini" | "claude">("groq");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSend(customPrompt?: string) {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend || loading || paidLoading) return;

    if (Number(paymentBalance) <= 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "ai",
          text: `Insufficient USDC balance: your connected wallet has ${paymentBalance} USDC. Top up with USDC on Arc to pay for AI prompts.`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      return;
    }

    const activeProvider = provider;
    if (!customPrompt) setPrompt("");
    setLoading(true);

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const data = await runPaid<any>({ prompt: textToSend, provider: activeProvider });
      const aiText = typeof data === "string" ? data : data?.response;
      if (!aiText) {
        throw new Error("No response received from AI");
      }

      const paidFormatted = data?._paidAmountFormatted || formattedAmount || "0.0058 USDC";

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: aiText,
          provider: activeProvider,
          paidAmountFormatted: paidFormatted,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      refetch();
    } catch (err: unknown) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "ai",
          text: err instanceof Error ? err.message : "Chat request failed",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || paidLoading;

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
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

      {/* Chat Workspace Header */}
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
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg text-white">
                AI Text Assistant
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                High-speed reasoning • Real-time USDC settlement
              </p>
            </div>
          </div>
        </div>

        {/* Model Selector Matrix & Pricing Pill */}
        <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
          <div className="flex bg-[#131826] p-1 rounded-xl border border-white/8 gap-1">
            <button
              onClick={() => setProvider("groq")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5 cursor-pointer ${
                provider === "groq"
                  ? "bg-gradient-to-r from-amber-500/90 to-amber-600 text-slate-950 font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>⚡ Groq 120B</span>
            </button>
            <button
              onClick={() => setProvider("gemini")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5 cursor-pointer ${
                provider === "gemini"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>✨ Gemini</span>
            </button>
            <button
              onClick={() => setProvider("claude")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5 cursor-pointer ${
                provider === "claude"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Claude 3.5</span>
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            {formatServiceCharge(servicePrices.chat.targetUsdCost, servicePrices.chat.amountTokens, currentChainId)} / call
          </div>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-white/8 bg-[#0D111C]/60 min-h-[460px] flex flex-col justify-between shadow-2xl space-y-4">
        <div className="space-y-4 overflow-y-auto max-h-[580px] pr-1">
          {/* Welcome Info Box */}
          {messages.length === 0 && (
            <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-300 mx-auto shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <Sparkles className="w-7 h-7 text-cyan-300" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Autonomous Intelligence Console
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Ask complex engineering questions, request smart contract logic, or analyze protocols. Prompts settle on Arc via EIP-3009 gasless micropayments.
                </p>
              </div>

              {/* Quick Prompts */}
              <div className="pt-2 flex flex-col gap-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  Suggested Prompts
                </span>
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp}
                    onClick={() => handleSend(qp)}
                    disabled={busy}
                    className="text-left px-3.5 py-2.5 rounded-xl bg-[#131826]/80 hover:bg-[#1A2234] border border-white/6 hover:border-purple-500/30 text-xs text-slate-300 transition cursor-pointer flex items-center justify-between group"
                  >
                    <span>{qp}</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wallet State Callout */}
          {!authenticated || !address ? (
            <div className="rounded-2xl p-4 bg-purple-950/30 border border-purple-800/40 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-purple-200">
                <Wallet className="w-4 h-4 text-purple-400" />
                <span>Connect your wallet to authorize gasless USDC micropayments on Arc.</span>
              </div>
              <button
                onClick={() => connectWallet()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs tracking-wide transition cursor-pointer shrink-0"
              >
                Connect Wallet
              </button>
            </div>
          ) : null}

          {/* Payment Telemetry Notification */}
          {paymentStep === "signing" && (
            <div className="rounded-xl p-3 bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2.5 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>🔑 Sign {formattedAmount || "USDC"} payment authorization in your wallet (0 gas)...</span>
            </div>
          )}

          {paymentStep === "verifying" && (
            <div className="rounded-xl p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
              <span>🔍 Authorization signed! Verifying payment on Arc...</span>
            </div>
          )}

          {address && Number(paymentBalance) <= 0 && (
            <div className="rounded-xl p-3 bg-amber-950/50 border border-amber-800 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Insufficient USDC balance:</strong> Your wallet has {paymentBalance} USDC. Top up with USDC on Arc to pay for prompts.
              </span>
            </div>
          )}

          {paymentError && (
            <div className="rounded-xl p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {paymentError}
            </div>
          )}

          {/* Message List */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === "user"
                    ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25"
                    : msg.isError
                    ? "bg-rose-900 text-rose-200"
                    : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                }`}
              >
                {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`rounded-2xl p-4 max-w-[85%] text-xs leading-relaxed shadow-lg ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none"
                    : msg.isError
                    ? "bg-rose-950/60 border border-rose-800 text-rose-200 rounded-tl-none"
                    : "glass-panel bg-[#131826]/90 border border-white/8 text-slate-200 rounded-tl-none"
                }`}
              >
                {msg.sender === "ai" && !msg.isError ? (
                  <>
                    <ChatMarkdown text={msg.text} />
                    <div className="mt-3 pt-2.5 border-t border-white/8 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-cyan-300 font-mono font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Paid {msg.paidAmountFormatted || "0.0058 USDC"}</span>
                        <span className="text-slate-500">•</span>
                        <span>
                          {msg.provider === "claude"
                            ? "Claude Opus 5"
                            : msg.provider === "gemini"
                            ? "Gemini 3.8 Flash"
                            : "Groq 120B"}
                        </span>
                      </span>
                      <span className="font-mono text-slate-500">{msg.timestamp}</span>
                    </div>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2.5 text-slate-300 text-xs bg-[#131826]/70 p-3.5 rounded-xl border border-white/8 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
              <span>
                Synthesizing response with{" "}
                <strong className="text-cyan-300 font-mono">
                  {provider === "groq"
                    ? "Groq 120B LPU..."
                    : provider === "gemini"
                    ? "Google Gemini Flash..."
                    : "Anthropic Claude 3.5..."}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Input Console */}
        <div className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2.5 bg-[#0A0E17] border border-white/10 rounded-2xl p-1.5 focus-within:border-purple-500/60 transition shadow-inner"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Prompt ${
                provider === "groq"
                  ? "Groq 120B"
                  : provider === "gemini"
                  ? "Gemini Flash"
                  : "Claude 3.5"
              } (settles ${servicePrices.chat.targetUsdCost.toFixed(4)} USDC)...`}
              disabled={busy}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !prompt.trim()}
              className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 active:scale-95 disabled:opacity-40 text-white font-bold rounded-xl transition cursor-pointer shadow-lg shadow-purple-600/30"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
