"use client";

import { useEffect, useState } from "react";

export interface ServicePriceItem {
  targetUsdCost: number;
  multiplier: number;
  amountTokens: number;
  amountAtomic: string;
}

export interface ApayPriceResponse {
  status: string;
  token: string;
  priceUsd: number;
  updatedAt: number;
  ttlSec: number;
  source: string;
  baseComputeUnitUsd: number;
  servicePrices: {
    chat: ServicePriceItem;
    relay: ServicePriceItem;
    code: ServicePriceItem;
    image: ServicePriceItem;
  };
}

const DEFAULT_FALLBACK_PRICE: ApayPriceResponse = {
  status: "ok",
  token: "USDC",
  priceUsd: 1.0,
  updatedAt: Date.now(),
  ttlSec: 3600,
  source: "default_fallback",
  baseComputeUnitUsd: 0.0058,
  servicePrices: {
    chat: { targetUsdCost: 0.0058, multiplier: 1.0, amountTokens: 0.0058, amountAtomic: "5800" },
    relay: { targetUsdCost: 0.0058, multiplier: 1.0, amountTokens: 0.0058, amountAtomic: "5800" },
    code: { targetUsdCost: 0.0150, multiplier: 2.0, amountTokens: 0.0150, amountAtomic: "15000" },
    image: { targetUsdCost: 0.0200, multiplier: 5.0, amountTokens: 0.0200, amountAtomic: "20000" },
  },
};

export function useApayPrice() {
  const [priceData, setPriceData] = useState<ApayPriceResponse>(DEFAULT_FALLBACK_PRICE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const res = await fetch("/api/price");
        if (res.ok) {
          const data = (await res.json()) as ApayPriceResponse;
          if (!cancelled && data.priceUsd > 0) {
            setPriceData(data);
          }
        }
      } catch (e) {
        console.warn("[useApayPrice] Failed to fetch /api/price, using fallback:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, (priceData.ttlSec || 3600) * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [priceData.ttlSec]);

  return { ...priceData, loading };
}
