'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  person: z.string().min(1, 'Responsável é obrigatório'),
  priority: z.enum(['urgente', 'alta', 'media', 'baixa']),
  status: z.enum(['pendente', 'progress', 'blocked', 'done']),
  due: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function createTaskAction(data: CreateTaskInput): Promise<ResponseApi<{ id: string }>> {
  try {
    const validated = createTaskSchema.parse(data);

    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { httpStatus: res.status, message: err.error || 'Erro ao criar tarefa' };
    }

    const result = await res.json();
    return { httpStatus: 200, data: result };
  } catch (error: any) {
    return { httpStatus: 400, message: error.message || 'Erro ao criar tarefa' };
  }
}
