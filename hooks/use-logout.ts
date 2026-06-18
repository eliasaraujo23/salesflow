import { useMutation } from '@tanstack/react-query';
import { logoutAction, type ResponseApi } from '@/lib/actions';

export function useLogout() {
  return useMutation({
    mutationFn: async (): Promise<ResponseApi<null>> => {
      return logoutAction();
    },
  });
}
