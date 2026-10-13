"use client";

export {
  useWallet,
  getInjectedEthereum,
  isMiniPay,
  hasEVMWallet,
} from "@/context/WalletContext";

export type {
  EthereumProvider,
  WalletState,
} from "@/context/WalletContext";
