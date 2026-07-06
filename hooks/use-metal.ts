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
    const q = query(collection(db, col), orderBy('datetime', 'desc'));
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
    const horaStr = data.hora ?? '00:00';
    const datePart = data.data.toDate().toISOString().slice(0, 10);
    const datetime = Timestamp.fromDate(new Date(`${datePart}T${horaStr}:00`));
    await addDoc(collection(db, col), {
      ...data,
      datetime,
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
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    // Deriva o próximo número a partir do maior seq encontrado nos registros existentes
    const pattern = new RegExp(`^${prefix}(\\d+)-`);
    let maxSeq = 0;
    for (const r of records) {
      const m = r.cod_interno.match(pattern);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxSeq) maxSeq = n;
      }
    }
    return `${prefix}${maxSeq + 1}-${mm}${yyyy}`;
  }

  function todayTimestamp(): Timestamp {
    return Timestamp.fromDate(new Date());
  }

  return { records, loading, addRecord, updateRecord, deleteRecord, generateCodInterno, todayTimestamp };
}
