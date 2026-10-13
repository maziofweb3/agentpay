"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useApayPrice } from "@/hooks/useApayPrice";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { AgentIdentityBadge } from "@/components/AgentIdentityBadge";
import { FeedbackModal } from "@/components/FeedbackModal";
import { formatServiceCharge } from "@/lib/pricing";
import {
  Bot,
  Image as ImageIcon,
  Code,
  Sparkles,
  Smartphone,
  CheckCircle,
  Star,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Zap,
  Repeat,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

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
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Mobile BalanceBar (Visible on small screens, integrated into TopNav on desktop) */}
      <div className="md:hidden">
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
      </div>

      {/* Hero Protocol Card */}
      <section className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-10 lg:p-12 border border-white/10 bg-gradient-to-b from-[#131826]/90 via-[#0D111C]/90 to-[#0A0E17]/90 shadow-2xl">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 -mt-16 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-5">
          {/* Brand Mark Emblem */}
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#131826]/90 border border-white/10 p-3 shadow-2xl shadow-[#0AA082]/20 flex items-center justify-center glow-brand hover:scale-105 transition-all">
              <Image
                src="/agentpay-mark.png"
                alt="AgentPay AI Emblem"
                width={64}
                height={64}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          {/* Micro-Badges Matrix */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 text-xs font-semibold border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>⚡ Groq 120B • Gemini 3.8 Flash • Claude Opus 5</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-mono font-medium border border-cyan-500/25">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>{currentChainName} (5042)</span>
            </span>
            {inMiniPay && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>MiniPay Verified</span>
              </span>
            )}
          </div>

          {/* Main Title & Value Prop */}
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight">
            AgentPay <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0AA082] via-cyan-400 to-purple-400">AI</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
            Pay-per-prompt AI on Arc with USDC (Circle Facilitator) — text intelligence, high-res diffusion images, and smart contract audits. Gasless EIP-3009 signatures with zero recurring subscription cycles.
          </p>

          {/* Call to Action Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!address ? (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 text-white font-bold text-sm tracking-wide shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer glow-violet"
              >
                <Smartphone className="w-4 h-4" />
                <span>{connecting ? "Connecting Wallet..." : "Connect Wallet to Start"}</span>
              </button>
            ) : (
              <Link
                href="/chat"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 text-white font-bold text-sm tracking-wide shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer glow-violet"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Launch AI Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0D111C]/80 border border-white/8 text-xs text-slate-300 font-mono">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>EIP-3009 Gasless Permit Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* ERC-8004 Trust Banner */}
      <section>
        <AgentIdentityBadge reputationScore={98} totalReviews={142} medianSettlement="0.004s" />
      </section>

      {/* Available AI Services Workstation Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="font-display font-bold text-sm sm:text-base text-white uppercase tracking-wider">
              Available AI Services
            </h2>
          </div>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-semibold transition cursor-pointer"
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Give Feedback</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {/* Card 1: Text Assistant */}
          <div className="group glass-panel rounded-2xl p-5 sm:p-6 border border-white/8 bg-[#0D111C]/80 hover:border-purple-500/40 hover:bg-[#131826]/90 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-300 group-hover:scale-105 transition shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 inline-block">
                    ${servicePrices.chat.targetUsdCost.toFixed(4)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    {formatServiceCharge(servicePrices.chat.targetUsdCost, chatApay, currentChainId)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-white group-hover:text-purple-300 transition">
                  AI Text Assistant
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  High-speed reasoning, summarization, and code intelligence powered by Groq Llama 3 70B & Gemini Flash.
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Chat", "Summarize", "Reasoning", "Streaming"].map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#181B25] border border-white/5 text-slate-400 font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/chat"
                className="w-full py-2.5 rounded-xl bg-[#181B25] hover:bg-purple-600/90 hover:text-white border border-white/8 hover:border-purple-500/50 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 group-hover:shadow-lg group-hover:shadow-purple-600/20"
              >
                <span>Launch Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Image Creator */}
          <div className="group glass-panel rounded-2xl p-5 sm:p-6 border border-white/8 bg-[#0D111C]/80 hover:border-cyan-500/40 hover:bg-[#131826]/90 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 inline-block">
                    ${servicePrices.image.targetUsdCost.toFixed(4)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    {formatServiceCharge(servicePrices.image.targetUsdCost, imageApay, currentChainId)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-white group-hover:text-cyan-300 transition">
                  AI Image Creator
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  High-fidelity generative visual studio with prompt enhancement and dual text-to-image / vision analysis.
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Diffusion XL", "Prompt Tuning", "512px WebP", "Vision"].map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#181B25] border border-white/5 text-slate-400 font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/image"
                className="w-full py-2.5 rounded-xl bg-[#181B25] hover:bg-cyan-600/90 hover:text-white border border-white/8 hover:border-cyan-500/50 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 group-hover:shadow-lg group-hover:shadow-cyan-600/20"
              >
                <span>Create Image</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Code Reviewer */}
          <div className="group glass-panel rounded-2xl p-5 sm:p-6 border border-white/8 bg-[#0D111C]/80 hover:border-emerald-500/40 hover:bg-[#131826]/90 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <Code className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 inline-block">
                    ${servicePrices.code.targetUsdCost.toFixed(4)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    {formatServiceCharge(servicePrices.code.targetUsdCost, codeApay, currentChainId)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-white group-hover:text-emerald-300 transition">
                  AI Code Reviewer
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Automated smart contract vulnerability scanner, reentrancy detector, and automated security patch generator.
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Solidity AST", "Reentrancy Scan", "Gas Opt", "Diff Patch"].map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#181B25] border border-white/5 text-slate-400 font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/code"
                className="w-full py-2.5 rounded-xl bg-[#181B25] hover:bg-emerald-600/90 hover:text-white border border-white/8 hover:border-emerald-500/50 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 group-hover:shadow-lg group-hover:shadow-emerald-600/20"
              >
                <span>Audit Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Guarantees Ribbon */}
      <section className="glass-panel rounded-2xl p-4 sm:p-6 border border-white/8 bg-[#0D111C]/60">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Zero Subscriptions</span>
              <span className="text-[11px] text-slate-400">Pay solely for token output</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Circle Facilitator</span>
              <span className="text-[11px] text-slate-400">Instant Arc USDC clearance</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">EIP-3009 Permit</span>
              <span className="text-[11px] text-slate-400">Gas-free signature transfer</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Dual-Chain Ready</span>
              <span className="text-[11px] text-slate-400">Arc (5042) + BotChain $APAY</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />

      {/* Global Footer */}
      <footer className="pt-6 pb-2 text-center text-xs text-slate-400 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-white">AgentPay AI</span>
          <span>• Arc USDC & Circle Facilitator • BotChain $APAY • x402 & ERC-8004</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <a href="https://arc.network" target="_blank" rel="noreferrer" className="hover:text-cyan-300 transition">
            Arc Network
          </a>
          <a href="https://circle.com" target="_blank" rel="noreferrer" className="hover:text-cyan-300 transition">
            Circle CCTP
          </a>
          <a href="https://eips.ethereum.org/EIPS/eip-3009" target="_blank" rel="noreferrer" className="hover:text-cyan-300 transition">
            EIP-3009 Spec
          </a>
        </div>
      </footer>
    </main>
  );
}
