import { useMutation } from '@tanstack/react-query';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

interface UpdateUserInput {
  email: string;
  name: string;
  cargo?: string;
  personKey: string;
  role: string;
  permissions: string[];
}

async function updateUserAction(input: UpdateUserInput): Promise<ResponseApi<null>> {
  const { email, ...body } = input;
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const rawData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { httpStatus: res.status, message: rawData.message || 'Erro ao atualizar usuário.' };
    }

    return { httpStatus: 200, message: rawData.message };
  } catch {
    return { httpStatus: 503, message: 'Erro de conexão. Tente novamente.' };
  }
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: updateUserAction,
  });
}
