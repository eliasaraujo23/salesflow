'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Leilao } from '@/lib/hooks/use-leiloes';

const QUERY_KEY  = ['leilao-bases-ativas'];
const COLLECTION = 'leilao_bases_ativas';

export interface UploadedFileStored {
  id:              string;   // Firestore document ID
  filename:        string;
  codigoPlatforma: string | null;
  leilao:          Leilao | null;
  count:           number;
  vendidos:        string[];
}

interface FirestoreDoc {
  id:               string;
  codigo_plataforma: string | null;
  filename:          string;
  count_pecas:       number;
  refs:              string[];
  refs_vendidos:     string[];
  excluded:          boolean;
}

async function fetchBases(): Promise<FirestoreDoc[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id:               d.id,
    codigo_plataforma: d.data().codigo_plataforma ?? null,
    filename:          d.data().filename,
    count_pecas:       d.data().count_pecas ?? 0,
    refs:              d.data().refs ?? [],
    refs_vendidos:     d.data().refs_vendidos ?? [],
    excluded:          d.data().excluded ?? false,
  }));
}

export function useLeilaoBasesStorage(leiloes: Leilao[]) {
  const qc = useQueryClient();
  const { data: dbRows = [] } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchBases });

  const uploadedFiles: UploadedFileStored[] = dbRows.map(r => ({
    id:              r.id,
    filename:        r.filename,
    codigoPlatforma: r.codigo_plataforma,
    count:           r.count_pecas,
    vendidos:        r.refs_vendidos,
    leilao:          r.codigo_plataforma
      ? leiloes.find(l => l.codigoPlatforma === r.codigo_plataforma) ?? null
      : null,
  }));

  const refsPerFile   = new Map<string, string[]>(dbRows.map(r => [r.filename, r.refs]));
  const excludedFiles = new Set<string>(dbRows.filter(r => r.excluded).map(r => r.filename));

  const addMutation = useMutation({
    mutationFn: async (payload: {
      codigoPlatforma: string | null;
      filename:        string;
      count:           number;
      refs:            string[];
      refsVendidos:    string[];
    }) => {
      await addDoc(collection(db, COLLECTION), {
        codigo_plataforma: payload.codigoPlatforma,
        filename:          payload.filename,
        count_pecas:       payload.count,
        refs:              payload.refs,
        refs_vendidos:     payload.refsVendidos,
        excluded:          false,
        createdAt:         serverTimestamp(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError:   (err: Error) => toast.error(`Erro ao salvar base: ${err.message}`),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, COLLECTION, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, excluded }: { id: string; excluded: boolean }) => {
      await updateDoc(doc(db, COLLECTION, id), { excluded });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const add = useCallback((
    file: { filename: string; codigoPlatforma: string | null; count: number; leilao: Leilao | null; vendidos?: string[] },
    refs: string[],
  ) => {
    addMutation.mutate({
      codigoPlatforma: file.codigoPlatforma,
      filename:        file.filename,
      count:           file.count,
      refs,
      refsVendidos:    file.vendidos ?? [],
    });
  }, [addMutation]);

  const remove = useCallback((filename: string) => {
    const row = dbRows.find(r => r.filename === filename);
    if (row) removeMutation.mutate(row.id);
  }, [dbRows, removeMutation]);

  const toggleExclude = useCallback((filename: string) => {
    const row = dbRows.find(r => r.filename === filename);
    if (row) toggleMutation.mutate({ id: row.id, excluded: !row.excluded });
  }, [dbRows, toggleMutation]);

  return { uploadedFiles, refsPerFile, excludedFiles, add, remove, toggleExclude };
}
