'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/lib/auth-fetch';
import { type LojaCode } from '@/lib/controle-config';

export interface EntradaPg {
  id: string;
  data: string;
  valor: number;
  observacao: string;
  in_box_available: boolean;
  tipo_pagamento: string;
  banco: string | null;
  cod_compra: string | null;
}

export function useEntradasPg(loja: LojaCode, year: number, month: number) {
  return useQuery<EntradaPg[]>({
    queryKey: ['controle-entradas', loja, year, month],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/controle/entradas?loja=${loja}&ano=${year}&mes=${month}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<EntradaPg[]>;
    },
    staleTime: 2 * 60 * 1000,
  });
}
