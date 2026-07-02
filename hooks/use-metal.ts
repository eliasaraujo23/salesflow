'use client';

import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { metalCollection, type LojaCode } from '@/lib/controle-config';
import { type MetalRecord, QUALIDADES } from '@/types/controle';

export type { MetalRecord };

export function useMetal(loja: LojaCode) {
  const [records, setRecords] = useState<MetalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const col = metalCollection(loja);
    const q = query(collection(db, col), orderBy('data', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as MetalRecord));
      setRecords(docs);
      setLoading(false);
    });
    return unsub;
  }, [loja]);

  async function addRecord(data: Omit<MetalRecord, 'id' | 'createdAt'>) {
    const col = metalCollection(loja);
    const totalPeso = QUALIDADES.reduce((sum, q) => sum + (Number(data[q]) || 0), 0);
    const pagoPorGrama = totalPeso > 0 ? (data.valor / totalPeso) : 0;
    await addDoc(collection(db, col), {
      ...data,
      total_peso: totalPeso,
      pago_por_grama: pagoPorGrama,
      createdAt: serverTimestamp(),
    });
  }

  async function updateRecord(id: string, data: Partial<Omit<MetalRecord, 'id' | 'createdAt'>>) {
    const col = metalCollection(loja);
    const payload = { ...data } as Record<string, unknown>;
    if (QUALIDADES.some(q => q in payload)) {
      const currentRecord = records.find(r => r.id === id);
      const merged = { ...currentRecord, ...data };
      const totalPeso = QUALIDADES.reduce((sum, q) => sum + (Number(merged[q]) || 0), 0);
      payload.total_peso = totalPeso;
      payload.pago_por_grama = totalPeso > 0 ? ((merged.valor || 0) / totalPeso) : 0;
    }
    await updateDoc(doc(db, metalCollection(loja), id), payload);
  }

  async function deleteRecord(id: string) {
    await deleteDoc(doc(db, metalCollection(loja), id));
  }

  function generateCodInterno(prefix: string): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const seq = String(records.length + 1).padStart(4, '0');
    return `${prefix}${yy}${mm}${dd}${seq}`;
  }

  function todayTimestamp(): Timestamp {
    return Timestamp.fromDate(new Date());
  }

  return { records, loading, addRecord, updateRecord, deleteRecord, generateCodInterno, todayTimestamp };
}
