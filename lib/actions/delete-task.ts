import { doc, deleteDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function deleteTaskAction(id: string | number): Promise<ResponseApi<null>> {
  try {
    if (typeof id === 'string') {
      await deleteDoc(doc(db, 'tasks', id));
    } else {
      const q = query(collection(db, 'tasks'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(snap.docs[0].ref);
      }
    }
    return { httpStatus: 200, data: null };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao deletar tarefa';
    return { httpStatus: 500, message: msg };
  }
}
