import { authFetch, API_BASE } from '@/lib/auth-fetch';


export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function logoutAction(): Promise<ResponseApi<null>> {
  try {
    const res = await authFetch(`${API_BASE}/api/logout`, {
      method: 'POST',
    });

    if (!res.ok) {
      return { httpStatus: res.status, message: 'Erro ao fazer logout no servidor' };
    }

    return { httpStatus: 200, data: null };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro de rede' };
  }
}
