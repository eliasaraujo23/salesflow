'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Leilao {
  id: string;
  numero: string;
  nome: string;
  dataInicio: string; // yyyy-MM-dd
  dataFim: string;    // yyyy-MM-dd
  cor: string;
  observacao?: string;
}

const STORAGE_KEY = 'goldtech_leiloes_v1';

export function useLeiloes() {
  const [leiloes, setLeiloes] = useState<Leilao[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLeiloes(JSON.parse(raw) as Leilao[]);
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((list: Leilao[]) => {
    setLeiloes(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }, []);

  const add = useCallback((l: Omit<Leilao, 'id'>) => {
    save([...(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Leilao[]), { ...l, id: crypto.randomUUID() }]);
  }, [save]);

  const update = useCallback((l: Leilao) => {
    save((JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Leilao[]).map(x => x.id === l.id ? l : x));
  }, [save]);

  const remove = useCallback((id: string) => {
    save((JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Leilao[]).filter(x => x.id !== id));
  }, [save]);

  return { leiloes, add, update, remove };
}
