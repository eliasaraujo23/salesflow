import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTaskAction, type CreateTaskInput, type ResponseApi } from '@/lib/actions';

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput): Promise<ResponseApi<{ id: string }>> => {
      return createTaskAction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
