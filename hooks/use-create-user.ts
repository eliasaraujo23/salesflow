import { useMutation } from '@tanstack/react-query';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

interface CreateUserInput {
  email: string;
  name: string;
  personKey: string;
  cargo?: string;
  role: string;
  permissions: string[];
  password: string;
}

async function createUserAction(input: CreateUserInput): Promise<ResponseApi<{ email: string }>> {
  try {
    const res = await fetch('/api/auth/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const rawData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { httpStatus: res.status, message: rawData.message || 'Erro ao criar usuário.' };
    }

    return { httpStatus: 200, data: rawData.data };
  } catch {
    return { httpStatus: 503, message: 'Erro de conexão. Tente novamente.' };
  }
}

export function useCreateUser() {
  return useMutation({
    mutationFn: createUserAction,
  });
}
