import { useQuery } from '@tanstack/react-query';
import {
  fetchEvolucaoParceiroAction,
  type EvolucaoParceiroItem,
  type EvolucaoParceiroParams,
} from '@/lib/actions/fetch-evolucao-parceiros';

export function useEvolucaoParceiros(params: EvolucaoParceiroParams = {}) {
  const { meses = 6, tipo = 'todos', dataInicio, dataFim } = params;
  return useQuery({
    queryKey: ['evolucao-parceiros', dataInicio ?? meses, dataFim ?? '', tipo],
    queryFn: async (): Promise<EvolucaoParceiroItem[]> => {
      const result = await fetchEvolucaoParceiroAction(params);
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message ?? 'Erro ao carregar evolução de parceiros');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}
