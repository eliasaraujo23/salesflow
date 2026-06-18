'use server';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function deleteTaskAction(id: string | number): Promise<ResponseApi<null>> {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { httpStatus: res.status, message: err.error || 'Erro ao deletar tarefa' };
    }

    return { httpStatus: 200, data: null };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao deletar tarefa' };
  }
}
