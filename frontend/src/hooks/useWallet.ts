"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { getExpectedChainId } from "@/lib/environment";
import { addChainParams, chainById, isArcChainId } from "@/lib/chains";

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMiniPay?: boolean;
}

function getInjectedEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = window.ethereum as any;
  if (!eth) return undefined;

  // When multiple wallet extensions are installed (e.g. MyTonWallet, Phantom, MetaMask):
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    const metamask = eth.providers.find((p: any) => p.isMetaMask && !p.isTonWallet);
    if (metamask?.request) return metamask;
    const cleanEvm = eth.providers.find((p: any) => !p.isTonWallet && typeof p.request === "function");
    if (cleanEvm?.request) return cleanEvm;
  }

  // If window.ethereum was wrapped/intercepted by TonWallet, inspect detected providers
  if (eth.isTonWallet && Array.isArray(eth.detected)) {
    const mm = eth.detected.find((p: any) => p.isMetaMask);
    if (mm?.request) return mm;
  }

  return typeof eth.request === "function" ? eth : undefined;
}

export function isMiniPay(): boolean {
  return getInjectedEthereum()?.isMiniPay === true;
}

export function hasEVMWallet(): boolean {
  return Boolean(getInjectedEthereum());
}

export function useWallet() {
  const { login, logout, authenticated, ready, user } = usePrivy();
  const { wallets } = useWallets();

  // Prefer an external wallet (MetaMask / MiniPay) over embedded when both exist.
  const primaryWallet =
    wallets.find((w) => w.walletClientType !== "privy") || wallets[0];
  // Only expose wallet address when Privy session is authenticated
  const address = authenticated ? (primaryWallet?.address || user?.wallet?.address || null) : null;

  /**
   * EIP-1193 provider for the active Privy wallet, falling back to window.ethereum.
   * Payment must use this — bare window.ethereum often points at a different wallet
   * than the one Privy authenticated, which causes eth_requestAccounts to hang.
   */
  const getProvider = useCallback(async (): Promise<EthereumProvider | undefined> => {
    if (primaryWallet) {
      try {
        const provider = (await primaryWallet.getEthereumProvider()) as EthereumProvider | null;
        if (provider && typeof provider.request === "function") {
          return provider;
        }
      } catch (err) {
        console.warn("[wallet] Privy getEthereumProvider failed:", err);
      }
    }
    return getInjectedEthereum();
  }, [primaryWallet]);

  const disconnectWallet = useCallback(async () => {
    try {
      // Disconnect active connected wallets from Privy state
      for (const wallet of wallets) {
        if (typeof wallet.disconnect === "function") {
          await wallet.disconnect();
        }
      }
      // Logout from Privy session if authenticated
      if (authenticated) {
        await logout();
      }
    } catch (err) {
      console.error("Wallet disconnect error:", err);
    }
  }, [authenticated, logout, wallets]);

  const connectWallet = useCallback(async (): Promise<string | null> => {
    try {
      login();
      return address;
    } catch (err) {
      console.error("Privy login error:", err);
      return null;
    }
  }, [login, address]);

  const switchOrAddChain = useCallback(
    async (chainId = getExpectedChainId()) => {
      const chainIdHex = `0x${chainId.toString(16)}`;
      const chainParams = addChainParams(chainId);

      if (primaryWallet) {
        try {
          await primaryWallet.switchChain(chainId);
          return;
        } catch {
          try {
            const provider = (await primaryWallet.getEthereumProvider()) as EthereumProvider;
            if (provider?.request) {
              try {
                await provider.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: chainIdHex }],
                });
                return;
              } catch (switchErr: unknown) {
                const err = switchErr as { code?: number; message?: string };
                if (
                  err.code === 4902 ||
                  err.message?.includes("Unrecognized chain") ||
                  err.message?.includes("Could not find chain")
                ) {
                  await provider.request({
                    method: "wallet_addEthereumChain",
                    params: [chainParams],
                  });
                  return;
                }
              }
            }
          } catch (providerErr) {
            console.error("Provider switch error:", providerErr);
          }
        }
      }

      const eth = getInjectedEthereum();
      if (eth?.request) {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
          });
        } catch (switchError: unknown) {
          const err = switchError as { code?: number; message?: string };
          if (
            err.code === 4902 ||
            err.message?.includes("Unrecognized chain") ||
            err.message?.includes("Could not find chain")
          ) {
            try {
              await eth.request({
                method: "wallet_addEthereumChain",
                params: [chainParams],
              });
            } catch (addError) {
              console.error("Failed to add network:", addError);
            }
          }
        }
      }
    },
    [primaryWallet]
  );

  const switchOrAddBotChain = useCallback(
    async (isTestnet = true) => {
      await switchOrAddChain(isTestnet ? 968 : 677);
    },
    [switchOrAddChain]
  );

  const defaultChainId = getExpectedChainId();
  const [injectedChainId, setInjectedChainId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const eth = window.ethereum as {
      request?: (args: { method: string }) => Promise<unknown>;
      on?: (event: string, cb: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
    };

    if (eth.request) {
      eth.request({ method: "eth_chainId" }).then((hex) => {
        if (typeof hex === "string") {
          const parsed = parseInt(hex, 16);
          if (Number.isFinite(parsed) && parsed > 0) setInjectedChainId(parsed);
        }
      }).catch(() => {});
    }

    if (!eth.on) return;
    const handleChainChanged = (hex: unknown) => {
      if (typeof hex === "string") {
        const parsed = parseInt(hex, 16);
        if (Number.isFinite(parsed) && parsed > 0) setInjectedChainId(parsed);
      }
    };

    eth.on("chainChanged", handleChainChanged);
    return () => {
      eth.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const chainIdRaw = primaryWallet?.chainId ? String(primaryWallet.chainId).replace("eip155:", "") : null;
  const currentChainId =
    (chainIdRaw ? parseInt(chainIdRaw, 10) : null) ||
    injectedChainId ||
    defaultChainId;
  const isTestnet = currentChainId === 968 || currentChainId === 5042002;
  const currentChainName = chainById(currentChainId).name;
  const isArc = isArcChainId(currentChainId);

  return {
    address,
    authenticated,
    ready,
    user,
    wallets,
    primaryWallet,
    currentChainId,
    isTestnet,
    isArc,
    currentChainName,
    inMiniPay: isMiniPay(),
    hasEVMWallet: hasEVMWallet(),
    connecting: !ready,
    connectWallet,
    disconnectWallet,
    switchOrAddChain,
    switchOrAddBotChain,
    getProvider,
  };
}
