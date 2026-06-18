import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTaskAction, type ResponseApi } from '@/lib/actions';

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number): Promise<ResponseApi<null>> => {
      return deleteTaskAction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
