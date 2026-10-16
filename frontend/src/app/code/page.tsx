"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { usePaidService } from "@/hooks/usePaidService";
import { useBackendWarmup } from "@/hooks/useBackendWarmup";
import { useCanSwitchNetwork } from "@/hooks/useCanSwitchNetwork";
import { BalanceBar } from "@/components/BalanceBar";
import { useApayPrice } from "@/hooks/useApayPrice";
import { formatServiceCharge } from "@/lib/pricing";
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
  Terminal,
  FileCode,
  CheckCircle2,
  Bug,
  Zap,
  Layers,
  ArrowRight,
} from "lucide-react";

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

const SAMPLE_PRESETS: Record<string, { label: string; code: string; desc: string }> = {
  reentrancy: {
    label: "Reentrancy Bug",
    desc: "State updated after external transfer (classic DAO vulnerability)",
    code: `// VULNERABLE: Reentrancy attack example
pragma solidity ^0.8.0;

contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");

        // External call before state mutation
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);

        balances[msg.sender] = 0; // State updated too late
    }
}`,
  },
  erc20: {
    label: "ERC-20 Vault",
    desc: "Unchecked return values and missing reentrancy guard",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenVault is Ownable {
    IERC20 public token;
    mapping(address => uint256) public deposits;

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

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
    desc: "Rounding error & reward calculation overflow risk",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StakingPool {
    mapping(address => uint256) public staked;
    mapping(address => uint256) public rewards;
    uint256 public rewardRate = 100;
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
}`,
  },
};

function ScoreBadge({ score }: { score: string }) {
  const grade = score.toUpperCase().replace(/[^A-F]/g, "")[0] || "B";
  const colors =
    grade === "A"
      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
      : grade === "B"
      ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_15px_rgba(56,189,248,0.25)]"
      : grade === "C"
      ? "text-yellow-400 border-yellow-500/40 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.25)]"
      : "text-rose-400 border-rose-500/40 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.25)]";

  return (
    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 ${colors} shrink-0`}>
      <span className="text-2xl font-black font-mono leading-none">{grade}</span>
      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 mt-1">Grade</span>
    </div>
  );
}

export default function CodePage() {
  useBackendWarmup();
  const allowNetworkSwitch = useCanSwitchNetwork();
  const { disconnectWallet, switchOrAddChain } = useWallet();
  const { servicePrices } = useApayPrice();
  const {
    address,
    authenticated,
    connectWallet,
    isTestnet,
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
    loading: balanceLoading,
    refetch,
  } = useBalance(address, currentChainId);

  const [codeSnippet, setCodeSnippet] = useState(SAMPLE_PRESETS.reentrancy.code);
  const [provider, setProvider] = useState<"groq" | "gemini" | "claude">("groq");
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("reentrancy");

  async function handleAudit() {
    if (!codeSnippet.trim() || loading || paidLoading) return;
    if (Number(paymentBalance) <= 0) {
      setError(
        `Insufficient USDC balance: your wallet currently has ${paymentBalance} USDC. Top up on Arc to pay for code audits.`
      );
      return;
    }
    setLoading(true);
    setAuditResult(null);
    setError(null);

    try {
      const data = await runPaid<{ audit?: AuditReport }>({ code: codeSnippet, provider });
      if (!data?.audit) {
        throw new Error("No audit report returned from the verification server");
      }
      setAuditResult(data.audit);
      refetch();
    } catch (err: unknown) {
      console.error("Audit error:", err);
      setError(err instanceof Error ? err.message : "Contract security audit failed");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || paidLoading;

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-300">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg text-white">
                Smart Contract Auditor & Patch Flow
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Solidity AST scan • Reentrancy detection • Automated patch telemetry
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
          <div className="flex bg-[#131826] p-1 rounded-xl border border-white/8 gap-1">
            <button
              onClick={() => setProvider("groq")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs ${
                provider === "groq"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Groq
            </button>
            <button
              onClick={() => setProvider("gemini")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs ${
                provider === "gemini"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ✨ Gemini
            </button>
            <button
              onClick={() => setProvider("claude")}
              className={`px-3 py-1.5 rounded-lg font-medium transition text-xs ${
                provider === "claude"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Claude
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            {formatServiceCharge(servicePrices.code.targetUsdCost, servicePrices.code.amountTokens, currentChainId)} / audit
          </div>
        </div>
      </div>

      {/* Dual-Pane Auditor IDE: Desktop 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane (7 cols): Solidity Editor Console */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/8 bg-[#0D111C]/90 shadow-xl space-y-4">
            {/* Presets Selector Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-display font-bold text-sm text-white">
                  Solidity Contract Editor
                </span>
              </div>

              {/* Sample Presets Tabs */}
              <div className="flex items-center gap-1.5 bg-[#131826] p-1 rounded-xl border border-white/8">
                {Object.entries(SAMPLE_PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(key);
                      setCodeSnippet(item.code);
                      setAuditResult(null);
                      setError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      selectedPreset === key
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Input Console */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0A0E17] shadow-inner">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#131826]/70 border-b border-white/5 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  Contract.sol
                </span>
                <span>{codeSnippet.split("\n").length} lines • Solidity ^0.8.x</span>
              </div>

              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                rows={16}
                disabled={busy}
                className="w-full bg-transparent p-4 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Error & Telemetry Messages */}
            {paymentStep === "signing" && (
              <div className="rounded-xl p-3 bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span>Sign {formattedAmount || "USDC"} audit payment authorization in wallet (0 gas)...</span>
              </div>
            )}

            {paymentStep === "verifying" && (
              <div className="rounded-xl p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                <span>Verifying payment receipt on Arc Network...</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {/* Execute Audit CTA */}
            <button
              onClick={handleAudit}
              disabled={busy || !codeSnippet.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 active:scale-95 disabled:opacity-40 text-white font-bold text-xs tracking-wide shadow-xl shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing Contract on Arc...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Run Security Audit ({servicePrices.code.targetUsdCost.toFixed(4)} USDC)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Pane (5 cols): Audit Verdict & Patch Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/8 bg-[#0D111C]/90 shadow-2xl min-h-[500px] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <span className="font-display font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Security Report & Patch Telemetry
              </span>
              {auditResult && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified on Arc
                </span>
              )}
            </div>

            {/* Body of Report */}
            <div className="flex-1">
              {busy ? (
                <div className="text-center py-20 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <h4 className="font-display font-bold text-base text-white">
                    Analyzing AST & Vulnerabilities...
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Scanning for reentrancy, access control bypasses, and unvalidated calls.
                  </p>
                </div>
              ) : auditResult ? (
                <div className="space-y-4">
                  {/* Score & Issue Count Banner */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-[#131826] border border-white/8">
                    <ScoreBadge score={auditResult.score} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-white">
                          Security Verdict
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          Score: {auditResult.score}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {auditResult.vulnerabilities > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold flex items-center gap-1">
                            <Bug className="w-3 h-3" />
                            {auditResult.vulnerabilities} {auditResult.vulnerabilities === 1 ? "Vulnerability" : "Vulnerabilities"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            No Critical Vulnerabilities Found
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {auditResult.summary && (
                    <div className="p-3.5 rounded-xl bg-[#0A0E17] border border-white/6 text-xs text-slate-300 leading-relaxed">
                      {auditResult.summary}
                    </div>
                  )}

                  {/* Recommendations & Actionable Patches */}
                  {auditResult.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold block flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Remediation Patches
                      </span>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {auditResult.suggestions.map((sug, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#131826]/80 border border-white/6 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5"
                          >
                            <span className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 space-y-3 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h4 className="font-display font-bold text-base text-white">
                    Auditor Ready
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select a sample contract on the left or paste your custom Solidity code. Click &quot;Run Security Audit&quot; to inspect issues and patch suggestions.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Proof Stripe */}
            <div className="border-t border-white/6 pt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Circle USDC Micropayments</span>
              <span>x402 Security Telemetry</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
