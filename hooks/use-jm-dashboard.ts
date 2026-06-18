import { useQuery } from '@tanstack/react-query';
import { fetchJmDashboardAction, type JmDashboardFeed } from '@/lib/actions/fetch-jm-dashboard';

export function useJmDashboard() {
  return useQuery({
    queryKey: ['jm-dashboard'],
    queryFn: async (): Promise<JmDashboardFeed> => {
      const result = await fetchJmDashboardAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message || 'Erro ao carregar dashboard JM');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
