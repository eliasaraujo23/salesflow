import { useQuery } from '@tanstack/react-query';
import { fetchJfDashboardAction, type JfDashboardFeed, type ResponseApi } from '@/lib/actions/fetch-jf-dashboard';

export function useJfDashboard() {
  return useQuery({
    queryKey: ['jf-dashboard'],
    queryFn: async (): Promise<JfDashboardFeed> => {
      const result = await fetchJfDashboardAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message || 'Erro ao carregar dashboard JF');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
