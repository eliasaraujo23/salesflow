import { useQuery } from '@tanstack/react-query';
import { fetchPartnerSalesAction, fetchPartnerConsignmentsAction, type PartnerSales, type PartnerConsignment } from '@/lib/actions/fetch-partners';

export function usePartnerSales() {
  return useQuery({
    queryKey: ['partner-sales'],
    queryFn: async (): Promise<PartnerSales[]> => {
      const result = await fetchPartnerSalesAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message || 'Erro ao carregar vendas de parceiros');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePartnerConsignments() {
  return useQuery({
    queryKey: ['partner-consignments'],
    queryFn: async (): Promise<PartnerConsignment[]> => {
      const result = await fetchPartnerConsignmentsAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message || 'Erro ao carregar dados de comodato');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
