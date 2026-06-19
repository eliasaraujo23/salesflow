import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AddMetalInput {
  tipo: 'entrada' | 'cadastro' | 'antigo';
  metal: 'ouro' | 'prata' | 'platina';
  data: string;
  origem: string;
  chegou: number;
  cadastrado: number;
  sobrou: number;
  peso: number;
  obs?: string;
}

export async function addMetalAction(
  input: AddMetalInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = Date.now();
    await addDoc(collection(db, 'metais'), {
      ...input,
      id,
      createdAt: id,
    });
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao adicionar metal';
    return { success: false, error: msg };
  }
}

export async function deleteMetalAction(
  docId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'metais', docId));
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao remover metal';
    return { success: false, error: msg };
  }
}
