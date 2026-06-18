import { useQuery } from '@tanstack/react-query';
import { fetchMaintenanceAction, type MaintenanceItem } from '@/lib/actions/fetch-maintenance';

export function useMaintenance() {
  return useQuery({
    queryKey: ['maintenance'],
    queryFn: async (): Promise<MaintenanceItem[]> => {
      const result = await fetchMaintenanceAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message || 'Erro ao carregar manutenções');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
