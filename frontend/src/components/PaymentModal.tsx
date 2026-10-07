"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Loader2, DollarSign, X, Coins, Wallet } from "lucide-react";
import {
  BUDGET_PRESETS_USD,
  PAYMENT_ASSET,
  formatApay,
  formatUsdt,
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

  // Free-form amount is the primary control; presets fill it in.
  const [amountInput, setAmountInput] = useState("");
  const [touched, setTouched] = useState(false);

  // Reset / seed when modal opens or balance changes.
  useEffect(() => {
    if (!isOpen || !needsTopUp) return;
    setTouched(false);
    if (!canAfford) {
      setAmountInput(maxAuth > 0 ? maxAuth.toFixed(2) : "");
      return;
    }
    // Default: first preset that fits, else min(auth, balance).
    const preferred =
      BUDGET_PRESETS_USD.find((p) => p >= minAuth && p <= maxAuth + 1e-9) ??
      Math.min(Math.max(minAuth, 1), maxAuth);
    setAmountInput(roundUsd(preferred).toFixed(2));
  }, [isOpen, needsTopUp, minAuth, maxAuth, canAfford]);

  const grantAmount = useMemo(() => {
    const parsed = Number(amountInput);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
  }, [amountInput]);

  const validationError = useMemo(() => {
    if (!needsTopUp) return null;
    if (!canAfford) {
      return `Insufficient ${PAYMENT_ASSET} balance. Need at least ${formatApay(minAuth)}, wallet has ${formatApay(balanceUsd)}.`;
    }
    if (!touched && amountInput === "") return null;
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
    amountInput,
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

  // Never block the user when remaining authorized credit already covers this request.
  // Only the "authorize more money" flow is allowed to render.
  if (!isOpen || !needsTopUp) return null;

  function setAmountFromPreset(usd: number) {
    setTouched(true);
    setAmountInput(roundUsd(clamp(usd, minAuth, maxAuth || usd)).toFixed(2));
  }

  function onAmountChange(raw: string) {
    setTouched(true);
    // Allow empty / partial typing ("", "0.", "1.2")
    if (raw === "" || /^\d*\.?\d{0,6}$/.test(raw)) {
      setAmountInput(raw);
    }
  }

  function onAmountBlur() {
    if (amountInput === "" || !Number.isFinite(Number(amountInput))) return;
    // Soft-clamp to [min, max] on blur so the user sees a valid value.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Authorize more USDT</h3>
            <p className="text-xs text-slate-400">
              Your authorized balance is too low for this request
            </p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Service</span>
            <span className="font-medium text-white">{toolName}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>This request</span>
            <span className="font-medium text-emerald-400">{formatApay(priceUsd)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Remaining authorized</span>
            <span
              className={`font-medium ${
                needsTopUp ? "text-rose-300" : "text-emerald-300"
              }`}
            >
              {formatApay(remainingUsd)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-900">
            <span className="flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              Wallet {PAYMENT_ASSET}
            </span>
            <span className="font-medium text-emerald-300">{formatApay(balanceUsd)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-white">Payment asset</span>
            <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              {PAYMENT_ASSET}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-300 font-medium">
              How much additional {PAYMENT_ASSET} may AgentPay spend?
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              Enter any amount from{" "}
              <span className="text-slate-400">{formatApay(minAuth)}</span> up to your full
              balance of <span className="text-slate-400">{formatApay(maxAuth)}</span>. After
              this, tool calls continue without another prompt until the budget runs out.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 shrink-0">$</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                disabled={loading || !canAfford}
                value={amountInput}
                onChange={(e) => onAmountChange(e.target.value)}
                onBlur={onAmountBlur}
                placeholder={`${minAuth.toFixed(2)} – ${maxAuth.toFixed(2)}`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                aria-label={`Authorization amount in ${PAYMENT_ASSET}`}
                aria-invalid={Boolean(validationError)}
              />
              <span className="text-xs text-slate-400 shrink-0">{PAYMENT_ASSET}</span>
              <button
                type="button"
                disabled={loading || !canAfford}
                onClick={handleMax}
                className="text-[11px] font-bold px-2 py-2 rounded-lg border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-40"
                title="Authorize full wallet balance"
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
                className="w-full accent-emerald-400"
                aria-label="Authorization amount slider"
              />
            )}

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Min {formatApay(minAuth)}</span>
              <span>Max {formatApay(maxAuth)}</span>
            </div>
          </div>

          {(availablePresets.length > 0 || canAfford) && (
            <div className="grid grid-cols-2 gap-2">
              {availablePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={loading}
                  onClick={() => setAmountFromPreset(preset)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition ${
                    Math.abs(grantAmount - preset) < 0.001
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600"
                  } disabled:opacity-40`}
                >
                  {formatApay(preset)}
                </button>
              ))}
              <button
                type="button"
                disabled={loading || !canAfford}
                onClick={() => setAmountFromPreset(minAuth)}
                className={`py-2 rounded-lg text-xs font-semibold border transition ${
                  Math.abs(grantAmount - minAuth) < 0.001
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600"
                } disabled:opacity-40`}
              >
                Just this ({formatApay(minAuth)})
              </button>
              <button
                type="button"
                disabled={loading || !canAfford}
                onClick={handleMax}
                className={`py-2 rounded-lg text-xs font-semibold border transition ${
                  Math.abs(grantAmount - maxAuth) < 0.001
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600"
                } disabled:opacity-40`}
              >
                Full balance
              </button>
            </div>
          )}

          {validationError && (
            <p className="text-[11px] text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg px-2.5 py-2">
              {validationError}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            You pick any amount within your {PAYMENT_ASSET} balance. After this
            authorization, tool calls spend from it until it is exhausted.
          </span>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl transition text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!canConfirm) return;
              onConfirm(roundUsd(grantAmount));
            }}
            disabled={!canConfirm}
            className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authorizing…</span>
              </>
            ) : (
              <span>
                Allow{" "}
                {grantAmount > 0 ? formatApay(roundUsd(grantAmount)) : formatApay(minAuth)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
