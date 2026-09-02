export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function deleteTaskAction(id: string | number): Promise<ResponseApi<null>> {
  try {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { httpStatus: res.status, message: body.message || 'Erro ao deletar tarefa' };
    }
    return { httpStatus: 200, data: null };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao deletar tarefa';
    return { httpStatus: 500, message: msg };
  }
}
