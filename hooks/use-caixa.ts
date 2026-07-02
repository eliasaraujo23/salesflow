'use client';
import { useEffect, useState, useCallback } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type CaixaDoc, type CaixaEntry } from '@/types/controle';
import { type LojaCode } from '@/lib/controle-config';

export interface CaixaRecord extends CaixaDoc { id: string; }

export function useCaixa(lojaCode: LojaCode) {
  const [records, setRecords] = useState<CaixaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, `caixa_${lojaCode}`), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaixaRecord)));
      setLoading(false);
    });
    return unsub;
  }, [lojaCode]);

  const addRecord = useCallback(async (bruto: CaixaEntry[], trocados: CaixaEntry[]) => {
    await addDoc(collection(db, `caixa_${lojaCode}`), {
      bruto,
      trocados,
      updatedAt: Timestamp.now(),
    });
  }, [lojaCode]);

  return { records, loading, addRecord };
}
