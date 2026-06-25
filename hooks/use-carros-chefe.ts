'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

export function useCarrosChefe() {
  const [defs, setDefs] = useState<CarroChefeDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'carros_chefe'), orderBy('order'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CarroChefeDef));
      setDefs(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  const cats: CatDefDynamic[] = useMemo(() => {
    // Fall back to hardcoded defaults while Firestore loads or if collection is empty
    const source = !loading && defs.length > 0 ? defs : (loading ? [] : CC_DEFAULTS.map((d, i) => ({ ...d, id: String(i) })));
    return source.map(def => ({ label: def.label, grupo: def.label, check: buildCheckFn(def) }));
  }, [defs, loading]);

  const isCarroChefe = useMemo(() => {
    return (r: { produto?: string | null; subtipo?: string | null; tipo_pedra?: string | null; lapidacao?: string | null }): boolean =>
      cats.some(cat => cat.check(r));
  }, [cats]);

  return { defs, cats, loading, isCarroChefe };
}
