import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AddMetalInput {
  metal: 'ouro' | 'prata' | 'platina';
  tipo: 'entrada' | 'cadastro' | 'antigo';
  peso: number;
  detalhe?: string;
  responsavel: string;
}

export async function addMetalAction(
  input: AddMetalInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'metais'), {
      ...input,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao adicionar metal';
    return { success: false, error: msg };
  }
}

export async function deleteMetalAction(
  docId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'metais', docId));
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao remover metal';
    return { success: false, error: msg };
  }
}
