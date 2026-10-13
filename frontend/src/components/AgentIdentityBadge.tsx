"use client";

import Image from "next/image";
import { ShieldCheck, Star, Activity, Zap, CheckCircle2 } from "lucide-react";

interface AgentIdentityBadgeProps {
  reputationScore?: number;
  totalReviews?: number;
  medianSettlement?: string;
}

export function AgentIdentityBadge({
  reputationScore = 98,
  totalReviews = 142,
  medianSettlement = "0.004s",
}: AgentIdentityBadgeProps) {
  return (
    <div className="w-full glass-panel rounded-2xl p-4 sm:p-5 border border-white/8 bg-[#0D111C]/90 hover:border-emerald-500/25 transition-all shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Shield & Identity Data */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#131826] border border-[#0AA082]/30 p-1 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(10,160,130,0.25)]">
            <Image
              src="/agentpay-mark.png"
              alt="Verified Agent"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold text-sm sm:text-base text-white">
                ERC-8004 Verified Agent
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 font-bold">
                ID #1
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Autonomous Mode
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Onchain Identity & Trust Protocol on Arc Network • Settlement verification automated
            </p>
          </div>
        </div>

        {/* Right: Metrics & Telemetry Chips */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131826] border border-white/8 text-xs">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-bold text-white">{reputationScore}%</span>
            <span className="text-[11px] text-slate-400">({totalReviews} calls)</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131826] border border-white/8 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300 font-bold">{medianSettlement}</span>
            <span className="text-[11px] text-slate-400">Settlement</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-mono font-semibold">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>BOF Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
