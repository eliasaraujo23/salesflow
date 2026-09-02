import { useMutation } from '@tanstack/react-query';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

async function deleteUserAction(email: string): Promise<ResponseApi<null>> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
    const rawData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { httpStatus: res.status, message: rawData.message || 'Erro ao remover usuário.' };
    }

    return { httpStatus: 200, message: rawData.message };
  } catch {
    return { httpStatus: 503, message: 'Erro de conexão. Tente novamente.' };
  }
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: deleteUserAction,
  });
}
