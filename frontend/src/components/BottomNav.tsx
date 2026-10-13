"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bot, Image as ImageIcon, Code, History, ArrowRightLeft } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chat", label: "Chat", icon: Bot },
    { href: "/image", label: "Image", icon: ImageIcon },
    { href: "/code", label: "Code", icon: Code },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 max-w-md mx-auto z-40">
      <div className="glass-dock rounded-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-b from-purple-500/20 to-indigo-500/20 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? "text-cyan-300 scale-110" : "text-slate-400"
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? "text-white font-bold" : "text-slate-400 font-medium"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] mt-0.5 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
