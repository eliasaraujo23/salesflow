import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function updateTaskStatusAction(
  taskId: string | number,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof taskId === 'string') {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
    } else {
      const q = query(collection(db, 'tasks'), where('id', '==', taskId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { status: newStatus });
      }
    }
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar tarefa';
    return { success: false, error: msg };
  }
}
