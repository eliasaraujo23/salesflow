'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPartnerSalesAction,
  fetchPartnerConsignmentsAction,
  fetchJmStockAction,
  type PartnerSales,
  type PartnerConsignment,
  type JmStockItem,
} from '@/lib/actions/fetch-partners';
import { useCarrosChefe, type CatDefDynamic } from '@/hooks/use-carros-chefe';

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

function normalizeJmItem(j: JmStockItem): PartnerConsignment {
  return {
    referencia: j.referencia,
    produto: j.produto,
    subtipo: j.subtipo,
    tipo_pedra: j.tipo_pedra,
    lapidacao: j.lapidacao,
    destino: j.destino,
    tipo: 'JM',
    data_saida: null,
    dias_campo: j.dias,
    custo_real: j.custo_real,
    preco_minimo: null,
    preco_loja: j.preco_cobrado ?? 0,
  };
}

export type { CatDefDynamic };

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
  grupo: string;
  counts: number[];
  total: number;
  variants: MatrixVariant[];
  children?: MatrixRow[];
}

export interface GapStockItem {
  referencia: string;
  produto: string | null | undefined;
  subtipo: string | null | undefined;
  tipo_pedra: string | null | undefined;
  lapidacao: string | null | undefined;
  dias: number;
}

export interface GapRedist {
  partner: string;
  count: number;
  oldest: PartnerConsignment;
}

export interface GapInfo {
  catLabel: string;
  partnersMissing: string[];
  stockItems: GapStockItem[];
  redistFrom: GapRedist[];
}

export function usePartnersPage() {
  const [activePartner, setActivePartner] = useState<string | null>(null);
  const { cats } = useCarrosChefe();

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

  const jmStockQuery = useQuery({
    queryKey: ['jm-stock-partners'],
    queryFn: async (): Promise<JmStockItem[]> => {
      const result = await fetchJmStockAction();
      return result.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // JM items currently at partners (destino ≠ ESTOQUE, has category data)
  const jmAtPartners = useMemo(() => {
    return (jmStockQuery.data ?? [])
      .filter(j => {
        const d = up(j.destino);
        return d !== 'ESTOQUE' && d !== '' && j.destino != null && !EXCLUDED.has(d);
      })
      .filter(j => !!(j.produto && j.subtipo))
      .map(normalizeJmItem);
  }, [jmStockQuery.data]);

  // JM items in stock available to send (destino === ESTOQUE, has category data)
  const jmInStock = useMemo(() => {
    return (jmStockQuery.data ?? []).filter(j => {
      const d = up(j.destino);
      return (d === 'ESTOQUE' || d === '' || j.destino == null) && !!(j.produto && j.subtipo);
    });
  }, [jmStockQuery.data]);

  // Merged: comodato (JF/JMF) + JM at partners
  const data = useMemo(() => {
    const comodato = (consignmentQuery.data ?? []).filter(r => !EXCLUDED.has(up(r.destino)));
    return [...comodato, ...jmAtPartners];
  }, [consignmentQuery.data, jmAtPartners]);

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
    // Build flat rows
    const flat: MatrixRow[] = cats.map((cat, catIdx) => {
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
      return { catIdx, label: cat.label, grupo: cat.grupo, counts, total: pieces.length, variants };
    });

    // Group rows that share the same `grupo` (produto) — preserve first-occurrence order
    const orderMap = new Map<string, number>();
    const buckets = new Map<string, MatrixRow[]>();
    flat.forEach(row => {
      if (!buckets.has(row.grupo)) {
        orderMap.set(row.grupo, orderMap.size);
        buckets.set(row.grupo, []);
      }
      buckets.get(row.grupo)!.push(row);
    });

    const grouped: MatrixRow[] = [];
    [...buckets.entries()]
      .sort((a, b) => (orderMap.get(a[0]) ?? 0) - (orderMap.get(b[0]) ?? 0))
      .forEach(([grupo, rows]) => {
        if (rows.length === 1) {
          grouped.push(rows[0]);
        } else {
          const parentCounts = rows[0].counts.map((_, pi) =>
            rows.reduce((s, r) => s + r.counts[pi], 0),
          );
          const parentTotal = rows.reduce((s, r) => s + r.total, 0);
          grouped.push({
            catIdx: rows[0].catIdx,
            label: rows[0].label,
            grupo,
            counts: parentCounts,
            total: parentTotal,
            variants: [],
            children: rows,
          });
        }
      });

    return grouped;
  }, [data, partnerList, cats]);

  const gaps = useMemo((): GapInfo[] => {
    return cats.map(cat => {
      const partnersMissing = partnerList.filter(p =>
        !data.some(r => r.destino === p && cat.check(r))
      );

      const stockItems: GapStockItem[] = jmInStock
        .filter(j => cat.check(normalizeJmItem(j)))
        .map(j => ({
          referencia: j.referencia,
          produto: j.produto,
          subtipo: j.subtipo,
          tipo_pedra: j.tipo_pedra,
          lapidacao: j.lapidacao,
          dias: j.dias,
        }));

      const redistFrom: GapRedist[] = partnerList
        .map(p => {
          const pieces = data.filter(r => r.destino === p && cat.check(r));
          if (pieces.length < 2) return null;
          const oldest = pieces.reduce((a, b) => (a.dias_campo > b.dias_campo ? a : b));
          return { partner: p, count: pieces.length, oldest };
        })
        .filter((x): x is GapRedist => x !== null)
        .sort((a, b) => b.oldest.dias_campo - a.oldest.dias_campo);

      return { catLabel: cat.label, partnersMissing, stockItems, redistFrom };
    }).filter(g => g.partnersMissing.length > 0);
  }, [data, partnerList, jmInStock, cats]);

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
    void jmStockQuery.refetch();
  }

  return {
    isLoading: consignmentQuery.isLoading,
    isError: consignmentQuery.isError,
    isFetching: consignmentQuery.isFetching || salesQuery.isFetching || jmStockQuery.isFetching,
    cats,
    partnerList,
    kpis,
    matrix,
    gaps,
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
