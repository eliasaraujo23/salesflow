'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, query, orderBy, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const QUERY_KEY  = ['leilao-regras-destino'];
const COLLECTION = 'leilao_regras_destino';

const DESTINOS_DEFAULT = [
  'Achados Perdidos', 'Agosto', 'Augusto', 'Brilho Vintage',
  'Cadastro Pendente', 'Eduardo', 'Emerson Tijuca', 'Etiqueta Única',
  'Gringa', 'Helton', 'Lohana Coelho', 'Louca por Joias',
  'Lucimary', 'Pamela Ferrari', 'Retorno Scrap', 'Thais',
];

export interface RegraDestino {
  id:      string;
  destino: string;
  ativo:   boolean;
}

async function fetchRegras(): Promise<RegraDestino[]> {
  const q    = query(collection(db, COLLECTION), orderBy('destino', 'asc'));
  const snap = await getDocs(q);

  if (snap.empty) {
    const batch = writeBatch(db);
    for (const destino of DESTINOS_DEFAULT) {
      batch.set(doc(collection(db, COLLECTION)), { destino, ativo: true });
    }
    await batch.commit();
    const snap2 = await getDocs(query(collection(db, COLLECTION), orderBy('destino', 'asc')));
    return snap2.docs.map(d => ({ id: d.id, destino: d.data().destino as string, ativo: d.data().ativo as boolean }));
  }

  return snap.docs.map(d => ({ id: d.id, destino: d.data().destino as string, ativo: d.data().ativo as boolean }));
}

export function useLeilaoRegras() {
  const qc = useQueryClient();
  const { data: regras = [], isLoading } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchRegras });

  const activeDestinos = regras.map(r => r.destino);

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      updateDoc(doc(db, COLLECTION, id), { ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError:   (err: Error) => toast.error(`Erro ao atualizar: ${err.message}`),
  });

  const addMutation = useMutation({
    mutationFn: (destino: string) =>
      addDoc(collection(db, COLLECTION), { destino, ativo: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError:   (err: Error) => toast.error(`Erro ao adicionar: ${err.message}`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, COLLECTION, id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError:   (err: Error) => toast.error(`Erro ao remover: ${err.message}`),
  });

  const toggle = useCallback((id: string, ativo: boolean) =>
    toggleMutation.mutate({ id, ativo }), [toggleMutation]);

  const add = useCallback((destino: string) =>
    addMutation.mutate(destino), [addMutation]);

  const remove = useCallback((id: string) =>
    removeMutation.mutate(id), [removeMutation]);

  return { regras, activeDestinos, isLoading, toggle, add, remove };
}
