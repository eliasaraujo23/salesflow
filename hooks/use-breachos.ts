'use client';

import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Brecho {
  id: string;
  nome: string;
  estado: string;
  uf: string;
}

export function useBreachos() {
  const [breachos, setBreachos] = useState<Brecho[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'breachos'), orderBy('nome', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setBreachos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Brecho)));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function addBrecho(data: Omit<Brecho, 'id'>) {
    await addDoc(collection(db, 'breachos'), { ...data, createdAt: serverTimestamp() });
  }

  async function removeBrecho(id: string) {
    await deleteDoc(doc(db, 'breachos', id));
  }

  return { breachos, loading, addBrecho, removeBrecho };
}
