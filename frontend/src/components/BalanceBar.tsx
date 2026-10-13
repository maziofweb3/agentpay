"use client";

import { useState } from "react";
import { Wallet, Coins, RefreshCw, Cpu, LogOut, ChevronDown, Copy, Check, Zap } from "lucide-react";
import { ALL_CHAINS, chainById } from "@/lib/chains";
import { getExpectedChainId } from "@/lib/environment";

interface BalanceBarProps {
  address: string | null;
  botBalance?: string;
  apayBalance?: string;
  usdcBalance?: string;
  usdtBalance?: string;
  bousdtBalance?: string;
  spendingBudget?: string | null;
  loading: boolean;
  onRefresh: () => void;
  onDisconnect?: () => void;
  currentChainId?: number;
  isTestnet?: boolean;
  onSwitchNetwork?: (chainId: number) => void;
  allowNetworkSwitch?: boolean;
}

export function BalanceBar({
  address,
  usdcBalance = "0.00",
  loading,
  onRefresh,
  onDisconnect,
  currentChainId = getExpectedChainId(),
  onSwitchNetwork,
  allowNetworkSwitch = false,
}: BalanceBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const truncatedAddress = address
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : null;

  const chain = chainById(currentChainId);
  const isTestnetChain = currentChainId === 5042002;

  async function handleCopyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }

  return (
    <div className="w-full glass-panel rounded-2xl p-3 sm:p-4 border border-white/8 bg-[#0D111C]/80 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
      {/* Wallet State & Identity */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-300">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-slate-300 text-xs font-medium">
            {truncatedAddress || "Wallet Not Connected"}
          </span>
          {address && (
            <button
              onClick={handleCopyAddress}
              className="text-slate-400 hover:text-cyan-300 transition p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              title={copied ? "Copied!" : "Copy Address"}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {address && onDisconnect && (
            <button
              onClick={onDisconnect}
              className="text-slate-500 hover:text-red-400 transition p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              title="Disconnect"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Network Switcher Mobile */}
        <div className="sm:hidden relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#131826] border border-white/8 text-[11px] text-slate-300"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isTestnetChain ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span className="font-mono">{isTestnetChain ? "Arc Testnet" : "Arc"}</span>
          </button>
        </div>
      </div>

      {/* Balance & Telemetry */}
      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono">
            <Coins className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold">{usdcBalance} USDC</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/25 text-purple-300 text-[11px] font-mono">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>EIP-3009 Gasless</span>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-slate-400 hover:text-white transition p-2 rounded-xl hover:bg-white/5 disabled:opacity-50 cursor-pointer"
          title="Refresh Balance"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>

        {/* Network Switcher Desktop */}
        <div className="hidden sm:block relative">
          {allowNetworkSwitch && onSwitchNetwork ? (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131826] hover:bg-[#1A2234] border border-white/8 text-xs text-slate-300 transition cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isTestnetChain ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <span className="font-mono">{isTestnetChain ? "Arc Testnet" : "Arc"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131826] border border-white/8 text-xs text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  isTestnetChain ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <span className="font-mono">{isTestnetChain ? "Arc Testnet" : "Arc"}</span>
            </div>
          )}

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#131826] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                Switch Network
              </div>
              {ALL_CHAINS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onSwitchNetwork?.(option.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                    option.id === currentChainId
                      ? "bg-purple-600/20 text-purple-300 font-bold"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        option.id === 5042002 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    />
                    <span>{option.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{option.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
