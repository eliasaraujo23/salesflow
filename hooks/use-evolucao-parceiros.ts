import { useQuery } from '@tanstack/react-query';
import {
  fetchEvolucaoParceiroAction,
  type EvolucaoParceiroItem,
} from '@/lib/actions/fetch-evolucao-parceiros';

export function useEvolucaoParceiros(meses = 6) {
  return useQuery({
    queryKey: ['evolucao-parceiros', meses],
    queryFn: async (): Promise<EvolucaoParceiroItem[]> => {
      const result = await fetchEvolucaoParceiroAction(meses);
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message ?? 'Erro ao carregar evolução de parceiros');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}
