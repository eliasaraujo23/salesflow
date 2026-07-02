'use client';

import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { lancamentoCollection, type LojaCode } from '@/lib/controle-config';
import { type LancamentoRecord } from '@/types/controle';

export type { LancamentoRecord };

export function useLancamentos(loja: LojaCode) {
  const [records, setRecords] = useState<LancamentoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const col = lancamentoCollection(loja);
    const q = query(collection(db, col), orderBy('data', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as LancamentoRecord));
      setRecords(docs);
      setLoading(false);
    });
    return unsub;
  }, [loja]);

  async function addRecord(data: Omit<LancamentoRecord, 'id' | 'createdAt'>) {
    const col = lancamentoCollection(loja);
    await addDoc(collection(db, col), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateRecord(id: string, data: Partial<Omit<LancamentoRecord, 'id' | 'createdAt'>>) {
    await updateDoc(doc(db, lancamentoCollection(loja), id), data as Record<string, unknown>);
  }

  async function deleteRecord(id: string) {
    await deleteDoc(doc(db, lancamentoCollection(loja), id));
  }

  return { records, loading, addRecord, updateRecord, deleteRecord };
}
