"use client";

import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import {
  ArrowLeft,
  ArrowRightLeft,
  AlertTriangle,
  Bot,
  History,
  Shield,
  ExternalLink,
} from "lucide-react";

export default function DexPage() {
  const allowNetworkSwitch = useCanSwitchNetwork();
  const {
    address,
    currentChainId,
    disconnectWallet,
    switchOrAddChain,
  } = useWallet();

  const {
    usdcBalance,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);

  return (
    <main className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Mobile BalanceBar */}
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-[#131826] text-slate-400 hover:text-white border border-white/8 hover:bg-white/5 transition"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#131826] border border-white/8 p-1.5 flex items-center justify-center shrink-0">
              <Image
                src="/agentpay-mark.png"
                alt="AgentPay Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg text-white">
                Cross-Chain DEX Swap
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Arc USDC ↔ BotChain $APAY Relayer
              </p>
            </div>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-mono font-semibold">
          Paused
        </span>
      </div>

      {/* Maintenance / Paused Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 bg-gradient-to-b from-[#131826]/90 to-[#0D111C]/90 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="font-display font-bold text-lg sm:text-xl text-white">
            DEX Swaps Temporarily Disabled
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Cross-chain swap operations between Arc USDC and BotChain $APAY are temporarily paused while liquidity pool calibrations and relayer contracts are being upgraded.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D16]/80 border border-white/6 text-left space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400">
            <span>Relayer Status:</span>
            <span className="text-amber-400 font-bold">Calibration Mode</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>AI Micropayments:</span>
            <span className="text-emerald-400 font-bold">100% Operational</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Settlement Network:</span>
            <span className="text-cyan-400 font-bold">Arc Network (5042)</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition cursor-pointer"
          >
            <Bot className="w-4 h-4 text-cyan-300" />
            <span>Go to AI Workstations</span>
          </Link>
          <Link
            href="/history"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#131826] hover:bg-[#1A2234] border border-white/8 text-slate-300 hover:text-white font-medium text-xs transition"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>View Payment History</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
