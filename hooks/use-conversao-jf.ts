'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchConversaoJf, type ConversaoJfRow } from '@/lib/actions/fetch-conversao-jf';

export interface ConversaoJfKpi {
  qtdFabricada: number;
  qtdVendida: number;
  conversao: number;
  mediaVida: number;
  custoTotal: number;
  arrecadacao: number;
  lucrat: number;
}

export interface ConversaoJfPorProduto {
  name: string;
  qtd: number;
  custo: number;
  arrecadacao: number;
}

export interface ConversaoJfData {
  kpi: ConversaoJfKpi;
  porProdutoCusto: ConversaoJfPorProduto[];
  porProdutoArrecadacao: ConversaoJfPorProduto[];
  rows: ConversaoJfRow[];
}

function buildData(rows: ConversaoJfRow[]): ConversaoJfData {
  const vendidas = rows.filter(r => r.data_venda && r.preco_cobrado);
  const diasValidos = vendidas.filter(r => r.dias_vida != null).map(r => r.dias_vida as number);

  const custoTotal = rows.reduce((s, r) => s + r.custo_real, 0);
  const arrecadacao = vendidas.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0);

  const kpi: ConversaoJfKpi = {
    qtdFabricada: rows.length,
    qtdVendida: vendidas.length,
    conversao: rows.length > 0 ? (vendidas.length / rows.length) * 100 : 0,
    mediaVida: diasValidos.length > 0 ? diasValidos.reduce((s, d) => s + d, 0) / diasValidos.length : 0,
    custoTotal,
    arrecadacao,
    lucrat: arrecadacao > 0 ? ((arrecadacao - custoTotal) / arrecadacao) * 100 : 0,
  };

  // Por produto — custo (todas fabricadas)
  const custoMap = new Map<string, { qtd: number; custo: number; arrecadacao: number }>();
  for (const r of rows) {
    const key = (r.produto ?? r.subtipo ?? 'Outro').toUpperCase();
    const e = custoMap.get(key) ?? { qtd: 0, custo: 0, arrecadacao: 0 };
    e.qtd++;
    e.custo += r.custo_real;
    custoMap.set(key, e);
  }

  // Por produto — arrecadação (só vendidas)
  const arrMap = new Map<string, { qtd: number; custo: number; arrecadacao: number }>();
  for (const r of vendidas) {
    const key = (r.produto ?? r.subtipo ?? 'Outro').toUpperCase();
    const e = arrMap.get(key) ?? { qtd: 0, custo: 0, arrecadacao: 0 };
    e.qtd++;
    e.arrecadacao += r.preco_cobrado ?? 0;
    arrMap.set(key, e);
  }

  const porProdutoCusto: ConversaoJfPorProduto[] = Array.from(custoMap.entries())
    .map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.custo - a.custo);

  const porProdutoArrecadacao: ConversaoJfPorProduto[] = Array.from(arrMap.entries())
    .map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.arrecadacao - a.arrecadacao);

  return { kpi, porProdutoCusto, porProdutoArrecadacao, rows };
}

export function useConversaoJf(from: string | undefined, to: string | undefined) {
  const { data: raw, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['conversao-jf', from, to],
    queryFn: async () => {
      if (!from || !to) throw new Error('Date range required');
      const res = await fetchConversaoJf(from, to);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar conversão JF');
      return res.data;
    },
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo<ConversaoJfData | null>(() => {
    if (!raw) return null;
    return buildData(raw);
  }, [raw]);

  return { data, isLoading, isError, error, refetch };
}
