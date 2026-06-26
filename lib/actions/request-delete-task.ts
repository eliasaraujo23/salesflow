import { doc, setDoc, deleteDoc, getDocs, getDoc, query, collection, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export async function requestDeleteTaskAction(
  taskId: string | number,
  taskTitle: string,
  requesterKey: string,
  requesterName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(doc(db, 'task_delete_requests', `dr_${taskId}`), {
      taskId,
      title: taskTitle,
      requestedBy: requesterKey,
      requestedByName: requesterName,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    });
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao enviar solicitação';
    return { success: false, error: msg };
  }
}

export async function approveDeleteRequestAction(
  docId: string,
  taskId: string | number,
): Promise<{ success: boolean; error?: string }> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return { success: false, error: 'Não autenticado.' };

  try {
    const profileSnap = await getDoc(doc(db, 'usuarios', firebaseUser.email!));
    if (!profileSnap.exists() || profileSnap.data().role !== 'admin') {
      return { success: false, error: 'Permissão negada: apenas administradores podem aprovar exclusões.' };
    }

    if (typeof taskId === 'string') {
      await deleteDoc(doc(db, 'tasks', taskId));
    } else {
      const snap = await getDocs(query(collection(db, 'tasks'), where('id', '==', taskId)));
      if (!snap.empty) await deleteDoc(snap.docs[0].ref);
    }
    await deleteDoc(doc(db, 'task_delete_requests', docId));
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao aprovar exclusão';
    return { success: false, error: msg };
  }
}

export async function rejectDeleteRequestAction(
  docId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'task_delete_requests', docId));
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao rejeitar solicitação';
    return { success: false, error: msg };
  }
}
