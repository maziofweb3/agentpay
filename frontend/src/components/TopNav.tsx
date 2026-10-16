"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import {
  Wallet,
  Coins,
  Copy,
  Check,
  LogOut,
  ChevronDown,
  Bot,
  Image as ImageIcon,
  Code,
  History,
  Home,
} from "lucide-react";
import { ALL_CHAINS } from "@/lib/chains";

export function TopNav() {
  const pathname = usePathname();
  const {
    address,
    connecting,
    currentChainId,
    currentChainName,
    connectWallet,
    disconnectWallet,
    switchOrAddChain,
  } = useWallet();

  const { usdcBalance, loading: balanceLoading } = useBalance(
    address,
    currentChainId
  );

  const [chainMenuOpen, setChainMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  async function handleCopy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy address", e);
    }
  }

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chat", label: "Chat", icon: Bot },
    { href: "/image", label: "Image", icon: ImageIcon },
    { href: "/code", label: "Code", icon: Code },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-[#090D16]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#131826] border border-white/10 p-1 flex items-center justify-center shadow-lg shadow-[#0AA082]/15 group-hover:shadow-[#0AA082]/30 group-hover:border-[#0AA082]/40 transition-all">
              <Image
                src="/agentpay-mark.png"
                alt="AgentPay AI"
                width={32}
                height={32}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                AgentPay <span className="text-[#0AA082] font-extrabold">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono -mt-0.5 tracking-wider uppercase">
                Pay-Per-Prompt • Arc
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-[#131826]/80 p-1 rounded-xl border border-white/6">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-md shadow-purple-900/30 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-300" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Telemetry & Wallet Operations */}
        <div className="flex items-center gap-2.5">
          {/* Network Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setChainMenuOpen(!chainMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#131826] hover:bg-[#1A2234] border border-white/8 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline font-mono">{currentChainName}</span>
              <span className="sm:hidden font-mono">Arc</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {chainMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#131826] border border-white/10 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                  Select Network
                </div>
                {ALL_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => {
                      switchOrAddChain(chain.id);
                      setChainMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                      currentChainId === chain.id
                        ? "bg-purple-600/20 text-purple-300 font-bold"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span>{chain.name}</span>
                    {currentChainId === chain.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* USDC Balance Chip */}
          {address && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131826] border border-cyan-500/20 text-xs">
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 font-medium">Bal:</span>
              <span className="font-mono font-bold text-cyan-300">
                {balanceLoading ? "..." : `${usdcBalance} USDC`}
              </span>
            </div>
          )}

          {/* Wallet Action */}
          {!address ? (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 text-white font-semibold text-xs tracking-wide shadow-lg shadow-purple-600/25 transition cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{connecting ? "Connecting..." : "Connect Wallet"}</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-900/60 hover:to-indigo-900/60 border border-purple-500/30 text-xs text-white font-medium transition cursor-pointer"
              >
                <div className="w-5 h-5 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300">
                  <Wallet className="w-3 h-3" />
                </div>
                <span className="font-mono">{truncatedAddress}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {walletMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#131826] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                  <div className="p-2 bg-[#0D111C] rounded-lg border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Connected Address
                    </span>
                    <div className="flex items-center justify-between text-xs font-mono text-white">
                      <span>{truncatedAddress}</span>
                      <button
                        onClick={handleCopy}
                        className="text-slate-400 hover:text-cyan-300 p-1 rounded hover:bg-white/5 transition"
                        title="Copy Address"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-2 flex items-center justify-between text-xs text-slate-300">
                    <span className="text-slate-400">Balance:</span>
                    <span className="font-mono font-bold text-cyan-300">{usdcBalance} USDC</span>
                  </div>

                  <button
                    onClick={() => {
                      disconnectWallet();
                      setWalletMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
