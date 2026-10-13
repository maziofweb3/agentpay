"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
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

export function getInjectedEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = window.ethereum as EthereumProvider | undefined;
  if (!eth) return undefined;

  // When multiple wallet extensions are installed (e.g. MyTonWallet, Phantom, MetaMask):
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    const metamask = eth.providers.find((p) => p.isMetaMask && !p.isTonWallet);
    if (metamask?.request) return metamask;
    const cleanEvm = eth.providers.find(
      (p) => !p.isTonWallet && typeof p.request === "function"
    );
    if (cleanEvm?.request) return cleanEvm;
  }

  // If window.ethereum was wrapped/intercepted by TonWallet, inspect detected providers
  if (eth.isTonWallet && Array.isArray(eth.detected)) {
    const mm = eth.detected.find((p) => p.isMetaMask);
    if (mm?.request) return mm;
  }

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

export interface WalletState {
  address: string | null;
  authenticated: boolean;
  ready: boolean;
  user: ReturnType<typeof usePrivy>["user"];
  wallets: ReturnType<typeof useWallets>["wallets"];
  primaryWallet: ReturnType<typeof useWallets>["wallets"][0] | undefined;
  currentChainId: number;
  isTestnet: boolean;
  isArc: boolean;
  currentChainName: string;
  inMiniPay: boolean;
  hasEVMWallet: boolean;
  connecting: boolean;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  switchOrAddChain: (chainId?: number) => Promise<void>;
  getProvider: () => Promise<EthereumProvider | undefined>;
}

const WalletContext = createContext<WalletState | null>(null);

const STORAGE_CHAIN_KEY = "agentpay_chain_id";

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const { login, logout, authenticated, ready, user } = usePrivy();
  const { wallets } = useWallets();

  const primaryWallet =
    wallets.find((w) => w.walletClientType !== "privy") || wallets[0];

  const [injectedAddress, setInjectedAddress] = useState<string | null>(null);
  const [injectedChainId, setInjectedChainId] = useState<number | null>(null);

  // Initialize selected chain from localStorage or default to Arc Mainnet (5042)
  const defaultChainId = getExpectedChainId(); // 5042
  const [userSelectedChainId, setUserSelectedChainId] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_CHAIN_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (isArcChainId(parsed)) return parsed;
        }
      } catch {}
    }
    return defaultChainId;
  });

  // Calculate currentChainId: MUST BE an Arc chain (5042 or 5042002).
  // If the user's wallet is on Ethereum (1) or another chain, clamp to Arc.
  const chainIdRaw = primaryWallet?.chainId
    ? String(primaryWallet.chainId).replace("eip155:", "")
    : null;
  const walletChainId = chainIdRaw ? parseInt(chainIdRaw, 10) : null;

  const currentChainId: number =
    (userSelectedChainId && isArcChainId(userSelectedChainId) ? userSelectedChainId : null) ||
    (injectedChainId && isArcChainId(injectedChainId) ? injectedChainId : null) ||
    (walletChainId && isArcChainId(walletChainId) ? walletChainId : null) ||
    defaultChainId;

  const isTestnet = currentChainId === 5042002;
  const currentChainName = isTestnet ? "Arc Testnet" : "Arc";
  const isArc = true;

  // Detect active address reactively
  const rawAddress =
    (primaryWallet?.address && isAddress(primaryWallet.address)
      ? primaryWallet.address
      : null) ||
    (injectedAddress && isAddress(injectedAddress) ? injectedAddress : null) ||
    (user?.wallet?.address && isAddress(user.wallet.address)
      ? user.wallet.address
      : null) ||
    null;
  const address = authenticated || Boolean(injectedAddress) ? rawAddress : null;

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
      console.error("[wallet] Disconnect error:", err);
    }
  }, [authenticated, logout, wallets]);

  const connectWallet = useCallback(async (): Promise<string | null> => {
    try {
      login();
      return address;
    } catch (err) {
      console.error("[wallet] Login error:", err);
      return null;
    }
  }, [login, address]);

  const switchOrAddChain = useCallback(
    async (targetChainId: number = 5042) => {
      const chainId = isArcChainId(targetChainId) ? targetChainId : 5042;
      setUserSelectedChainId(chainId);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_CHAIN_KEY, String(chainId));
        } catch {}
        (window as any).__agentpayChainId = chainId;
      }

      const chainIdHex = `0x${chainId.toString(16)}`;
      const chainParams = addChainParams(chainId);

      // 1. Direct window.ethereum / injected EIP-1193 prompt (most reliable for MetaMask / Rabby)
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
            err.message?.includes("Could not find chain") ||
            err.message?.includes("not found")
          ) {
            try {
              await eth.request({
                method: "wallet_addEthereumChain",
                params: [chainParams],
              });
            } catch (addError) {
              console.warn("[wallet] wallet_addEthereumChain error:", addError);
            }
          }
        }
      }

      // 2. Also notify Privy primaryWallet
      if (primaryWallet) {
        try {
          await primaryWallet.switchChain(chainId);
        } catch (privyErr) {
          console.warn("[wallet] primaryWallet.switchChain caught:", privyErr);
        }
      }
    },
    [primaryWallet]
  );

  // Sync with injected provider events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const injected = getInjectedEthereum();
    if (!injected) return;

    if (injected.request) {
      try {
        injected
          .request({ method: "eth_chainId" })
          .then((hex) => {
            if (typeof hex === "string") {
              const parsed = parseInt(hex, 16);
              if (Number.isFinite(parsed) && isArcChainId(parsed)) {
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
      } catch {}
    }

    if (!injected.on) return;
    const handleChainChanged = (hex: unknown) => {
      if (typeof hex === "string") {
        const parsed = parseInt(hex, 16);
        if (Number.isFinite(parsed)) {
          if (isArcChainId(parsed)) {
            setInjectedChainId(parsed);
            setUserSelectedChainId(parsed);
            try {
              localStorage.setItem(STORAGE_CHAIN_KEY, String(parsed));
            } catch {}
          }
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

  const value: WalletState = {
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

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) {
    // Graceful fallback if invoked outside WalletContextProvider (e.g. testing)
    const defaultChainId = getExpectedChainId();
    return {
      address: null,
      authenticated: false,
      ready: true,
      user: null,
      wallets: [],
      primaryWallet: undefined,
      currentChainId: defaultChainId,
      isTestnet: defaultChainId === 5042002,
      isArc: true,
      currentChainName: defaultChainId === 5042002 ? "Arc Testnet" : "Arc",
      inMiniPay: false,
      hasEVMWallet: false,
      connecting: false,
      connectWallet: async () => null,
      disconnectWallet: async () => {},
      switchOrAddChain: async () => {},
      getProvider: async () => undefined,
    };
  }
  return context;
}
