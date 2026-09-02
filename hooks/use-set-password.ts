import { useMutation } from '@tanstack/react-query';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

async function setPasswordAction(input: { token: string; password: string }): Promise<ResponseApi<null>> {
  try {
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const rawData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { httpStatus: res.status, message: rawData.message || 'Erro ao definir senha.' };
    }

    return { httpStatus: 200, message: rawData.message };
  } catch {
    return { httpStatus: 503, message: 'Erro de conexão. Tente novamente.' };
  }
}

export function useSetPassword() {
  return useMutation({
    mutationFn: setPasswordAction,
  });
}
