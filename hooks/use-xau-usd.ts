'use client';

import { useState, useEffect, useRef } from 'react';

export interface TickerQuote {
  price: number;
  pct: number;
}

export interface XauUsdData {
  xau: TickerQuote | null;
  usd: TickerQuote | null;
}

const TROY_OZ_TO_GRAM = 31.1035;
const REFRESH_MS = 5 * 60 * 1000;

export function useXauUsd(): XauUsdData {
  const [data, setData] = useState<XauUsdData>({ xau: null, usd: null });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetch_() {
    try {
      const r = await fetch('https://economia.awesomeapi.com.br/json/last/XAU-BRL,USD-BRL');
      if (!r.ok) return;
      const json = await r.json();
      const xau = json.XAUBRL;
      const usd = json.USDBRL;
      setData({
        xau: xau ? { price: Number(xau.bid) / TROY_OZ_TO_GRAM, pct: Number(xau.pctChange) } : null,
        usd: usd ? { price: Number(usd.bid), pct: Number(usd.pctChange) } : null,
      });
    } catch {
      // silently fail — ticker is non-critical
    }
  }

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return data;
}
