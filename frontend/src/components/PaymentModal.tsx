"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ShieldCheck, Loader2, DollarSign, X, Coins, Wallet, Zap, CheckCircle2 } from "lucide-react";
import {
  BUDGET_PRESETS_USD,
  PAYMENT_ASSET,
  formatApay,
} from "@/lib/pricing";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  /** Price of the single tool call about to run (USD). */
  priceUsd: number;
  /** Remaining pre-authorized USDT budget (USD). */
  remainingUsd: number;
  /**
   * Wallet USDT balance (USD). Authorization amount must be ≤ this.
   * Pass the live balance from useBalance (e.g. "12.34" or 12.34).
   */
  walletUsdtBalance?: number | string;
  loading?: boolean;
  /**
   * Called when the user confirms a budget grant.
   * `budgetUsd` is the amount to authorize (within [price, wallet balance]).
   */
  onConfirm: (budgetUsd: number) => void;
}

function parseBalance(raw: number | string | undefined): number {
  if (raw === undefined || raw === null) return 0;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Round to 2 decimal places for USDT UI (still 6-decimal under the hood later). */
function roundUsd(n: number): number {
  return Math.round(n * 100) / 100;
}

export function PaymentModal({
  isOpen,
  onClose,
  toolName,
  priceUsd,
  remainingUsd,
  walletUsdtBalance = 0,
  loading = false,
  onConfirm,
}: PaymentModalProps) {
  const balanceUsd = parseBalance(walletUsdtBalance);
  /** Only show this modal when the user must authorize *more* USDT. */
  const needsTopUp = remainingUsd + 1e-9 < priceUsd;

  // Min = this request; max = full wallet balance.
  const minAuth = Math.max(priceUsd, 0.01);
  const maxAuth = balanceUsd;

  const canAfford = maxAuth + 1e-9 >= minAuth;

  const defaultAmount = useMemo(() => {
    if (!canAfford) return maxAuth > 0 ? maxAuth.toFixed(2) : "";
    const preferred =
      BUDGET_PRESETS_USD.find((p) => p >= minAuth && p <= maxAuth + 1e-9) ??
      Math.min(Math.max(minAuth, 1), maxAuth);
    return roundUsd(preferred).toFixed(2);
  }, [canAfford, maxAuth, minAuth]);

  // Free-form amount is the primary control; presets fill it in.
  const [amountInput, setAmountInput] = useState<string>("");
  const [touched, setTouched] = useState(false);

  const activeAmount = touched ? amountInput : defaultAmount;

  const grantAmount = useMemo(() => {
    const parsed = Number(activeAmount);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
  }, [activeAmount]);

  const validationError = useMemo(() => {
    if (!needsTopUp) return null;
    if (!canAfford) {
      return `Insufficient ${PAYMENT_ASSET} balance. Need at least ${formatApay(minAuth)}, wallet has ${formatApay(balanceUsd)}.`;
    }
    if (!touched && activeAmount === "") return null;
    if (!Number.isFinite(grantAmount) || grantAmount <= 0) {
      return "Enter an amount greater than zero.";
    }
    if (grantAmount + 1e-9 < minAuth) {
      return `Minimum for this request is ${formatApay(minAuth)}.`;
    }
    if (grantAmount - 1e-9 > maxAuth) {
      return `Cannot exceed your wallet balance of ${formatApay(maxAuth)}.`;
    }
    return null;
  }, [
    needsTopUp,
    canAfford,
    touched,
    activeAmount,
    grantAmount,
    minAuth,
    maxAuth,
    balanceUsd,
  ]);

  const canConfirm =
    !loading &&
    needsTopUp &&
    canAfford &&
    !validationError &&
    grantAmount + 1e-9 >= minAuth &&
    grantAmount - 1e-9 <= maxAuth;

  const availablePresets = BUDGET_PRESETS_USD.filter(
    (p) => p + 1e-9 >= minAuth && p - 1e-9 <= maxAuth
  );

  if (!isOpen || !needsTopUp) return null;

  function setAmountFromPreset(usd: number) {
    setTouched(true);
    setAmountInput(roundUsd(clamp(usd, minAuth, maxAuth || usd)).toFixed(2));
  }

  function onAmountChange(raw: string) {
    setTouched(true);
    if (raw === "" || /^\d*\.?\d{0,6}$/.test(raw)) {
      setAmountInput(raw);
    }
  }

  function onAmountBlur() {
    if (amountInput === "" || !Number.isFinite(Number(amountInput))) return;
    if (canAfford) {
      const clamped = roundUsd(clamp(Number(amountInput), minAuth, maxAuth));
      setAmountInput(clamped.toFixed(2));
    }
  }

  function handleMax() {
    if (!canAfford) return;
    setTouched(true);
    setAmountInput(roundUsd(maxAuth).toFixed(2));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/85 backdrop-blur-xl animate-in fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 bg-[#0D111C]/95 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5 disabled:opacity-50 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#131826] border border-white/10 p-1.5 flex items-center justify-center shrink-0 shadow-lg shadow-[#0AA082]/15">
            <Image
              src="/agentpay-mark.png"
              alt="AgentPay Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-base sm:text-lg flex items-center gap-1.5">
              <span>AgentPay</span> <span className="text-[#0AA082]">Permit</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              EIP-3009 Gasless authorization for {toolName}
            </p>
          </div>
        </div>

        {/* Telemetry Summary Panel */}
        <div className="bg-[#0A0E17] p-4 rounded-2xl border border-white/6 space-y-2.5 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Target Service</span>
            <span className="font-medium text-white">{toolName}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Required Charge</span>
            <span className="font-bold text-cyan-300">{formatApay(priceUsd)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Active Budget</span>
            <span className={`font-medium ${needsTopUp ? "text-rose-300" : "text-emerald-300"}`}>
              {formatApay(remainingUsd)}
            </span>
          </div>
          <div className="flex justify-between text-slate-400 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Wallet className="w-3.5 h-3.5 text-purple-400" />
              Wallet {PAYMENT_ASSET}
            </span>
            <span className="font-bold text-white">{formatApay(balanceUsd)}</span>
          </div>
        </div>

        {/* Grant Controls */}
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-display font-bold text-white block">
              Pre-Authorize Allowance
            </label>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
              Choose an amount within your balance. Tool executions will stream gaslessly until this budget is depleted.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-[#0A0E17] border border-white/10 rounded-xl px-3 py-2">
              <span className="text-xs text-cyan-400 font-bold">$</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                disabled={loading || !canAfford}
                value={activeAmount}
                onChange={(e) => onAmountChange(e.target.value)}
                onBlur={onAmountBlur}
                placeholder={`${minAuth.toFixed(2)} – ${maxAuth.toFixed(2)}`}
                className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none disabled:opacity-50"
              />
              <span className="text-[11px] font-mono text-slate-400">{PAYMENT_ASSET}</span>
              <button
                type="button"
                disabled={loading || !canAfford}
                onClick={handleMax}
                className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition disabled:opacity-40 cursor-pointer"
              >
                MAX
              </button>
            </div>

            {canAfford && maxAuth > minAuth + 0.001 && (
              <input
                type="range"
                min={minAuth}
                max={maxAuth}
                step={0.01}
                disabled={loading}
                value={clamp(
                  Number.isFinite(grantAmount) && grantAmount > 0 ? grantAmount : minAuth,
                  minAuth,
                  maxAuth
                )}
                onChange={(e) => {
                  setTouched(true);
                  setAmountInput(roundUsd(Number(e.target.value)).toFixed(2));
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            )}
          </div>

          {/* Quick Presets */}
          {(availablePresets.length > 0 || canAfford) && (
            <div className="grid grid-cols-3 gap-2">
              {availablePresets.slice(0, 3).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={loading}
                  onClick={() => setAmountFromPreset(preset)}
                  className={`py-2 rounded-xl text-xs font-mono font-medium border transition cursor-pointer ${
                    Math.abs(grantAmount - preset) < 0.001
                      ? "bg-purple-600/30 border-purple-500/60 text-purple-200 font-bold"
                      : "bg-[#131826] border-white/6 text-slate-400 hover:text-white"
                  } disabled:opacity-40`}
                >
                  {formatApay(preset)}
                </button>
              ))}
            </div>
          )}

          {validationError && (
            <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-xl px-3 py-2 leading-relaxed">
              {validationError}
            </p>
          )}
        </div>

        {/* Guarantee Info */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131826]/70 border border-white/6 text-[11px] text-slate-400 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Gasless EIP-712 signature. Funds never leave your wallet until an AI prompt successfully completes settlement.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#131826] hover:bg-[#1A2234] border border-white/8 text-slate-300 font-medium text-xs transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!canConfirm) return;
              onConfirm(roundUsd(grantAmount));
            }}
            disabled={!canConfirm}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 disabled:opacity-40 text-white font-bold text-xs tracking-wide shadow-xl shadow-purple-600/30 transition cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing...</span>
              </>
            ) : (
              <span>
                Authorize {grantAmount > 0 ? formatApay(roundUsd(grantAmount)) : formatApay(minAuth)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
