'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { type CarroChefeDef, CC_DEFAULTS } from '@/lib/actions/carros-chefe';

export type { CarroChefeDef };

function up(s: string | null | undefined): string {
  return (s ?? '').toUpperCase().trim();
}

export function buildCheckFn(def: Omit<CarroChefeDef, 'id'>) {
  return (r: { produto?: string | null; subtipo?: string | null; tipo_pedra?: string | null; lapidacao?: string | null }): boolean => {
    if (def.produto    && !up(r.produto).includes(up(def.produto)))   return false;
    if (def.subtipo    &&  up(r.subtipo)    !== up(def.subtipo))      return false;
    if (def.tipo_pedra &&  up(r.tipo_pedra) !== up(def.tipo_pedra))   return false;
    if (def.lapidacao  &&  up(r.lapidacao)  !== up(def.lapidacao))    return false;
    return true;
  };
}

export interface CatDefDynamic {
  label: string;
  grupo: string;
  check: (r: { produto?: string | null; subtipo?: string | null; tipo_pedra?: string | null; lapidacao?: string | null }) => boolean;
}

const carroChefeSchema = z.object({
  id: z.string(),
  label: z.string(),
  produto: z.string(),
  subtipo: z.string(),
  tipo_pedra: z.string(),
  lapidacao: z.string(),
  order: z.number(),
});

async function fetchCarrosChefe(): Promise<CarroChefeDef[]> {
  const res = await fetch('/api/carros-chefe', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(carroChefeSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export function useCarrosChefe() {
  const { data: defs = [], isLoading: loading } = useQuery({
    queryKey: ['carros-chefe'],
    queryFn: fetchCarrosChefe,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const cats: CatDefDynamic[] = useMemo(() => {
    // Fall back to hardcoded defaults while loading or if the table is empty
    const source = !loading && defs.length > 0 ? defs : (loading ? [] : CC_DEFAULTS.map((d, i) => ({ ...d, id: String(i) })));
    return source
      .map(def => ({ label: def.label, grupo: def.label, check: buildCheckFn(def) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [defs, loading]);

  const isCarroChefe = useMemo(() => {
    return (r: { produto?: string | null; subtipo?: string | null; tipo_pedra?: string | null; lapidacao?: string | null }): boolean =>
      cats.some(cat => cat.check(r));
  }, [cats]);

  return { defs, cats, loading, isCarroChefe };
}
