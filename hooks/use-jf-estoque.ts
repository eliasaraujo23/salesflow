import { useQuery } from '@tanstack/react-query';
import { fetchJfEstoqueAction, type JfEstoqueItem } from '@/lib/actions/fetch-jf-estoque';

export function useJfEstoque() {
  return useQuery({
    queryKey: ['jf-estoque'],
    queryFn: async (): Promise<JfEstoqueItem[]> => {
      const result = await fetchJfEstoqueAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message ?? 'Erro ao carregar estoque JF');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
