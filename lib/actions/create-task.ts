import { z } from 'zod';

const createTaskSchema = z.object({
  title:       z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  person:      z.string().min(1, 'Responsável é obrigatório'),
  priority:    z.enum(['urgente', 'alta', 'media', 'baixa']),
  status:      z.enum(['pendente', 'progress', 'blocked', 'done']),
  due:         z.string().optional(),
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

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { httpStatus: res.status, message: body.message || 'Erro ao criar tarefa' };
    }

    return { httpStatus: 200, data: { id: body.data.id } };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar tarefa';
    return { httpStatus: 400, message: msg };
  }
}
