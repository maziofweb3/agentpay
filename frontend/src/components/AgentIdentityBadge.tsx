"use client";

import { ShieldCheck, Star } from "lucide-react";

interface AgentIdentityBadgeProps {
  reputationScore?: number;
  totalReviews?: number;
}

export function AgentIdentityBadge({
  reputationScore = 98,
  totalReviews = 142,
}: AgentIdentityBadgeProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-2.5">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5 font-bold text-white">
            <span>ERC-8004 Verified Agent</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              ID #1
            </span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Onchain Identity & Trust Protocol on BotChain EVM
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span className="font-bold text-white text-xs">{reputationScore}%</span>
        <span className="text-[10px] text-slate-500">({totalReviews})</span>
      </div>
    </div>
  );
}
