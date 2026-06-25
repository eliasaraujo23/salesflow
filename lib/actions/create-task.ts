import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

    const docRef = await addDoc(collection(db, 'tasks'), {
      title:       validated.title,
      description: validated.description ?? '',
      person:      validated.person,
      priority:    validated.priority,
      status:      validated.status,
      due:         validated.due ?? 'Sem prazo',
      late:        0,
      createdAt:   serverTimestamp(),
    });

    return { httpStatus: 200, data: { id: docRef.id } };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar tarefa';
    return { httpStatus: 400, message: msg };
  }
}
