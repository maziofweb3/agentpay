"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useHybridZap } from "@/hooks/useHybridZap";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { BottomNav } from "@/components/BottomNav";
import { DEX_CONFIG } from "@/lib/dex";
import {
  ArrowLeftRight,
  Droplets,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Layers,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { formatUnits } from "viem";

export default function DexPage() {
  const {
    address,
    currentChainId,
    isTestnet,
    isArc,
    connectWallet,
    disconnectWallet,
    switchOrAddChain,
  } = useWallet();
  const allowNetworkSwitch = useCanSwitchNetwork();

  const {
    botBalance,
    apayBalance,
    usdcBalance,
    usdtBalance,
    bousdtBalance,
    loading: balanceLoading,
    refetch: refetchBalance,
  } = useBalance(address, currentChainId);

  const {
    loading: zapLoading,
    txPending,
    zapStep,
    stepMessage,
    error: zapError,
    apayTotalSupply,
    isMintPhase,
    usdtPool,
    botPool,
    refreshAll,
    estimateZap,
    executeZap,
  } = useHybridZap();

  const [activeTab, setActiveTab] = useState<"swap" | "liquidity">("swap");
  const [selectedToken, setSelectedToken] = useState<"USDT" | "BOT">("USDT");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [estimatedApay, setEstimatedApay] = useState<string>("0");
  const [estimatedLp, setEstimatedLp] = useState<string>("0");
  const [explainerOpen, setExplainerOpen] = useState<boolean>(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  const config = DEX_CONFIG.mainnet;

  // Calculate 1B supply progress
  const maxCapNumber = 1_000_000_000;
  const currentSupplyNumber = apayTotalSupply > BigInt(0) ? Number(formatUnits(apayTotalSupply, 18)) : 1_000_000;
  const progressPercent = Math.min(100, Math.max(0.1, (currentSupplyNumber / maxCapNumber) * 100));

  // Live estimate calculation
  useEffect(() => {
    let active = true;
    async function updateEstimate() {
      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        setEstimatedApay("0");
        setEstimatedLp("0");
        return;
      }
      const est = await estimateZap(selectedToken, depositAmount);
      if (active) {
        setEstimatedApay(est.expectedApay);
        setEstimatedLp(est.expectedLp);
      }
    }
    updateEstimate();
    return () => {
      active = false;
    };
  }, [depositAmount, selectedToken, estimateZap]);

  // Handle Quick Percent buttons
  function handlePercent(percent: number) {
    const maxVal = selectedToken === "USDT" ? parseFloat(usdtBalance || "0") : parseFloat(botBalance || "0");
    if (maxVal <= 0) return;
    const computed = (maxVal * (percent / 100)).toFixed(selectedToken === "USDT" ? 2 : 4);
    setDepositAmount(computed);
  }

  async function handleZapSubmit() {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setTxSuccess(null);
    try {
      const txHash = await executeZap(selectedToken, depositAmount);
      setTxSuccess(txHash);
      setDepositAmount("");
      refetchBalance();
    } catch (err) {
      console.error("Zap submit error:", err);
    }
  }

  return (
    <main className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-950 text-slate-100 shadow-2xl border-x border-slate-800 pb-20">
      <BalanceBar
        address={address}
        botBalance={botBalance}
        apayBalance={apayBalance}
        usdcBalance={usdcBalance}
        usdtBalance={usdtBalance}
        bousdtBalance={bousdtBalance}
        loading={balanceLoading}
        onRefresh={() => {
          refetchBalance();
          refreshAll();
        }}
        onDisconnect={disconnectWallet}
        currentChainId={currentChainId}
        isTestnet={isTestnet}
        onSwitchNetwork={(chainId) => switchOrAddChain(chainId)}
        allowNetworkSwitch={allowNetworkSwitch}
      />

      <div className="p-4 space-y-4 flex-1">
        {isArc && (
          <div className="bg-amber-950/50 border border-amber-800 text-amber-200 rounded-xl p-4 text-sm space-y-3">
            <p className="font-semibold">DEX is BotChain-only</p>
            <p className="text-xs text-amber-200/80">
              APAY pools live on BotChain. Switch to BotChain Mainnet to swap and zap liquidity.
            </p>
            <button
              onClick={() => switchOrAddChain(677)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2 rounded-xl text-sm"
            >
              Switch to BotChain Mainnet
            </button>
          </div>
        )}
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <span>DEX & Liquidity</span>
            </h1>
            <p className="text-xs text-slate-400">
              BotChain BDEX Portal • Swap & Single-Sided LP
            </p>
          </div>
          <button
            onClick={() => refreshAll()}
            disabled={zapLoading}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            title="Refresh pool metrics"
          >
            <RefreshCw className={`w-4 h-4 ${zapLoading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>

        {/* 1 Billion Supply Cap Progress Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 p-4 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>$APAY Total Supply Cap</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] border ${
              isMintPhase
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-purple-500/10 text-purple-400 border-purple-500/20"
            }`}>
              {isMintPhase ? "Phase 1: Auto-Mint Active 🟢" : "Phase 2: 1B Fixed Cap 🔒"}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-white font-mono font-bold">
                {currentSupplyNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-slate-400 text-[11px] font-mono">
                / 1,000,000,000 APAY ({progressPercent.toFixed(2)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, progressPercent)}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            {isMintPhase
              ? "New APAY is automatically minted only when backed 1:1 by user liquidity deposits until the 1B cap is reached."
              : "1 Billion cap reached. APAY supply is permanently capped with 0 new mints."}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("swap")}
            className={`py-2.5 rounded-lg flex items-center justify-center space-x-2 transition ${
              activeTab === "swap"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Direct Swap</span>
          </button>
          <button
            onClick={() => setActiveTab("liquidity")}
            className={`py-2.5 rounded-lg flex items-center justify-center space-x-2 transition ${
              activeTab === "liquidity"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>1-Click Liquidity (Zap)</span>
          </button>
        </div>

        {/* TAB 1: SWAP VIEW */}
        {activeTab === "swap" && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-3 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Official BDEX V2 Swap Interface</span>
                <a
                  href={config.swapEmbedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-medium"
                >
                  <span>Open BDEX</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Embedded Iframe */}
              <div className="w-full h-[540px] rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 relative">
                <iframe
                  src={config.swapEmbedUrl}
                  title="BotChain DEX Swap"
                  className="w-full h-full border-0"
                  allow="clipboard-write"
                />
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/60 text-xs text-slate-400 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified BotChain DEX Pairs</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Swaps execute directly against BDEX V2 pools. Standard 0.30% swap fee distributed 100% to APAY liquidity providers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 1-CLICK LIQUIDITY (HYBRID ZAP) */}
        {activeTab === "liquidity" && (
          <div className="space-y-4">
            {/* Zap Deposit Form Card */}
            <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Single-Asset Deposit
                </span>
                <span className="text-[11px] text-slate-400">
                  No APAY required beforehand
                </span>
              </div>

              {/* Token Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedToken("USDT")}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    selectedToken === "USDT"
                      ? "bg-amber-400/10 border-amber-400/50 text-white shadow-sm"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-white">💵 USDT</div>
                    <div className="text-[10px] text-slate-400">USDT/APAY Pool (v2-3)</div>
                  </div>
                  <span className="text-xs font-mono text-amber-400">
                    {parseFloat(usdtBalance || "0").toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedToken("BOT")}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    selectedToken === "BOT"
                      ? "bg-amber-400/10 border-amber-400/50 text-white shadow-sm"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-white">🤖 Native BOT</div>
                    <div className="text-[10px] text-slate-400">BOT/APAY Pool (v2-4)</div>
                  </div>
                  <span className="text-xs font-mono text-purple-400">
                    {parseFloat(botBalance || "0").toFixed(3)}
                  </span>
                </button>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Deposit Amount</span>
                  <span className="font-mono">
                    Available: {selectedToken === "USDT" ? usdtBalance : botBalance} {selectedToken}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  />
                  <div className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                    {selectedToken}
                  </div>
                </div>

                {/* Percent Shortcuts */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercent(pct)}
                      className="py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-[11px] font-mono text-slate-300 transition"
                    >
                      {pct === 100 ? "MAX" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Preview */}
              {parseFloat(depositAmount || "0") > 0 && (
                <div className="bg-slate-950/90 rounded-xl border border-slate-800/80 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Deposit Mode:</span>
                    <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{isMintPhase ? "Stage 1: Direct Mint & Add LP" : "Stage 2: 50/50 DEX Zap"}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Matching APAY {isMintPhase ? "Minted" : "Paired"}:</span>
                    <span className="font-mono font-bold text-white">
                      {parseFloat(estimatedApay).toLocaleString(undefined, { maximumFractionDigits: 2 })} APAY
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Estimated LP Received:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {parseFloat(estimatedLp).toFixed(6)} LP
                    </span>
                  </div>
                </div>
              )}

              {/* Live Step Progress / Pending Status */}
              {txPending && stepMessage && (
                <div className="p-3.5 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs text-purple-200 flex items-center space-x-3 shadow-inner">
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">Transaction in Progress</div>
                    <div className="text-[11px] text-purple-300">{stepMessage}</div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {zapError && !txPending && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{zapError}</span>
                </div>
              )}

              {/* Success Message */}
              {txSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Liquidity Added Successfully!</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Your single-asset deposit was matched and LP tokens have been minted to your wallet.
                  </p>
                  <a
                    href={`https://scan.botchain.ai/tx/${txSuccess}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1 font-mono pt-1"
                  >
                    <span>View Confirmed TX: {txSuccess.slice(0, 10)}...{txSuccess.slice(-8)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Action Button */}
              {!address ? (
                <button
                  type="button"
                  onClick={connectWallet}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-purple-600/30"
                >
                  Connect Wallet to Add Liquidity
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleZapSubmit}
                  disabled={txPending || !depositAmount || parseFloat(depositAmount) <= 0}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-purple-600 to-purple-500 hover:from-amber-400 hover:to-purple-400 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-purple-600/30 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {txPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{stepMessage || "Processing Transaction..."}</span>
                    </>
                  ) : (
                    <>
                      <Droplets className="w-4 h-4" />
                      <span>1-Click Zap {depositAmount ? `${depositAmount} ${selectedToken}` : "Liquidity"}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* ✨ Interactive Explainer Dropdown ("How Hybrid Minter-Zap Works") */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExplainerOpen(!explainerOpen)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/90 transition"
              >
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    How Hybrid Minter-Zap Works
                  </span>
                </div>
                {explainerOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {explainerOpen && (
                <div className="p-4 pt-0 space-y-3 text-xs text-slate-300 border-t border-slate-800/60">
                  {/* Phase 1 */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>1. Phase 1: Direct Mint (Supply &lt; 1B)</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      You deposit 100% USDT or BOT. The smart contract queries live DEX pool reserves, automatically mints matching $APAY, pairs both into the BDEX pool, and returns LP tokens to you. 100% of your deposit directly deepens pool liquidity.
                    </p>
                  </div>

                  {/* Phase 2 */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-purple-400 flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>2. Phase 2: Fixed Cap Zap (Supply = 1B)</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Once the 1 Billion cap is hit, minting stops permanently. The contract automatically executes optimal 50/50 DEX zapping (buying 50% APAY from market + pairing with remaining 50%) with 0 new token inflation.
                    </p>
                  </div>

                  {/* Yield & LP */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>3. LP Earnings &amp; 0.30% Swap Fees</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Every trade executed on BDEX charges a 0.30% fee that auto-compounds directly into pool reserves. Your LP tokens grow in underlying value as AI users and traders swap APAY.
                    </p>
                  </div>

                  {/* Self-Custody */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-blue-400 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>4. 100% Non-Custodial &amp; Zero Lock-in</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      You retain complete custody of your LP tokens in your wallet. You can withdraw your underlying USDT/BOT + APAY anytime directly via the BDEX interface.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* "My Liquidity Positions" Card */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>My Liquidity Positions</span>
                </span>
                <span className="text-[10px] text-slate-400">Live RPC Reads</span>
              </div>

              {!address ? (
                <p className="text-xs text-slate-500 italic py-2">
                  Connect your wallet to view active pool positions.
                </p>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {/* USDT/APAY Position */}
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">💵 USDT / APAY Pool</span>
                      <a
                        href={config.lockerProofs.usdtApay}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-amber-400 hover:underline flex items-center space-x-0.5"
                      >
                        <span>Locker Proof</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                      <div>
                        Pooled USDT: <span className="text-white font-mono">{parseFloat(usdtPool.userPooledIn).toFixed(2)}</span>
                      </div>
                      <div>
                        Pooled APAY: <span className="text-white font-mono">{parseFloat(usdtPool.userPooledApay).toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>LP Balance: {parseFloat(formatUnits(usdtPool.userLpBalance, 18)).toFixed(4)} LP</span>
                      <span>Pool Share: {usdtPool.userSharePercent.toFixed(4)}%</span>
                    </div>
                  </div>

                  {/* BOT/APAY Position */}
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">🤖 BOT / APAY Pool</span>
                      <a
                        href={config.lockerProofs.botApay}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-purple-400 hover:underline flex items-center space-x-0.5"
                      >
                        <span>Locker Proof</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                      <div>
                        Pooled BOT: <span className="text-white font-mono">{parseFloat(botPool.userPooledIn).toFixed(4)}</span>
                      </div>
                      <div>
                        Pooled APAY: <span className="text-white font-mono">{parseFloat(botPool.userPooledApay).toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>LP Balance: {parseFloat(formatUnits(botPool.userLpBalance, 18)).toFixed(4)} LP</span>
                      <span>Pool Share: {botPool.userSharePercent.toFixed(4)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
