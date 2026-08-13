'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, onSnapshot, addDoc, deleteDoc, updateDoc,
  doc, query, orderBy, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type LeilaoStatus =
  | 'captando'
  | 'convite'
  | 'convite_catalogo'
  | 'venda_pos_leilao'
  | 'finalizado';

export interface Leilao {
  id: string;
  numero: string;
  nome: string;
  dataInicio: string; // yyyy-MM-dd
  dataFim: string;    // yyyy-MM-dd
  cor: string;
  codigoPlatforma: string;
  observacao?: string;
  status?: LeilaoStatus;
}

const COLLECTION  = 'leilao_leiloes';
const LEGACY_KEY  = 'goldtech_leiloes_v1';

// Impede migração dupla dentro da mesma sessão
let migrationDone = false;

export function useLeiloes() {
  const [leiloes, setLeiloes] = useState<Leilao[]>([]);

  useEffect(() => {
    let unsubSnap: (() => void) | null = null;

    // Só inicia o listener após o Firebase Auth confirmar o usuário
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      if (!user) return;

      const q = query(collection(db, COLLECTION), orderBy('dataInicio', 'asc'));
      unsubSnap = onSnapshot(q, async snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Leilao));

        // Migração única: se Firestore vazio e há dados no localStorage, sobe tudo
        if (list.length === 0 && !migrationDone) {
          migrationDone = true;
          try {
            const raw = localStorage.getItem(LEGACY_KEY);
            if (raw) {
              const legacy = JSON.parse(raw) as Leilao[];
              if (legacy.length > 0) {
                const batch = writeBatch(db);
                for (const { id: _id, ...rest } of legacy) {
                  batch.set(doc(collection(db, COLLECTION)), rest);
                }
                await batch.commit();
                return; // onSnapshot dispara novamente com os dados migrados
              }
            }
          } catch { /* ignore — migração opcional */ }
        }

        setLeiloes(list);
      });
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback((l: Omit<Leilao, 'id'>) => {
    addDoc(collection(db, COLLECTION), l).catch(() => {});
  }, []);

  const update = useCallback((l: Leilao) => {
    const { id, ...rest } = l;
    updateDoc(doc(db, COLLECTION, id), rest).catch(() => {});
  }, []);

  const remove = useCallback((id: string) => {
    deleteDoc(doc(db, COLLECTION, id)).catch(() => {});
  }, []);

  return { leiloes, add, update, remove };
}
