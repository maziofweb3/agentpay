"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { arc, arcTestnet } from "@/lib/chains";
import { getExpectedChainId } from "@/lib/environment";
import { WalletContextProvider } from "@/context/WalletContext";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

  const defaultChain = arc;
  const supportedChains = [arc, arcTestnet];

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#8b5cf6",
          logo: "https://agentpay-ai.vercel.app/icon.png",
          walletChainType: "ethereum-only",
        },
        loginMethods: ["wallet", "email"],
        supportedChains,
        defaultChain,
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        externalWallets: {
          walletConnect: {
            enabled: false,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
