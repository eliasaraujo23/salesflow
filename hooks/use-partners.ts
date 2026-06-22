'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPartnerSalesAction,
  fetchPartnerConsignmentsAction,
  type PartnerSales,
  type PartnerConsignment,
} from '@/lib/actions/fetch-partners';

const EXCLUDED = new Set([
  'LUCIMARY', 'HELTON', 'EDUARDO', 'THAÍS', 'THAIS',
  'ALINI DUARTE', 'ANDRÉ FAUSTINO', 'IVAIR ONGARATTO',
]);

const NOBLE_STONES = new Set([
  'DIAMANTE', 'ESMERALDA', 'ESMERALDA COLOMBIANA',
  'TURMALINA PARAÍBA', 'TURMALINA PARAIBA',
]);

function up(s: string | null | undefined): string {
  return (s ?? '').toUpperCase();
}

export interface CatDef {
  label: string;
  check: (r: PartnerConsignment) => boolean;
}

export const CC_CATS: CatDef[] = [
  { label: 'Anel Solitário',      check: r => up(r.subtipo) === 'SOLITÁRIO'    && up(r.produto).includes('ANEL') },
  { label: 'Brinco Solitário',    check: r => up(r.subtipo) === 'SOLITÁRIO'    && up(r.produto).includes('BRINCO') },
  { label: 'Ponto de Luz',        check: r => up(r.subtipo) === 'PONTO DE LUZ' || up(r.produto).includes('PONTO DE LUZ') },
  { label: 'Meia Aliança',        check: r => up(r.subtipo) === 'MEIA ALIANÇA' },
  { label: 'Colar Riviera',       check: r => up(r.subtipo) === 'RIVIERA'      && up(r.produto).includes('COLAR') },
  { label: 'Pulseira Riviera',    check: r => up(r.subtipo) === 'RIVIERA'      && up(r.produto).includes('PULSEIRA') },
  { label: 'Aliança Riviera',     check: r => up(r.produto).includes('ALIANÇA RIVIERA') },
  { label: 'Anel Maracanã',       check: r => up(r.subtipo) === 'MARACANÃ'     && up(r.produto).includes('ANEL') },
  { label: 'Colar Maracanã',      check: r => up(r.subtipo) === 'MARACANÃ'     && up(r.produto).includes('COLAR') },
  { label: 'Brinco Maracanã',     check: r => up(r.subtipo) === 'MARACANÃ'     && up(r.produto).includes('BRINCO') },
  { label: 'Pingente P/ Riviera', check: r => up(r.subtipo) === 'PARA RIVIERA' && up(r.produto).includes('PINGENTE') },
];

export interface MatrixVariant {
  sub: string;
  pedra: string;
  lap: string;
  counts: number[];
  total: number;
}

export interface MatrixRow {
  catIdx: number;
  label: string;
  counts: number[];
  total: number;
  variants: MatrixVariant[];
}

export function usePartnersPage() {
  const [activePartner, setActivePartner] = useState<string | null>(null);

  const consignmentQuery = useQuery({
    queryKey: ['partner-consignments'],
    queryFn: async (): Promise<PartnerConsignment[]> => {
      const result = await fetchPartnerConsignmentsAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message ?? 'Erro ao carregar comodato');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const salesQuery = useQuery({
    queryKey: ['partner-sales'],
    queryFn: async (): Promise<PartnerSales[]> => {
      const result = await fetchPartnerSalesAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message ?? 'Erro ao carregar vendas');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const data = useMemo(() => {
    const raw = consignmentQuery.data ?? [];
    return raw.filter(r => !EXCLUDED.has(up(r.destino)));
  }, [consignmentQuery.data]);

  const partnerList = useMemo(
    () => [...new Set(data.map(r => r.destino).filter((d): d is string => !!d))].sort(),
    [data],
  );

  const kpis = useMemo(() => {
    const partners = new Set(data.map(r => r.destino).filter(Boolean));
    const vencidas = data.filter(r => r.dias_campo > 90).length;
    const valor = data.reduce((s, r) => s + r.preco_loja, 0);
    return { partners: partners.size, pecasEmCampo: data.length, vencidas, valorEmCampo: valor };
  }, [data]);

  const matrix = useMemo((): MatrixRow[] => {
    return CC_CATS.map((cat, catIdx) => {
      const pieces = data.filter(cat.check);
      const counts = partnerList.map(p => pieces.filter(r => r.destino === p).length);

      const varMap = new Map<string, MatrixVariant>();
      pieces
        .filter(r => NOBLE_STONES.has(up(r.tipo_pedra)))
        .forEach(r => {
          const key = `${r.subtipo ?? '—'}||${r.tipo_pedra ?? '—'}||${r.lapidacao ?? '—'}`;
          if (!varMap.has(key)) {
            varMap.set(key, {
              sub: r.subtipo ?? '—',
              pedra: r.tipo_pedra ?? '—',
              lap: r.lapidacao ?? '—',
              counts: partnerList.map(() => 0),
              total: 0,
            });
          }
          const v = varMap.get(key)!;
          const pi = partnerList.indexOf(r.destino ?? '');
          if (pi >= 0) v.counts[pi]++;
          v.total++;
        });

      const variants = [...varMap.values()].sort((a, b) => b.total - a.total);
      return { catIdx, label: cat.label, counts, total: pieces.length, variants };
    });
  }, [data, partnerList]);

  const partnerData = useMemo(
    () => (activePartner ? data.filter(r => r.destino === activePartner) : []),
    [data, activePartner],
  );

  const partnerSales = useMemo(
    () => (activePartner ? (salesQuery.data ?? []).filter(r => r.destino === activePartner) : []),
    [salesQuery.data, activePartner],
  );

  function refresh() {
    void consignmentQuery.refetch();
    void salesQuery.refetch();
  }

  return {
    isLoading: consignmentQuery.isLoading,
    isError: consignmentQuery.isError,
    isFetching: consignmentQuery.isFetching || salesQuery.isFetching,
    partnerList,
    kpis,
    matrix,
    activePartner,
    setActivePartner,
    partnerData,
    partnerSales,
    refresh,
  };
}

// Kept for backward compatibility
export function usePartnerSales() {
  return useQuery({
    queryKey: ['partner-sales'],
    queryFn: async (): Promise<PartnerSales[]> => {
      const result = await fetchPartnerSalesAction();
      if (result.httpStatus !== 200 || !result.data) throw new Error(result.message ?? 'Erro');
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePartnerConsignments() {
  return useQuery({
    queryKey: ['partner-consignments'],
    queryFn: async (): Promise<PartnerConsignment[]> => {
      const result = await fetchPartnerConsignmentsAction();
      if (result.httpStatus !== 200 || !result.data) throw new Error(result.message ?? 'Erro');
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
