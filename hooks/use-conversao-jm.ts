'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchConversaoJm, type ConversaoJmRow } from '@/lib/actions/fetch-conversao-jm';

export interface ConversaoJmKpi {
  qtdFabricada: number;
  qtdVendida: number;
  conversao: number;
  mediaVida: number;
  custoTotal: number;
  arrecadacao: number;
  lucrat: number;
}

export interface ConversaoJmPorProduto {
  name: string;
  qtd: number;
  custo: number;
  arrecadacao: number;
}

export interface ConversaoJmData {
  kpi: ConversaoJmKpi;
  porProdutoCusto: ConversaoJmPorProduto[];
  porProdutoArrecadacao: ConversaoJmPorProduto[];
  rows: ConversaoJmRow[];
}

function buildData(rows: ConversaoJmRow[]): ConversaoJmData {
  const vendidas = rows.filter(r => r.data_venda && r.preco_cobrado);
  const diasValidos = vendidas.filter(r => r.dias_vida != null).map(r => r.dias_vida as number);

  const custoTotal = rows.reduce((s, r) => s + r.custo_real, 0);
  const arrecadacao = vendidas.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0);

  const kpi: ConversaoJmKpi = {
    qtdFabricada: rows.length,
    qtdVendida: vendidas.length,
    conversao: rows.length > 0 ? (vendidas.length / rows.length) * 100 : 0,
    mediaVida: diasValidos.length > 0 ? diasValidos.reduce((s, d) => s + d, 0) / diasValidos.length : 0,
    custoTotal,
    arrecadacao,
    lucrat: arrecadacao > 0 ? ((arrecadacao - custoTotal) / arrecadacao) * 100 : 0,
  };

  const custoMap = new Map<string, { qtd: number; custo: number; arrecadacao: number }>();
  for (const r of rows) {
    const key = (r.produto ?? r.subtipo ?? 'Outro').toUpperCase();
    const e = custoMap.get(key) ?? { qtd: 0, custo: 0, arrecadacao: 0 };
    e.qtd++;
    e.custo += r.custo_real;
    custoMap.set(key, e);
  }

  const arrMap = new Map<string, { qtd: number; custo: number; arrecadacao: number }>();
  for (const r of vendidas) {
    const key = (r.produto ?? r.subtipo ?? 'Outro').toUpperCase();
    const e = arrMap.get(key) ?? { qtd: 0, custo: 0, arrecadacao: 0 };
    e.qtd++;
    e.arrecadacao += r.preco_cobrado ?? 0;
    arrMap.set(key, e);
  }

  const porProdutoCusto: ConversaoJmPorProduto[] = Array.from(custoMap.entries())
    .map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.custo - a.custo);

  const porProdutoArrecadacao: ConversaoJmPorProduto[] = Array.from(arrMap.entries())
    .map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.arrecadacao - a.arrecadacao);

  return { kpi, porProdutoCusto, porProdutoArrecadacao, rows };
}

export function useConversaoJm(from: string | undefined, to: string | undefined) {
  const { data: raw, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['conversao-jm', from, to],
    queryFn: async () => {
      if (!from || !to) throw new Error('Date range required');
      const res = await fetchConversaoJm(from, to);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar conversão JM');
      return res.data;
    },
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo<ConversaoJmData | null>(() => {
    if (!raw) return null;
    return buildData(raw);
  }, [raw]);

  return { data, isLoading, isError, error, refetch };
}
