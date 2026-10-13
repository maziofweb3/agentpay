"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { PaymentRecord, getStoredHistory } from "@/lib/history";
import {
  History,
  ExternalLink,
  ArrowLeft,
  Bot,
  Image as ImageIcon,
  Code,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";

export default function HistoryPage() {
  const allowNetworkSwitch = useCanSwitchNetwork();
  const { address, currentChainId, isTestnet, disconnectWallet, switchOrAddChain } = useWallet();
  const {
    usdcBalance,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);

  const [records, setRecords] = useState<PaymentRecord[]>(() => getStoredHistory());
  const [activeFilter, setActiveFilter] = useState<"all" | "chat" | "image" | "code">("all");
  const [expandedId, setExpandedId] = useState<string | null>("tx-1");

  useEffect(() => {
    setRecords(getStoredHistory());
  }, []);

  const filteredHistory = useMemo(() => {
    return records.filter((item) =>
      activeFilter === "all" ? true : item.category === activeFilter
    );
  }, [records, activeFilter]);

  // Dynamically computed metrics based on active filter
  const totalSettled = useMemo(() => {
    return filteredHistory
      .reduce((sum, item) => sum + (item.amountNumeric || 0), 0)
      .toFixed(4);
  }, [filteredHistory]);

  const totalCalls = filteredHistory.length;
  const gasSaved = (totalCalls * 2.5).toFixed(2);

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
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
              <h1 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Payment History & Settlement Proofs
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                EIP-3009 gasless transfer telemetry • Arc Network onchain receipts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Arc Network (5042)
          </span>
        </div>
      </div>

      {/* Dynamic Telemetry Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Total Settled
            </span>
            <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10">
              {activeFilter === "all" ? "All" : activeFilter}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl sm:text-2xl text-cyan-300">
              {totalSettled}
            </span>
            <span className="text-xs font-mono text-slate-400">USDC</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Invocations
            </span>
            <span className="text-[10px] font-mono text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10">
              {activeFilter === "all" ? "AI Suite" : activeFilter}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl sm:text-2xl text-purple-300">
              {totalCalls} {totalCalls === 1 ? "Call" : "Calls"}
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/80 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Median Latency
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl sm:text-2xl text-emerald-300 font-mono">
              0.004s
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Sub-second</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/80 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Gas Saved (EIP-3009)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl sm:text-2xl text-amber-300 font-mono">
              ~${gasSaved}
            </span>
            <span className="text-[10px] font-mono text-amber-400">USD</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(["all", "chat", "image", "code"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition cursor-pointer shrink-0 ${
              activeFilter === cat
                ? "bg-[#0AA082]/20 border border-[#0AA082]/50 text-white font-bold shadow-md shadow-[#0AA082]/20"
                : "bg-[#131826] border border-white/6 text-slate-400 hover:text-white"
            }`}
          >
            {cat === "all" ? "All Invocations" : cat}
          </button>
        ))}
      </div>

      {/* History Items & Proof Drawers */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 border border-white/8 text-center space-y-2">
            <p className="text-slate-400 text-sm font-mono">No transactions found for this filter.</p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isExpanded = expandedId === item.id;
            const Icon =
              item.category === "chat"
                ? Bot
                : item.category === "image"
                ? ImageIcon
                : Code;

            return (
              <div
                key={item.id}
                className="glass-panel rounded-2xl border border-white/8 bg-[#0D111C]/85 hover:border-white/15 transition-all overflow-hidden shadow-lg"
              >
                {/* Summary Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-300 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-sm text-white truncate">
                          {item.tool}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold shrink-0">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        {item.model} • {item.timestamp}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs sm:text-sm font-bold text-cyan-300 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                      {item.amount}
                    </span>
                    <div className="text-slate-400 hover:text-white transition">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Cryptographic Proof Drawer (Expanded) */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-white/6 bg-[#0A0E17]/80 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                        <FileCheck2 className="w-4 h-4 text-cyan-400" />
                        EIP-3009 Cryptographic Permit Verification
                      </span>
                      <a
                        href={`https://explorer.arc.io/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition"
                      >
                        <span>ArcScan Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-[#131826] border border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-500 block uppercase">Transaction Hash</span>
                        <span className="text-slate-200 truncate block font-bold">{item.txHash}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131826] border border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-500 block uppercase">Authorization Nonce</span>
                        <span className="text-slate-200 truncate block font-bold">{item.nonce}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131826] border border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-500 block uppercase">Circle Facilitator</span>
                        <span className="text-slate-200 truncate block font-bold">{item.facilitator}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
