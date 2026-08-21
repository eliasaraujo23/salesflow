import {
  collection, addDoc, updateDoc, doc, serverTimestamp,
  query, where, orderBy, limit, getDocs, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';

const COL = 'agente_conversas';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string(),
});

export type StoredChatMessage = z.infer<typeof chatMessageSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export interface AgenteConversa {
  id: string;
  userEmail: string;
  userName: string;
  titulo: string;
  mensagens: StoredChatMessage[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Cria uma nova conversa com a primeira pergunta como título. */
export async function criarConversaAction(
  userEmail: string,
  userName: string,
  primeiraPergunta: string,
): Promise<ResponseApi<{ id: string }>> {
  try {
    const docRef = await addDoc(collection(db, COL), {
      userEmail,
      userName,
      titulo: primeiraPergunta.slice(0, 80),
      mensagens: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { httpStatus: 200, data: { id: docRef.id } };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar conversa';
    return { httpStatus: 400, message: msg };
  }
}

/** Substitui a lista de mensagens de uma conversa (append feito no client antes de chamar). */
export async function salvarMensagensAction(
  conversaId: string,
  mensagens: StoredChatMessage[],
): Promise<ResponseApi<null>> {
  try {
    const validated = z.array(chatMessageSchema).parse(mensagens);
    await updateDoc(doc(db, COL, conversaId), {
      mensagens: validated,
      updatedAt: serverTimestamp(),
    });
    return { httpStatus: 200 };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao salvar mensagens';
    return { httpStatus: 400, message: msg };
  }
}

/** Lista as conversas mais recentes de um usuário. */
export async function listarConversasAction(
  userEmail: string,
  max = 30,
): Promise<ResponseApi<AgenteConversa[]>> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COL),
        where('userEmail', '==', userEmail),
        orderBy('updatedAt', 'desc'),
        limit(max),
      ),
    );
    const conversas: AgenteConversa[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userEmail: data.userEmail,
        userName: data.userName,
        titulo: data.titulo,
        mensagens: data.mensagens ?? [],
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      };
    });
    return { httpStatus: 200, data: conversas };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao listar conversas';
    return { httpStatus: 400, message: msg };
  }
}

export async function excluirConversaAction(conversaId: string): Promise<ResponseApi<null>> {
  try {
    await deleteDoc(doc(db, COL, conversaId));
    return { httpStatus: 200 };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao excluir conversa';
    return { httpStatus: 400, message: msg };
  }
}
