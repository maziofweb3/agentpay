"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { useContractHistory } from "@/hooks/useContractHistory";
import { BalanceBar } from "@/components/BalanceBar";
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
  RefreshCw,
  Coins,
  Cpu,
  Layers,
  Vault,
} from "lucide-react";

export default function HistoryPage() {
  const allowNetworkSwitch = useCanSwitchNetwork();
  const { address, currentChainId, isTestnet, disconnectWallet, switchOrAddChain } = useWallet();
  const {
    usdcBalance,
    loading: balanceLoading,
    refetch: refetchBalance,
  } = useBalance(address, currentChainId);

  const {
    userPrompts,
    totalPrompts,
    totalVolumeUsdc,
    vaultBalanceUsdc,
    events,
    registryAddress,
    loading: contractLoading,
    refetch: refetchContract,
  } = useContractHistory(address, currentChainId);

  const [activeFilter, setActiveFilter] = useState<"all" | "chat" | "image" | "code">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      if (activeFilter === "all") return true;
      const lowerTool = item.toolType.toLowerCase();
      if (activeFilter === "chat") return lowerTool.includes("chat") || lowerTool.includes("text");
      if (activeFilter === "image") return lowerTool.includes("image");
      if (activeFilter === "code") return lowerTool.includes("code") || lowerTool.includes("audit");
      return true;
    });
  }, [events, activeFilter]);

  async function handleRefreshAll() {
    await Promise.allSettled([refetchBalance(), refetchContract()]);
  }

  const truncatedRegistry = registryAddress
    ? `${registryAddress.slice(0, 6)}...${registryAddress.slice(-4)}`
    : "";

  const explorerBase = isTestnet
    ? "https://explorer.testnet.arc.io"
    : "https://explorer.arc.io";

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Mobile BalanceBar */}
      <div className="md:hidden">
        <BalanceBar
          address={address}
          usdcBalance={usdcBalance}
          loading={balanceLoading}
          onRefresh={handleRefreshAll}
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
                On-Chain Payment Telemetry & Settlement
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Live reads from AgentPayRegistry ({truncatedRegistry}) • {isTestnet ? "Arc Testnet (5042002)" : "Arc Mainnet (5042)"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => switchOrAddChain(isTestnet ? 5042 : 5042002)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131826] hover:bg-[#1A2234] border border-white/8 text-xs font-mono text-purple-300 hover:text-white transition cursor-pointer"
            title={`Switch to ${isTestnet ? "Arc Mainnet" : "Arc Testnet"}`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>{isTestnet ? "Arc Testnet" : "Arc Mainnet"}</span>
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={contractLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131826] hover:bg-[#1A2234] border border-white/8 text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Refresh on-chain state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${contractLoading ? "animate-spin text-cyan-400" : ""}`} />
            <span>{contractLoading ? "Syncing..." : "Sync Chain"}</span>
          </button>
          <a
            href={`${explorerBase}/address/${registryAddress}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/40 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Arc Registry</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>

      {/* On-Chain Contract Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: User On-Chain Prompts */}
        <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Your Prompts
            </span>
            <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10">
              userPromptCounts
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl sm:text-2xl text-cyan-300">
              {userPrompts}
            </span>
            <span className="text-xs font-mono text-slate-400">{userPrompts === 1 ? "Call" : "Calls"}</span>
          </div>
        </div>

        {/* Card 2: Global Protocol Prompts */}
        <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Total Recorded
            </span>
            <span className="text-[10px] font-mono text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10">
              totalPrompts
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl sm:text-2xl text-purple-300">
              {totalPrompts}
            </span>
            <span className="text-xs font-mono text-slate-400">Total</span>
          </div>
        </div>

        {/* Card 3: Total Volume Settled */}
        <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Volume Settled
            </span>
            <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10">
              totalVolume
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl sm:text-2xl text-emerald-300 font-mono">
              {totalVolumeUsdc}
            </span>
            <span className="text-xs font-mono text-slate-400">USDC</span>
          </div>
        </div>

        {/* Card 4: Vault Balance Backing */}
        <div className="glass-panel rounded-2xl p-4 border border-white/8 bg-[#0D111C]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Vault Collateral
            </span>
            <span className="text-[10px] font-mono text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
              vaultBalance
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl sm:text-2xl text-amber-300 font-mono">
              {vaultBalanceUsdc}
            </span>
            <span className="text-xs font-mono text-slate-400">USDC</span>
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
            {cat === "all" ? "All On-Chain Records" : cat}
          </button>
        ))}
      </div>

      {/* History Items & Proof Drawers or Authentic Zero State */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/8 bg-gradient-to-b from-[#131826]/80 to-[#0A0E17]/90 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#131826] border border-white/10 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <FileCheck2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-display font-bold text-base sm:text-lg text-white">
                No On-Chain Invocations Recorded Yet
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                {address
                  ? `Wallet ${address.slice(0, 6)}...${address.slice(-4)} has 0 prompt receipts logged on AgentPayRegistry.`
                  : "Connect your Web3 wallet to verify your on-chain settlement receipts on Arc Network."}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#090D16]/90 border border-white/6 max-w-md mx-auto text-left text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Contract Target:</span>
                <a
                  href={`${explorerBase}/address/${registryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>{truncatedRegistry}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Settlement Asset:</span>
                <span className="text-slate-200">USDC (6 Decimals)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Network:</span>
                <span className="text-slate-200">{isTestnet ? "Arc Testnet (Chain 5042002)" : "Arc Mainnet (Chain 5042)"}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition cursor-pointer"
              >
                <Bot className="w-4 h-4 text-cyan-300" />
                <span>Launch AI Text Assistant</span>
              </Link>
              <Link
                href="/image"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#131826] hover:bg-[#1A2234] border border-white/8 text-slate-300 hover:text-white font-medium text-xs transition"
              >
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <span>Create AI Image</span>
              </Link>
            </div>
          </div>
        ) : (
          filteredEvents.map((item) => {
            const isExpanded = expandedId === item.id;
            const lowerTool = item.toolType.toLowerCase();
            const Icon = lowerTool.includes("image")
              ? ImageIcon
              : lowerTool.includes("code") || lowerTool.includes("audit")
              ? Code
              : Bot;

            const isConfirming = item.status === "confirming" || item.blockNumber === 0n;
            const truncatedTx = item.txHash
              ? `${item.txHash.slice(0, 10)}...${item.txHash.slice(-8)}`
              : "Confirming on Arc...";

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
                          {item.toolType}
                        </h3>
                        {isConfirming ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-semibold shrink-0 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Confirming On-Chain
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold shrink-0">
                            Settled On-Chain
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        {item.blockNumber > 0n ? `Block #${item.blockNumber.toString()} • ` : ""}
                        {item.formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs sm:text-sm font-bold text-cyan-300 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                      {item.amountPaid}
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
                        {isConfirming
                          ? "Payment Settled (Recording on Arc Registry)"
                          : "PromptRecorded Contract Event"}
                      </span>
                      {item.txHash ? (
                        <a
                          href={`${explorerBase}/tx/${item.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition"
                        >
                          <span>ArcScan Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-amber-400/80 text-[11px] font-mono flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Mining block receipt
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-[#131826] border border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-500 block uppercase">Transaction Hash</span>
                        <span className="text-slate-200 truncate block font-bold">{truncatedTx}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131826] border border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-500 block uppercase">Block Number</span>
                        <span className="text-slate-200 truncate block font-bold">
                          {item.blockNumber > 0n ? `#${item.blockNumber.toString()}` : "Awaiting Block"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131826] border border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-500 block uppercase">Registry Vault</span>
                        <span className="text-slate-200 truncate block font-bold">{truncatedRegistry}</span>
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
