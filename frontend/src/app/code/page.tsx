"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { usePaidService } from "@/hooks/usePaidService";
import { useBackendWarmup } from "@/hooks/useBackendWarmup";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import {
  Code,
  Sparkles,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Wallet,
  Cpu,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

import { useApayPrice } from "@/hooks/useApayPrice";
import { formatServiceCharge } from "@/lib/pricing";

interface Vulnerability {
  severity?: "HIGH" | "MEDIUM" | "LOW" | string;
  title?: string;
  description?: string;
}

interface AuditReport {
  score: string;
  vulnerabilities: number;
  summary: string;
  suggestions: string[];
  details?: Vulnerability[];
}

const SAMPLE_PRESETS: Record<string, { label: string; code: string }> = {
  reentrancy: {
    label: "Reentrancy Bug",
    code: `// VULNERABLE: Reentrancy attack example
pragma solidity ^0.8.0;
contract VulnerableVault {
    mapping(address => uint256) public balances;
    function deposit() public payable { balances[msg.sender] += msg.value; }
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] = 0; // Bug: state updated AFTER external call
    }
}`,
  },
  erc20: {
    label: "ERC-20 Vault",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
contract TokenVault is Ownable {
    IERC20 public token;
    mapping(address => uint256) public deposits;
    constructor(address _token) Ownable(msg.sender) { token = IERC20(_token); }
    function deposit(uint256 amount) external {
        token.transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
    }
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient");
        deposits[msg.sender] -= amount;
        token.transfer(msg.sender, amount);
    }
    function emergencyWithdraw() external onlyOwner {
        token.transfer(owner(), token.balanceOf(address(this)));
    }
}`,
  },
  staking: {
    label: "Staking Pool",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract StakingPool {
    mapping(address => uint256) public staked;
    mapping(address => uint256) public rewards;
    uint256 public rewardRate = 100; // per block
    uint256 public totalStaked;
    function stake() external payable {
        require(msg.value > 0, "Must stake > 0");
        staked[msg.sender] += msg.value;
        totalStaked += msg.value;
    }
    function claimRewards() external {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards");
        rewards[msg.sender] = 0;
        payable(msg.sender).transfer(reward);
    }
    function unstake(uint256 amount) external {
        require(staked[msg.sender] >= amount, "Insufficient");
        staked[msg.sender] -= amount;
        totalStaked -= amount;
        payable(msg.sender).transfer(amount);
    }
}`,
  },
};

function SeverityBadge({ count, label }: { count: number; label: string }) {
  const colors =
    label === "HIGH"
      ? "text-rose-300 bg-rose-950/50 border-rose-800"
      : label === "MEDIUM"
      ? "text-orange-300 bg-orange-950/50 border-orange-800"
      : "text-yellow-300 bg-yellow-950/50 border-yellow-800";
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${colors}`}>
      {count} {label}
    </span>
  );
}

function ScoreCard({ score }: { score: string }) {
  const grade = score.toUpperCase().replace(/[^A-F]/g, "")[0] || "?";
  const color =
    grade === "A"
      ? "text-emerald-400 border-emerald-700"
      : grade === "B"
      ? "text-teal-400 border-teal-700"
      : grade === "C"
      ? "text-yellow-400 border-yellow-700"
      : grade === "D"
      ? "text-orange-400 border-orange-700"
      : "text-rose-400 border-rose-700";
  return (
    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 ${color} bg-slate-950 shrink-0`}>
      <span className={`text-xl font-black font-mono ${color}`}>{grade}</span>
    </div>
  );
}

export default function CodePage() {
  // Wake the Render free-tier backend on page load (prevents cold-start payment timeouts)
  useBackendWarmup();
  const allowNetworkSwitch = useCanSwitchNetwork();
  const { disconnectWallet, switchOrAddChain } = useWallet();
  const { servicePrices } = useApayPrice();
  const {
    address,
    authenticated,
    connectWallet,
    isTestnet,
    isArc,
    currentChainId,
    runPaid,
    loading: paidLoading,
    error: paymentError,
    paymentStep,
    formattedAmount,
  } = usePaidService("code");
  const {
    usdcBalance,
    paymentBalance,
    paymentSymbol,
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);

  const [codeSnippet, setCodeSnippet] = useState("");
  const [provider, setProvider] = useState<"groq" | "gemini" | "claude">("groq");
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);

  async function handleAudit() {
    if (!codeSnippet.trim() || loading || paidLoading) return;
    if (Number(paymentBalance) <= 0) {
      setError(
        `Insufficient USDC balance: your wallet currently has ${paymentBalance} USDC. Top up on Arc to pay for code security audits.`
      );
      return;
    }
    setLoading(true);
    setAuditResult(null);
    setError(null);

    try {
      const data = await runPaid<{ audit?: AuditReport }>({ code: codeSnippet, provider });
      if (!data?.audit) {
        throw new Error("No audit verdict returned from the server");
      }
      setAuditResult(data.audit);
      refetch();
    } catch (err: unknown) {
      console.error("Audit error:", err);
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || paidLoading;

  return (
    <main className="flex flex-col h-[calc(100dvh-0px)] max-w-md mx-auto bg-slate-950 text-slate-100 shadow-2xl border-x border-slate-800 overflow-hidden">
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
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="p-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-amber-400" />
            <h1 className="font-bold text-white text-base">Smart Contract Auditor</h1>
          </div>
        </div>
        <span className="text-xs font-bold bg-slate-900 text-amber-400 px-2.5 py-1 rounded-lg border border-slate-800">
          {formatServiceCharge(servicePrices.code.targetUsdCost, servicePrices.code.amountTokens, currentChainId)} / audit
        </span>
      </div>

      {/* Model Selector Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
          <Cpu className="w-3.5 h-3.5 text-amber-400" />
          <span>Model:</span>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 space-x-1">
          <button
            onClick={() => setProvider("groq")}
            className={`px-2.5 py-1 rounded-md font-semibold transition text-[11px] ${
              provider === "groq"
                ? "bg-amber-500 text-slate-950 shadow font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚡ Groq 120B
          </button>
          <button
            onClick={() => setProvider("gemini")}
            className={`px-2.5 py-1 rounded-md font-semibold transition text-[11px] ${
              provider === "gemini"
                ? "bg-blue-500 text-white shadow font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ✨ Gemini
          </button>
          <button
            onClick={() => setProvider("claude")}
            className={`px-2.5 py-1 rounded-md font-semibold transition text-[11px] ${
              provider === "claude"
                ? "bg-purple-500 text-white shadow font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Claude 3.5
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Info Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Security Audit — x402 Micropayments</span>
          </div>
          <p className="text-slate-400">
            Paste Solidity contract code below for an AI security audit. Get a letter grade, vulnerability count, summary, and actionable suggestions.
          </p>
        </div>

        {/* Connect Wallet */}
        {!authenticated || !address ? (
          <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-4 space-y-3 text-xs">
            <p className="text-purple-100 font-medium">Connect a wallet to pay with USDC on Arc</p>
            <button
              onClick={() => connectWallet()}
              className="w-full flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-400 text-white font-semibold py-2.5 rounded-xl transition"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </div>
        ) : null}

        {/* Payment Status */}
        {paymentStep === "signing" && (
          <div className="bg-amber-950/40 border border-amber-800/80 text-amber-300 rounded-xl p-3 text-xs flex items-center space-x-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>🔑 Sign {formattedAmount || "USDC"} payment authorization in your wallet (0 gas)...</span>
          </div>
        )}
        {paymentStep === "verifying" && (
          <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 rounded-xl p-3 text-xs flex items-center space-x-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>🔍 Authorization signed! Verifying payment on Arc...</span>
          </div>
        )}

        {/* Errors */}
        {paymentError && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl p-3 text-xs">
            {paymentError}
          </div>
        )}
        {error && (
          <div
            className={`rounded-xl p-3.5 text-xs space-y-1.5 ${
              /quota|429|rate_limit|RESOURCE_EXHAUSTED|limit: 20/i.test(error)
                ? "bg-amber-950/60 border border-amber-500/60 text-amber-200"
                : "bg-rose-950/40 border border-rose-800 text-rose-300"
            }`}
          >
            <div className="font-semibold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {/quota|429|rate_limit|RESOURCE_EXHAUSTED|limit: 20/i.test(error)
                  ? "AI Quota Exceeded (HTTP 429)"
                  : "Audit Error"}
              </span>
            </div>
            <p className="leading-relaxed opacity-90">{error}</p>
          </div>
        )}

        {/* Audit Result */}
        {auditResult && (
          <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-4 space-y-4 text-xs">
            {/* Score + Vuln Summary Row */}
            <div className="flex items-center space-x-3">
              <ScoreCard score={auditResult.score} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5 font-bold text-slate-100 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Audit Report</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {auditResult.vulnerabilities > 0 ? (
                    <span className="text-rose-300 bg-rose-950/50 border border-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">
                      {auditResult.vulnerabilities} {auditResult.vulnerabilities === 1 ? "issue" : "issues"} found
                    </span>
                  ) : (
                    <span className="text-emerald-300 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>No issues found</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            {auditResult.summary && (
              <p className="text-slate-200 leading-relaxed border-t border-slate-800 pt-3">
                {auditResult.summary}
              </p>
            )}

            {/* Suggestions */}
            {auditResult.suggestions.length > 0 && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Recommendations</span>
                </div>
                <ul className="space-y-2">
                  {auditResult.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex space-x-2 text-slate-300 leading-relaxed">
                      <span className="text-amber-400 shrink-0 font-bold">{i + 1}.</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Panel */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 space-y-2.5 shrink-0">
        {/* Sample Presets */}
        <div className="relative">
          <button
            onClick={() => setPresetsOpen((o) => !o)}
            className="w-full flex items-center justify-between text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <span className="font-medium">Load Sample Contract</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${presetsOpen ? "rotate-180" : ""}`} />
          </button>
          {presetsOpen && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl z-10">
              {Object.entries(SAMPLE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCodeSnippet(preset.code);
                    setPresetsOpen(false);
                    setAuditResult(null);
                    setError(null);
                  }}
                  className="w-full text-left text-xs px-4 py-2.5 hover:bg-slate-800 text-slate-300 hover:text-white transition border-b border-slate-800/50 last:border-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Code Input */}
        <div className="relative">
          <textarea
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder={
              authenticated && address
                ? "Paste Solidity contract code here..."
                : "Connect wallet to run a paid audit..."
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pr-12 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 resize-none h-24 font-mono"
          />
          <button
            onClick={handleAudit}
            disabled={busy || !codeSnippet.trim()}
            className="absolute bottom-3 right-3 p-2 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 text-slate-950 rounded-lg transition"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
