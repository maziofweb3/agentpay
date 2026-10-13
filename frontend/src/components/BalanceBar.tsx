"use client";

import { useState } from "react";
import { Wallet, Coins, RefreshCw, Cpu, LogOut, ChevronDown, Copy, Check } from "lucide-react";
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
    <div className="w-full bg-slate-900 border-b border-slate-800 px-4 py-3 text-white flex flex-col space-y-2 text-sm relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Wallet className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-slate-300 text-xs">
            {truncatedAddress || "Not Connected"}
          </span>
          {address && (
            <button
              onClick={handleCopyAddress}
              className="text-slate-400 hover:text-purple-300 transition p-1 rounded hover:bg-slate-800"
              title={copied ? "Copied!" : "Copy Wallet Address"}
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
              className="text-slate-500 hover:text-red-400 transition p-1 rounded hover:bg-slate-800"
              title="Disconnect Wallet"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          {allowNetworkSwitch ? (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-1.5 bg-purple-950/70 hover:bg-purple-900 px-2.5 py-1 rounded-full border border-purple-700/50 text-[11px] font-semibold text-purple-200 transition cursor-pointer shadow-sm"
              title="Switch network"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isTestnetChain ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <Cpu className="w-3 h-3 text-purple-300" />
              <span>
                {chain.name} ({currentChainId})
              </span>
              <ChevronDown className="w-3 h-3 text-purple-400" />
            </button>
          ) : (
            <div
              className="flex items-center space-x-1.5 bg-purple-950/70 px-2.5 py-1 rounded-full border border-purple-700/50 text-[11px] font-semibold text-purple-200 shadow-sm"
              title="Active network"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isTestnetChain ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <Cpu className="w-3 h-3 text-purple-300" />
              <span>
                {chain.name} ({currentChainId})
              </span>
            </div>
          )}

          {menuOpen && allowNetworkSwitch && onSwitchNetwork && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-purple-900/60 rounded-lg shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch Network
              </div>
              {ALL_CHAINS.map((option) => {
                const active = option.id === currentChainId;
                const testnet = option.id === 5042002;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      onSwitchNetwork(option.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition ${
                      active
                        ? "bg-purple-900/60 text-purple-200 font-semibold"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          testnet ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                      />
                      <span>{option.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{option.id}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1.5 shrink-0">
          <div
            className="flex items-center space-x-1 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-700/60"
            title="Connected Wallet USDC Balance on Arc"
          >
            <Coins className="w-3 h-3 text-emerald-400" />
            <span className="font-semibold text-emerald-300 text-[11px]">
              {usdcBalance} USDC
            </span>
          </div>
          <div
            className="flex items-center space-x-1 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-700/50 text-[10px] text-amber-300 font-mono"
            title="x402 micropayments settle USDC via Circle / EIP-3009"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Pay: USDC (EIP-3009)</span>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-800 disabled:opacity-50"
          title="Refresh balances"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
