import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPhotoBagsAction,
  createPhotoBagAction,
  updatePhotoBagAction,
  deletePhotoBagAction,
  type PhotoBag,
  type ResponseApi,
} from '@/lib/actions/photo-bags';

export function usePhotoBags() {
  return useQuery({
    queryKey: ['photo-bags'],
    queryFn: async (): Promise<PhotoBag[]> => {
      const result = await fetchPhotoBagsAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message || 'Erro ao carregar saquinhos de fotos');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePhotoBag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PhotoBag>): Promise<ResponseApi<PhotoBag>> => {
      return createPhotoBagAction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-bags'] });
    },
  });
}

export function useUpdatePhotoBag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<PhotoBag> }): Promise<ResponseApi<PhotoBag>> => {
      return updatePhotoBagAction(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-bags'] });
    },
  });
}

export function useDeletePhotoBag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number): Promise<ResponseApi<null>> => {
      return deletePhotoBagAction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-bags'] });
    },
  });
}
