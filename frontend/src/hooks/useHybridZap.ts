"use client";

import { useState, useEffect, useCallback } from "react";
import {
  parseUnits,
  formatUnits,
  createPublicClient,
  createWalletClient,
  custom,
  http,
  maxUint256,
} from "viem";
import { botChain } from "@/lib/chains";
import { DEX_CONFIG, HYBRID_ZAP_ABI, UNISWAP_V2_FACTORY_ABI, UNISWAP_V2_PAIR_ABI } from "@/lib/dex";
import { ERC20_ABI } from "@/lib/tokens";
import { useWallet } from "./useWallet";

const publicClient = createPublicClient({
  chain: botChain,
  transport: http("https://rpc.botchain.ai"),
});

export interface PoolData {
  pairAddress: `0x${string}` | null;
  reserveIn: bigint;
  reserveApay: bigint;
  totalLpSupply: bigint;
  userLpBalance: bigint;
  userPooledIn: string;
  userPooledApay: string;
  userSharePercent: number;
}

export type ZapStep =
  | "idle"
  | "checking_chain"
  | "approving"
  | "confirming_approval"
  | "zapping"
  | "confirming_zap"
  | "success"
  | "error";

export function useHybridZap() {
  const { address, getProvider, switchOrAddBotChain } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [zapStep, setZapStep] = useState<ZapStep>("idle");
  const [stepMessage, setStepMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [apayTotalSupply, setApayTotalSupply] = useState<bigint>(0n);
  const [isMintPhase, setIsMintPhase] = useState<boolean>(true);
  const [usdtPool, setUsdtPool] = useState<PoolData>({
    pairAddress: null,
    reserveIn: 0n,
    reserveApay: 0n,
    totalLpSupply: 0n,
    userLpBalance: 0n,
    userPooledIn: "0",
    userPooledApay: "0",
    userSharePercent: 0,
  });
  const [botPool, setBotPool] = useState<PoolData>({
    pairAddress: null,
    reserveIn: 0n,
    reserveApay: 0n,
    totalLpSupply: 0n,
    userLpBalance: 0n,
    userPooledIn: "0",
    userPooledApay: "0",
    userSharePercent: 0,
  });

  const config = DEX_CONFIG.mainnet;

  const fetchPoolInfo = useCallback(
    async (tokenIn: `0x${string}`, decimalsIn: number): Promise<PoolData> => {
      try {
        const pair = (await publicClient.readContract({
          address: config.factory,
          abi: UNISWAP_V2_FACTORY_ABI,
          functionName: "getPair",
          args: [tokenIn, config.apay],
        })) as `0x${string}`;

        if (!pair || pair === "0x0000000000000000000000000000000000000000") {
          return {
            pairAddress: null,
            reserveIn: 0n,
            reserveApay: 0n,
            totalLpSupply: 0n,
            userLpBalance: 0n,
            userPooledIn: "0",
            userPooledApay: "0",
            userSharePercent: 0,
          };
        }

        const [reserves, token0, totalLp] = await Promise.all([
          publicClient.readContract({
            address: pair,
            abi: UNISWAP_V2_PAIR_ABI,
            functionName: "getReserves",
          }),
          publicClient.readContract({
            address: pair,
            abi: UNISWAP_V2_PAIR_ABI,
            functionName: "token0",
          }),
          publicClient.readContract({
            address: pair,
            abi: UNISWAP_V2_PAIR_ABI,
            functionName: "totalSupply",
          }),
        ]);

        const isToken0 = (token0 as string).toLowerCase() === tokenIn.toLowerCase();
        const reserveIn = isToken0 ? BigInt((reserves as any)[0]) : BigInt((reserves as any)[1]);
        const reserveApay = isToken0 ? BigInt((reserves as any)[1]) : BigInt((reserves as any)[0]);
        const totalLpSupply = (totalLp as unknown as bigint) || 0n;

        let userLpBalance = 0n;
        let userPooledIn = "0";
        let userPooledApay = "0";
        let userSharePercent = 0;

        if (address) {
          userLpBalance = (await publicClient.readContract({
            address: pair,
            abi: UNISWAP_V2_PAIR_ABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          })) as bigint;

          if (totalLpSupply > 0n && userLpBalance > 0n) {
            const userIn = (userLpBalance * reserveIn) / totalLpSupply;
            const userApay = (userLpBalance * reserveApay) / totalLpSupply;

            userPooledIn = formatUnits(userIn, decimalsIn);
            userPooledApay = formatUnits(userApay, 18);
            userSharePercent = (Number(userLpBalance) / Number(totalLpSupply)) * 100;
          }
        }

        return {
          pairAddress: pair,
          reserveIn,
          reserveApay,
          totalLpSupply,
          userLpBalance,
          userPooledIn,
          userPooledApay,
          userSharePercent,
        };
      } catch (err) {
        console.warn("[dex] fetchPoolInfo error:", err);
        return {
          pairAddress: null,
          reserveIn: 0n,
          reserveApay: 0n,
          totalLpSupply: 0n,
          userLpBalance: 0n,
          userPooledIn: "0",
          userPooledApay: "0",
          userSharePercent: 0,
        };
      }
    },
    [config.factory, config.apay, address]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Total Supply of APAY
      const supply = (await publicClient.readContract({
        address: config.apay,
        abi: [
          {
            name: "totalSupply",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "uint256" }],
          },
        ],
        functionName: "totalSupply",
      })) as bigint;

      setApayTotalSupply(supply);
      setIsMintPhase(supply < config.maxSupplyCap);

      // 2. Fetch Pools
      const [uPool, bPool] = await Promise.all([
        fetchPoolInfo(config.usdt, 6),
        fetchPoolInfo(config.wbot, 18),
      ]);

      setUsdtPool(uPool);
      setBotPool(bPool);
    } catch (err) {
      console.error("[dex] refreshAll error:", err);
    } finally {
      setLoading(false);
    }
  }, [config.apay, config.maxSupplyCap, config.usdt, config.wbot, fetchPoolInfo]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 12000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Estimation helper
  const estimateZap = useCallback(
    async (
      tokenType: "USDT" | "BOT",
      amountStr: string
    ): Promise<{ isMint: boolean; expectedApay: string; expectedLp: string }> => {
      if (!amountStr || parseFloat(amountStr) <= 0) {
        return { isMint: isMintPhase, expectedApay: "0", expectedLp: "0" };
      }

      const isUSDT = tokenType === "USDT";
      const tokenIn = isUSDT ? config.usdt : config.wbot;
      const decimalsIn = isUSDT ? 6 : 18;
      const amountIn = parseUnits(amountStr, decimalsIn);
      const pool = isUSDT ? usdtPool : botPool;

      if (!pool.pairAddress || pool.reserveIn === 0n || pool.reserveApay === 0n) {
        return { isMint: isMintPhase, expectedApay: "0", expectedLp: "0" };
      }

      // If hybridZap is deployed on-chain, try reading its estimateZapIn
      if (config.hybridZap && config.hybridZap !== "0x0000000000000000000000000000000000000000") {
        try {
          const res = (await publicClient.readContract({
            address: config.hybridZap,
            abi: HYBRID_ZAP_ABI,
            functionName: "estimateZapIn",
            args: [tokenIn, amountIn],
          })) as [boolean, bigint, bigint];
          return {
            isMint: res[0],
            expectedApay: formatUnits(res[1], 18),
            expectedLp: formatUnits(res[2], 18),
          };
        } catch {
          // Fallback to client-side math
        }
      }

      // Client-side simulation
      if (isMintPhase) {
        const targetMint = (amountIn * pool.reserveApay) / pool.reserveIn;
        const estLp =
          pool.totalLpSupply > 0n
            ? (amountIn * pool.totalLpSupply) / pool.reserveIn
            : 0n;
        return {
          isMint: true,
          expectedApay: formatUnits(targetMint, 18),
          expectedLp: formatUnits(estLp, 18),
        };
      } else {
        // Stage 2 approximate 50% split
        const swapHalf = amountIn / 2n;
        const targetApay = (swapHalf * pool.reserveApay) / (pool.reserveIn + swapHalf);
        const estLp = (swapHalf * pool.totalLpSupply) / pool.reserveIn;
        return {
          isMint: false,
          expectedApay: formatUnits(targetApay, 18),
          expectedLp: formatUnits(estLp, 18),
        };
      }
    },
    [config, isMintPhase, usdtPool, botPool]
  );

  // Execution helper using Viem WalletClient and receipt confirmation
  const executeZap = useCallback(
    async (
      tokenType: "USDT" | "BOT",
      amountStr: string
    ): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");
      const provider = await getProvider();
      if (!provider) throw new Error("No web3 provider available");

      setTxPending(true);
      setError(null);
      setZapStep("checking_chain");
      setStepMessage("Verifying network connection (BotChain Mainnet)...");

      try {
        // 1. Ensure BotChain Mainnet (Chain ID 677)
        if (typeof switchOrAddBotChain === "function") {
          await switchOrAddBotChain(false);
        }

        const isUSDT = tokenType === "USDT";
        const tokenIn = isUSDT ? config.usdt : config.wbot;
        const decimalsIn = isUSDT ? 6 : 18;
        const amountIn = parseUnits(amountStr, decimalsIn);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 mins

        const zapTarget = config.hybridZap;
        if (!zapTarget || zapTarget === "0x0000000000000000000000000000000000000000") {
          throw new Error("AgentPayHybridZap contract is not configured on Mainnet");
        }

        const walletClient = createWalletClient({
          account: address as `0x${string}`,
          chain: botChain,
          transport: custom(provider as any),
        });

        if (isUSDT) {
          // 1. Check current USDT allowance
          const allowance = (await publicClient.readContract({
            address: config.usdt,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address as `0x${string}`, zapTarget],
          })) as bigint;

          if (allowance < amountIn) {
            setZapStep("approving");
            setStepMessage("Please approve USDT spending in your wallet...");

            const approveHash = await walletClient.writeContract({
              address: config.usdt,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [zapTarget, maxUint256],
            });

            setZapStep("confirming_approval");
            setStepMessage("Confirming USDT approval on BotChain...");

            const approveReceipt = await publicClient.waitForTransactionReceipt({
              hash: approveHash,
              confirmations: 1,
            });

            if (approveReceipt.status !== "success") {
              throw new Error("USDT approval transaction reverted on-chain.");
            }
          }

          // 2. Call zapInToken
          setZapStep("zapping");
          setStepMessage("Please confirm the 1-Click Liquidity Zap in your wallet...");

          const zapHash = await walletClient.writeContract({
            address: zapTarget,
            abi: HYBRID_ZAP_ABI,
            functionName: "zapInToken",
            args: [tokenIn, amountIn, 0n, address as `0x${string}`, deadline],
          });

          setZapStep("confirming_zap");
          setStepMessage("Confirming Zap transaction on BotChain...");

          const zapReceipt = await publicClient.waitForTransactionReceipt({
            hash: zapHash,
            confirmations: 1,
          });

          if (zapReceipt.status !== "success") {
            throw new Error("Zap transaction reverted on-chain.");
          }

          setZapStep("success");
          setStepMessage("Liquidity added successfully!");
          await refreshAll();
          return zapHash;
        } else {
          // 2. Native BOT call -> zapInETH
          setZapStep("zapping");
          setStepMessage("Please confirm the 1-Click Liquidity Zap in your wallet...");

          const zapHash = await walletClient.writeContract({
            address: zapTarget,
            abi: HYBRID_ZAP_ABI,
            functionName: "zapInETH",
            args: [0n, address as `0x${string}`, deadline],
            value: amountIn,
          });

          setZapStep("confirming_zap");
          setStepMessage("Confirming Zap transaction on BotChain...");

          const zapReceipt = await publicClient.waitForTransactionReceipt({
            hash: zapHash,
            confirmations: 1,
          });

          if (zapReceipt.status !== "success") {
            throw new Error("Zap transaction reverted on-chain.");
          }

          setZapStep("success");
          setStepMessage("Liquidity added successfully!");
          await refreshAll();
          return zapHash;
        }
      } catch (err: unknown) {
        console.error("[dex] executeZap failed:", err);
        const msg = err instanceof Error ? err.message : "Transaction failed";
        setError(msg);
        setZapStep("error");
        setStepMessage(msg);
        throw err;
      } finally {
        setTxPending(false);
      }
    },
    [address, config, getProvider, refreshAll, switchOrAddBotChain]
  );

  return {
    loading,
    txPending,
    zapStep,
    stepMessage,
    error,
    apayTotalSupply,
    isMintPhase,
    usdtPool,
    botPool,
    refreshAll,
    estimateZap,
    executeZap,
  };
}
