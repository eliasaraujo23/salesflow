import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTaskAction, type UpdateTaskInput, type ResponseApi } from '@/lib/actions';

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTaskInput): Promise<ResponseApi<{ id: string }>> => {
      return updateTaskAction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
