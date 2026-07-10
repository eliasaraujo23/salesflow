'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCadastroJoiasAction, type CadastroJoia } from '@/lib/actions/fetch-cadastro-joias';
import { useMemo } from 'react';

export interface CadastroKpi {
  qtd: number;
  custo: number;
  peso: number;
}

export interface CadastroPorTipo {
  tipo: string;
  qtd: number;
  custo: number;
  peso: number;
  porProduto: { name: string; qtd: number; custo: number; peso: number }[];
}

export interface CadastroJoiasData {
  total: CadastroKpi;
  porTipo: CadastroPorTipo[];
  rows: CadastroJoia[];
}

function tipoLabel(raw: string | null | undefined): string {
  const t = (raw ?? '').toUpperCase();
  if (t === 'JF' || t === 'JMF') return 'JF';
  if (t === 'JMCP' || t === 'JMSP') return 'JM';
  if (t === 'JC') return 'JC';
  return 'JR';
}

function buildData(rows: CadastroJoia[]): CadastroJoiasData {
  const tipoMap = new Map<string, { qtd: number; custo: number; peso: number; prodMap: Map<string, { qtd: number; custo: number; peso: number }> }>();

  for (const r of rows) {
    const tipo = tipoLabel(r.tipo);
    const prod = r.produto ?? r.subtipo ?? 'Outro';

    if (!tipoMap.has(tipo)) tipoMap.set(tipo, { qtd: 0, custo: 0, peso: 0, prodMap: new Map() });
    const te = tipoMap.get(tipo)!;
    te.qtd++;
    te.custo += r.custo_real;
    te.peso += r.peso;

    if (!te.prodMap.has(prod)) te.prodMap.set(prod, { qtd: 0, custo: 0, peso: 0 });
    const pe = te.prodMap.get(prod)!;
    pe.qtd++;
    pe.custo += r.custo_real;
    pe.peso += r.peso;
  }

  const TIPO_ORDER = ['JF', 'JM', 'JR', 'JC'];
  const porTipo: CadastroPorTipo[] = TIPO_ORDER
    .filter(t => tipoMap.has(t))
    .map(tipo => {
      const e = tipoMap.get(tipo)!;
      return {
        tipo,
        qtd: e.qtd,
        custo: e.custo,
        peso: e.peso,
        porProduto: Array.from(e.prodMap.entries())
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.qtd - a.qtd),
      };
    });

  return {
    total: {
      qtd: rows.length,
      custo: rows.reduce((s, r) => s + r.custo_real, 0),
      peso: rows.reduce((s, r) => s + r.peso, 0),
    },
    porTipo,
    rows: rows.map(r => ({ ...r, tipo: tipoLabel(r.tipo) })),
  };
}

export function useCadastroJoias(from: string | undefined, to: string | undefined) {
  const { data: raw, isLoading, isError, error } = useQuery({
    queryKey: ['cadastro-joias', from, to],
    queryFn: () => fetchCadastroJoiasAction(from!, to!),
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo<CadastroJoiasData | null>(() => {
    if (!raw?.data) return null;
    return buildData(raw.data);
  }, [raw]);

  return { data, isLoading, isError, error };
}
