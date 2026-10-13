import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "@/app/globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentPay AI — Autonomous Agent Cyber-FinTech on Arc",
  description:
    "Premier Web3 AI intelligence at ultra-low cost, charging strictly per use with USDC micropayments on Arc instead of bulky subscriptions. Gasless EIP-3009 signatures.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans bg-[#090D16] text-[#dfe2ef] min-h-screen antialiased selection:bg-purple-600 selection:text-white flex flex-col`}
        suppressHydrationWarning
      >
        <WalletProvider>
          <TopNav />
          <div className="flex-1 pb-24 md:pb-8">{children}</div>
          <BottomNav />
        </WalletProvider>
      </body>
    </html>
  );
}
