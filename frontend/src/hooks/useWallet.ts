"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { isAddress } from "viem";
import { getExpectedChainId } from "@/lib/environment";
import { addChainParams, chainById, isArcChainId } from "@/lib/chains";

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMiniPay?: boolean;
  isMetaMask?: boolean;
  isTonWallet?: boolean;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
  providers?: EthereumProvider[];
  detected?: EthereumProvider[];
}

function getInjectedEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = window.ethereum as EthereumProvider | undefined;
  if (!eth) return undefined;

  // When multiple wallet extensions are installed (e.g. MyTonWallet, Phantom, MetaMask):
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    const metamask = eth.providers.find((p) => p.isMetaMask && !p.isTonWallet);
    if (metamask?.request) return metamask;
    const cleanEvm = eth.providers.find((p) => !p.isTonWallet && typeof p.request === "function");
    if (cleanEvm?.request) return cleanEvm;
  }

  // If window.ethereum was wrapped/intercepted by TonWallet, inspect detected providers
  if (eth.isTonWallet && Array.isArray(eth.detected)) {
    const mm = eth.detected.find((p) => p.isMetaMask);
    if (mm?.request) return mm;
  }

  // If the provider itself is TonWallet (and no other clean EVM provider was detected),
  // TonWallet's EVM connector is known to intercept requests and fail with:
  // "Open your wallet to finish updating it, then reconnect."
  // Do not expose it as the default injected EVM provider.
  if (eth.isTonWallet) {
    return undefined;
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
  const [injectedAddress, setInjectedAddress] = useState<string | null>(null);
  const [userSelectedChainId, setUserSelectedChainId] = useState<number | null>(null);

  // Detect active address reactively from Privy primary wallet, injected accounts, or Privy user
  const rawAddress =
    (primaryWallet?.address && isAddress(primaryWallet.address) ? primaryWallet.address : null) ||
    (injectedAddress && isAddress(injectedAddress) ? injectedAddress : null) ||
    (user?.wallet?.address && isAddress(user.wallet.address) ? user.wallet.address : null) ||
    null;
  const address = authenticated || Boolean(injectedAddress) ? rawAddress : null;

  /**
   * EIP-1193 provider for the active Privy wallet, falling back to window.ethereum.
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
      for (const wallet of wallets) {
        if (typeof wallet.disconnect === "function") {
          await wallet.disconnect();
        }
      }
      if (authenticated) {
        await logout();
      }
      setInjectedAddress(null);
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
      setUserSelectedChainId(chainId);
      if (typeof window !== "undefined") {
        (window as any).__agentpayChainId = chainId;
      }
      const chainIdHex = `0x${chainId.toString(16)}`;
      const chainParams = addChainParams(chainId);

      // Primary path: let Privy switchChain manage the wallet prompt
      if (primaryWallet) {
        try {
          await primaryWallet.switchChain(chainId);
          return;
        } catch (privyErr) {
          console.warn("[wallet] primaryWallet.switchChain fallback to EIP-1193:", privyErr);
        }
      }

      // Secondary fallback path: direct EIP-1193 provider switch/add
      const eth = (primaryWallet ? await primaryWallet.getEthereumProvider() : getInjectedEthereum()) as EthereumProvider | undefined;
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

  const defaultChainId = getExpectedChainId();
  const [injectedChainId, setInjectedChainId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const injected = getInjectedEthereum() as {
      request?: (args: { method: string }) => Promise<unknown>;
      on?: (event: string, cb: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
    } | undefined;

    if (!injected) return;

    if (injected.request) {
      try {
        injected
          .request({ method: "eth_chainId" })
          .then((hex) => {
            if (typeof hex === "string") {
              const parsed = parseInt(hex, 16);
              if (Number.isFinite(parsed) && parsed > 0) {
                setInjectedChainId(parsed);
              }
            }
          })
          .catch(() => {});

        injected
          .request({ method: "eth_accounts" })
          .then((accounts: unknown) => {
            if (Array.isArray(accounts) && accounts[0] && isAddress(accounts[0])) {
              setInjectedAddress(accounts[0]);
            }
          })
          .catch(() => {});
      } catch {
        // Ignore extension errors
      }
    }

    if (!injected.on) return;
    const handleChainChanged = (hex: unknown) => {
      if (typeof hex === "string") {
        const parsed = parseInt(hex, 16);
        if (Number.isFinite(parsed) && parsed > 0) {
          setInjectedChainId(parsed);
          setUserSelectedChainId(parsed);
          (window as any).__agentpayChainId = parsed;
        }
      }
    };

    const handleAccountsChanged = (accounts: unknown) => {
      if (Array.isArray(accounts) && accounts[0] && isAddress(accounts[0])) {
        setInjectedAddress(accounts[0]);
      } else {
        setInjectedAddress(null);
      }
    };

    injected.on("chainChanged", handleChainChanged);
    injected.on("accountsChanged", handleAccountsChanged);
    return () => {
      injected.removeListener?.("chainChanged", handleChainChanged);
      injected.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const chainIdRaw = primaryWallet?.chainId ? String(primaryWallet.chainId).replace("eip155:", "") : null;
  const currentChainId =
    userSelectedChainId ||
    (chainIdRaw ? parseInt(chainIdRaw, 10) : null) ||
    injectedChainId ||
    defaultChainId;
  const isTestnet = currentChainId === 5042002;
  const currentChainName = chainById(currentChainId).name;
  const isArc = true; // Always Arc

  return {
    address,
    authenticated: authenticated || Boolean(injectedAddress),
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
    getProvider,
  };
}
