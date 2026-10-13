"use client";

import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { History, ExternalLink, ShieldCheck, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  const allowNetworkSwitch = useCanSwitchNetwork();
  const { address, currentChainId, isTestnet, disconnectWallet, switchOrAddChain } = useWallet();
  const {
    usdcBalance,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);

  const mockHistory = [
    {
      id: "1",
      tool: "AI Text Assistant",
      amount: "0.0058 USDC",
      timestamp: "2 mins ago",
      txHash: "0x3f7a1b...89c2",
      status: "Settled (Arc)",
    },
    {
      id: "2",
      tool: "AI Image Creator",
      amount: "0.0200 USDC",
      timestamp: "15 mins ago",
      txHash: "0x9e2c4d...11a4",
      status: "Settled (Arc)",
    },
    {
      id: "3",
      tool: "AI Code Reviewer",
      amount: "0.0150 USDC",
      timestamp: "1 hour ago",
      txHash: "0x6a8f0b...55d9",
      status: "Settled (Arc)",
    },
  ];

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
          <Link href="/" className="p-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-amber-400" />
            <h1 className="font-bold text-white text-base">Payment History</h1>
          </div>
        </div>
        <span className="text-xs font-semibold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/50">
          Arc Network
        </span>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Onchain Micropayments Tracked</span>
          </div>
          <p className="text-slate-400">
            All micropayments are settled via x402 on Arc with USDC EIP-3009 gasless signatures.
          </p>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Recent Micropayments
          </h2>

          {mockHistory.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-white text-xs">{item.tool}</h3>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{item.status}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span>{item.timestamp}</span>
                  <span>•</span>
                  <a
                    href="https://explorer.arc.io"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-amber-400 hover:text-amber-300 font-mono"
                  >
                    <span>{item.txHash}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <span className="text-xs font-bold text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {item.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
