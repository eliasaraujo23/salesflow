'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMensal, fetchDetalhes, type MensalRow, type DashboardMetalDetalhes } from '@/lib/actions/dashboard-metal';

export function useDashboardMetalMensal(params: { loja?: string; inicio?: string; fim?: string }) {
  const query = useQuery({
    queryKey: ['dashboard-metal-mensal', params.loja, params.inicio, params.fim],
    queryFn: async () => {
      const res = await fetchMensal(params);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar dados');
      return res.data;
    },
  });

  return { rows: (query.data ?? []) as MensalRow[], loading: query.isLoading };
}

const EMPTY_DETALHES: DashboardMetalDetalhes = {
  valorPorLoja: [], feedback: [], motivoNc: [], horario: [],
  avaliadores: [], precoAvaliador: [], avaliadorMensal: [], avaliadorHorario: [],
};

export function useDashboardMetalDetalhes(params: { loja?: string; inicio?: string; fim?: string }) {
  const query = useQuery({
    queryKey: ['dashboard-metal-detalhes', params.loja, params.inicio, params.fim],
    queryFn: async () => {
      const res = await fetchDetalhes(params);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar dados');
      return res.data;
    },
  });

  return { detalhes: query.data ?? EMPTY_DETALHES, loading: query.isLoading };
}
