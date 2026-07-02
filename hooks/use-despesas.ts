'use client';

import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { despesaCollection, type LojaCode } from '@/lib/controle-config';
import { type DespesaRecord } from '@/types/controle';

export type { DespesaRecord };

export function useDespesas(loja: LojaCode) {
  const [records, setRecords] = useState<DespesaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const col = despesaCollection(loja);
    const q = query(collection(db, col), orderBy('data', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as DespesaRecord));
      setRecords(docs);
      setLoading(false);
    });
    return unsub;
  }, [loja]);

  async function addRecord(data: Omit<DespesaRecord, 'id' | 'createdAt'>) {
    const col = despesaCollection(loja);
    await addDoc(collection(db, col), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateRecord(id: string, data: Partial<Omit<DespesaRecord, 'id' | 'createdAt'>>) {
    await updateDoc(doc(db, despesaCollection(loja), id), data as Record<string, unknown>);
  }

  async function deleteRecord(id: string) {
    await deleteDoc(doc(db, despesaCollection(loja), id));
  }

  return { records, loading, addRecord, updateRecord, deleteRecord };
}
