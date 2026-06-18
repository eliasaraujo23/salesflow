'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const updateTaskSchema = z.object({
  id: z.string().or(z.number()),
  title: z.string().optional(),
  description: z.string().optional(),
  person: z.string().optional(),
  priority: z.enum(['urgente', 'alta', 'media', 'baixa']).optional(),
  status: z.enum(['pendente', 'progress', 'blocked', 'done']).optional(),
  due: z.string().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function updateTaskAction(data: UpdateTaskInput): Promise<ResponseApi<{ id: string }>> {
  try {
    const validated = updateTaskSchema.parse(data);
    const { id, ...payload } = validated;

    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { httpStatus: res.status, message: err.error || 'Erro ao atualizar tarefa' };
    }

    const result = await res.json();
    return { httpStatus: 200, data: result };
  } catch (error: any) {
    return { httpStatus: 400, message: error.message || 'Erro ao atualizar tarefa' };
  }
}
