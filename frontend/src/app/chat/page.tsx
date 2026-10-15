"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { usePaidService } from "@/hooks/usePaidService";
import { useBackendWarmup } from "@/hooks/useBackendWarmup";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { Bot, Send, Sparkles, Loader2, ArrowLeft, User, Wallet, Cpu, AlertTriangle } from "lucide-react";
import Link from "next/link";

import { useApayPrice } from "@/hooks/useApayPrice";
import { formatServiceCharge } from "@/lib/pricing";

interface MessageItem {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  provider?: "groq" | "gemini" | "claude";
  isError?: boolean;
  paidAmountFormatted?: string | null;
}

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
    paymentSymbol,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<"groq" | "gemini" | "claude">("groq");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!prompt.trim() || loading || paidLoading) return;
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
    const userPrompt = prompt.trim();
    const activeProvider = provider;
    setPrompt("");
    setLoading(true);

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await runPaid<any>({ prompt: userPrompt, provider: activeProvider });
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
    <main className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-950 text-slate-100 shadow-2xl border-x border-slate-800">
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

      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="p-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-amber-400" />
            <h1 className="font-bold text-white text-base">AI Text Assistant</h1>
          </div>
        </div>
        <span className="text-xs font-bold bg-slate-900 text-amber-400 px-2.5 py-1 rounded-lg border border-slate-800">
          {formatServiceCharge(servicePrices.chat.targetUsdCost, servicePrices.chat.amountTokens, currentChainId)} / prompt
        </span>
      </div>

      {/* Model Selector Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
          <Cpu className="w-3.5 h-3.5 text-amber-400" />
          <span>Model Provider:</span>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 space-x-1">
          <button
            onClick={() => setProvider("groq")}
            className={`px-2.5 py-1 rounded-md font-semibold transition text-[11px] ${
              provider === "groq"
                ? "bg-amber-500 text-slate-950 shadow font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚡ Groq 120B
          </button>
          <button
            onClick={() => setProvider("gemini")}
            className={`px-2.5 py-1 rounded-md font-semibold transition text-[11px] ${
              provider === "gemini"
                ? "bg-blue-500 text-white shadow font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ✨ Gemini
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

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>x402 Gasless Micropayments on Arc</span>
          </div>
          <p className="text-slate-400">
            Pay-per-prompt: each message uses EIP-3009 USDC authorization. Sign
            in your wallet once (zero gas). Active model:{" "}
            <strong className="text-amber-400">
              {provider === "groq"
                ? "Groq GPT-OSS 120B (Default / High Speed)"
                : provider === "gemini"
                ? "Google Gemini Flash (Backup)"
                : "Anthropic Claude 3.5"}
            </strong>
          </p>
        </div>

        {!authenticated || !address ? (
          <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-4 space-y-3 text-xs">
            <p className="text-purple-100 font-medium">
              Connect a wallet to pay with USDC on Arc
            </p>
            <button
              onClick={() => connectWallet()}
              className="w-full flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-400 text-white font-semibold py-2.5 rounded-xl transition"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </div>
        ) : null}

        {paymentStep === "signing" && (
          <div className="bg-amber-950/40 border border-amber-800/80 text-amber-300 rounded-xl p-3 text-xs flex items-center space-x-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>🔑 Sign {formattedAmount || "USDC"} payment authorization in your wallet (0 gas)...</span>
          </div>
        )}

        {paymentStep === "verifying" && (
          <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 rounded-xl p-3 text-xs flex items-center space-x-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>🔍 Authorization signed! Verifying payment on Arc...</span>
          </div>
        )}

        {address && Number(paymentBalance) <= 0 && (
          <div className="bg-amber-950/60 border border-amber-800 text-amber-300 rounded-xl p-3 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Insufficient USDC balance:</strong> Your wallet has {paymentBalance} USDC.
              Top up with USDC on Arc to pay for AI prompts.
            </span>
          </div>
        )}

        {paymentError && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl p-3 text-xs">
            {paymentError}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2.5 ${
              msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                msg.sender === "user"
                  ? "bg-purple-600 text-white"
                  : msg.isError
                  ? "bg-rose-900 text-rose-200"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`rounded-2xl px-4 py-3 max-w-[82%] text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-purple-600 text-white rounded-tr-none"
                  : msg.isError
                  ? "bg-rose-950/60 border border-rose-800 text-rose-200 rounded-tl-none"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
              }`}
            >
              {msg.sender === "ai" && !msg.isError ? (
                <>
                  <ChatMarkdown text={msg.text} />
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                      <span>⚡ Paid {msg.paidAmountFormatted || "0.0058 USDC"}</span>
                      <span className="text-slate-500">•</span>
                      <span>
                        {msg.provider === "claude"
                          ? "Claude Verified"
                          : msg.provider === "gemini"
                          ? "Gemini Verified"
                          : "Groq LPU Verified"}
                      </span>
                    </span>
                  </div>
                </>
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs bg-slate-900/40 p-3 rounded-xl border border-slate-800/40 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>
              Generating answer with{" "}
              {provider === "groq"
                ? "Groq 120B (LPU)..."
                : provider === "gemini"
                ? "Google Gemini Flash..."
                : "Anthropic Claude 3.5..."}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Ask ${
              provider === "groq"
                ? "Groq 120B"
                : provider === "gemini"
                ? "Google Gemini Flash"
                : "Claude 3.5"
            } anything...`}
            disabled={busy}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !prompt.trim()}
            className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition flex-shrink-0 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </main>
  );
}
