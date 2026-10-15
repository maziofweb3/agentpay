"use client";

import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { usePromptHistory } from "@/hooks/usePromptHistory";
import { BalanceBar } from "@/components/BalanceBar";
import {
  History,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Wallet,
} from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  const allowNetworkSwitch = useCanSwitchNetwork();
  const {
    address,
    currentChainId,
    isTestnet,
    disconnectWallet,
    switchOrAddChain,
  } = useWallet();
  const { usdcBalance, loading: balanceLoading, refetch } = useBalance(
    address,
    currentChainId
  );
  const { items, loading, syncing, error, refresh } = usePromptHistory(
    address,
    currentChainId
  );

  const networkLabel = isTestnet ? "Arc Testnet" : "Arc Mainnet";

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

      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="p-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-amber-400" />
            <h1 className="font-bold text-white text-base">Payment History</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {syncing && (
            <span className="text-[10px] text-slate-400 flex items-center space-x-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>syncing</span>
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading || syncing}
            className="p-1.5 bg-slate-900 text-slate-400 hover:text-amber-400 rounded-lg border border-slate-800 transition disabled:opacity-40"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <span className="text-xs font-semibold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/50">
            {networkLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Info banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Onchain Micropayments Tracked</span>
          </div>
          <p className="text-slate-400">
            All micropayments settle via x402 on Arc with USDC EIP-3009 gasless
            signatures and are recorded in the AgentPayRegistry contract.
          </p>
        </div>

        {/* Not connected */}
        {!address && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
            <Wallet className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">
              Connect your wallet to view your payment history.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {address && loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl animate-pulse h-16"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {address && !loading && error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-3.5 text-xs text-red-400">
            <p className="font-semibold">Could not load on-chain history</p>
            <p className="text-red-500/80 mt-0.5">{error}</p>
            <p className="text-slate-400 mt-1">
              Showing locally cached entries. Tap refresh to retry.
            </p>
          </div>
        )}

        {/* Empty state */}
        {address && !loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
            <History className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No payments yet.</p>
            <p className="text-slate-500 text-xs">
              Your activity will appear here after your first paid prompt.
            </p>
          </div>
        )}

        {/* History list */}
        {address && !loading && items.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Recent Micropayments
              {items.length > 0 && (
                <span className="ml-2 text-slate-500 normal-case font-normal">
                  ({items.length})
                </span>
              )}
            </h2>

            {items.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="font-semibold text-white text-xs truncate">
                      {item.tool}
                    </h3>
                    {item.status === "settled" ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center space-x-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Settled ({isTestnet ? "Testnet" : "Arc"})</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center space-x-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>Pending</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 flex-wrap gap-y-0.5">
                    <span>{item.timestamp}</span>
                    {item.txHash && (
                      <>
                        <span>•</span>
                        <a
                          href={item.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 text-amber-400 hover:text-amber-300 font-mono transition"
                          title="View on explorer"
                        >
                          <span>
                            {item.txHash.slice(0, 6)}…{item.txHash.slice(-4)}
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}
                    {!item.txHash && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500 italic">awaiting confirmation</span>
                      </>
                    )}
                  </div>
                </div>

                <span className="text-xs font-bold text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0 whitespace-nowrap">
                  {item.amountFormatted}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
