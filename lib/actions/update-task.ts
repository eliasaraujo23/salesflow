import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';

const updateTaskSchema = z.object({
  id:          z.string().or(z.number()),
  title:       z.string().optional(),
  description: z.string().optional(),
  person:      z.string().optional(),
  priority:    z.enum(['urgente', 'alta', 'media', 'baixa']).optional(),
  status:      z.enum(['pendente', 'progress', 'blocked', 'done']).optional(),
  due:         z.string().optional(),
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
    const { id, ...fields } = updateTaskSchema.parse(data);

    const payload: Record<string, unknown> = {};
    if (fields.title       !== undefined) payload.title       = fields.title;
    if (fields.description !== undefined) payload.description = fields.description;
    if (fields.person      !== undefined) payload.person      = fields.person;
    if (fields.priority    !== undefined) payload.priority    = fields.priority;
    if (fields.status      !== undefined) payload.status      = fields.status;
    if (fields.due         !== undefined) payload.due         = fields.due;

    if (typeof id === 'string') {
      await updateDoc(doc(db, 'tasks', id), payload);
    } else {
      const q = query(collection(db, 'tasks'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, payload);
      }
    }

    return { httpStatus: 200, data: { id: String(id) } };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar tarefa';
    return { httpStatus: 400, message: msg };
  }
}
