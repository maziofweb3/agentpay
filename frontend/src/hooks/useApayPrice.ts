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
  token: "APAY",
  priceUsd: 0.0078,
  updatedAt: Date.now(),
  ttlSec: 3600,
  source: "default_fallback",
  baseComputeUnitUsd: 0.0078,
  servicePrices: {
    chat: { targetUsdCost: 0.0078, multiplier: 1.0, amountTokens: 1.0, amountAtomic: "1000000000000000000" },
    relay: { targetUsdCost: 0.0078, multiplier: 1.0, amountTokens: 1.0, amountAtomic: "1000000000000000000" },
    code: { targetUsdCost: 0.0156, multiplier: 2.0, amountTokens: 2.0, amountAtomic: "2000000000000000000" },
    image: { targetUsdCost: 0.0390, multiplier: 5.0, amountTokens: 5.0, amountAtomic: "5000000000000000000" },
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
