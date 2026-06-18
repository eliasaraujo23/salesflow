import { useMutation } from '@tanstack/react-query';
import { loginAction, type LoginResponse, type ResponseApi } from '@/lib/actions';

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }): Promise<ResponseApi<LoginResponse>> => {
      return loginAction(credentials.email, credentials.password);
    },
  });
}
