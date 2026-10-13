"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useApayPrice } from "@/hooks/useApayPrice";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { formatServiceCharge } from "@/lib/pricing";
import { AgentIdentityBadge } from "@/components/AgentIdentityBadge";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Bot, Image as ImageIcon, Code, Sparkles, Smartphone, CheckCircle, Star, Cpu } from "lucide-react";

export default function Home() {
  const allowNetworkSwitch = useCanSwitchNetwork();
  const {
    address,
    inMiniPay,
    connecting,
    currentChainId,
    currentChainName,
    connectWallet,
    disconnectWallet,
    switchOrAddChain,
  } = useWallet();
  const {
    usdcBalance,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);
  const { servicePrices } = useApayPrice();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  function handleFeedbackSubmit(score: number, notes: string) {
    console.log("Feedback submitted:", { score, notes });
  }

  const chatApay = servicePrices.chat.amountTokens;
  const codeApay = servicePrices.code.amountTokens;
  const imageApay = servicePrices.image.amountTokens;

  return (
    <main className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-950 text-slate-100 shadow-2xl border-x border-slate-800">
      <BalanceBar
        address={address}
        usdcBalance={usdcBalance}
        loading={balanceLoading}
        onRefresh={refetch}
        onDisconnect={disconnectWallet}
        currentChainId={currentChainId}
        onSwitchNetwork={(chainId) => switchOrAddChain(chainId)}
        allowNetworkSwitch={allowNetworkSwitch}
      />

      <div className="flex-1 p-5 space-y-5">
        {/* Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="inline-flex items-center space-x-1.5 bg-amber-400/10 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Groq 120B (Primary) & Gemini/Claude</span>
            </span>
            <span className="inline-flex items-center space-x-1 bg-purple-400/10 text-purple-400 text-xs font-medium px-2 py-0.5 rounded-full border border-purple-400/20">
              <Cpu className="w-3 h-3" />
              <span>{currentChainName}</span>
            </span>
            {inMiniPay && (
              <span className="inline-flex items-center space-x-1 bg-emerald-400/10 text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-400/20">
                <CheckCircle className="w-3 h-3" />
                <span>MiniPay</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            AgentPay AI
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Premier Web3 intelligence at ultra-low cost, charging strictly per use with USDC micropayments on Arc instead of bulky, expensive subscription cycles. Gasless EIP-3009 signatures, no commitments.
          </p>

          {!address ? (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="w-full mt-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 text-sm shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>{connecting ? "Connecting Wallet..." : "Connect Wallet to Start"}</span>
            </button>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Wallet Connected ({address.slice(0, 6)}...{address.slice(-4)})</span>
              </span>
              <button
                onClick={disconnectWallet}
                className="text-xs text-slate-400 hover:text-red-400 transition cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* ERC-8004 Agent Trust Badge */}
        <AgentIdentityBadge reputationScore={98} totalReviews={142} />

        {/* AI Tools Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Available AI Services
            </h2>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-medium transition cursor-pointer"
            >
              <Star className="w-3 h-3 fill-amber-400" />
              <span>Give Feedback</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Chat Tool */}
            <Link
              href="/chat"
              className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 p-4 rounded-xl transition cursor-pointer flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-105 transition">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">AI Text Assistant</h3>
                  <p className="text-xs text-slate-400">Google Gemini Flash & Claude 3.5</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-700 block">
                  ${servicePrices.chat.targetUsdCost.toFixed(4)}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {formatServiceCharge(servicePrices.chat.targetUsdCost, chatApay, currentChainId)}
                </span>
              </div>
            </Link>

            {/* Image Gen Tool */}
            <Link
              href="/image"
              className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 p-4 rounded-xl transition cursor-pointer flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 group-hover:scale-105 transition">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">AI Image Creator</h3>
                  <p className="text-xs text-slate-400">High-res 512×512 generation</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold bg-slate-800 text-purple-400 px-2.5 py-1 rounded-lg border border-slate-700 block">
                  ${servicePrices.image.targetUsdCost.toFixed(4)}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {formatServiceCharge(servicePrices.image.targetUsdCost, imageApay, currentChainId)}
                </span>
              </div>
            </Link>

            {/* Code Review Tool */}
            <Link
              href="/code"
              className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/30 p-4 rounded-xl transition cursor-pointer flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 group-hover:scale-105 transition">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">AI Code Reviewer</h3>
                  <p className="text-xs text-slate-400">Security audit & bug detection</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold bg-slate-800 text-sky-400 px-2.5 py-1 rounded-lg border border-slate-700 block">
                  ${servicePrices.code.targetUsdCost.toFixed(4)}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {formatServiceCharge(servicePrices.code.targetUsdCost, codeApay, currentChainId)}
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />

      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900">
        AgentPay AI • Arc USDC Pay-Per-Use • x402 & EIP-3009 Gasless Payments
      </footer>
    </main>
  );
}
