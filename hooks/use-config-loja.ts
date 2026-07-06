'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';

export interface ConfigLoja {
  feedbacks_compra: string[];
  loading: boolean;
  addFeedback: (item: string) => Promise<void>;
  removeFeedback: (item: string) => Promise<void>;
}

export function useConfigLoja(lojaCode: LojaCode): ConfigLoja {
  const fallback = getLojaConfig(lojaCode);
  const [feedbacks, setFeedbacks] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config_loja', lojaCode), snap => {
      const data = snap.data();
      setFeedbacks(Array.isArray(data?.feedbacks) ? data.feedbacks : null);
      setLoading(false);
    });
    return unsub;
  }, [lojaCode]);

  const addFeedback = useCallback(async (item: string) => {
    await setDoc(doc(db, 'config_loja', lojaCode), { feedbacks: arrayUnion(item) }, { merge: true });
  }, [lojaCode]);

  const removeFeedback = useCallback(async (item: string) => {
    await setDoc(doc(db, 'config_loja', lojaCode), { feedbacks: arrayRemove(item) }, { merge: true });
  }, [lojaCode]);

  return {
    feedbacks_compra: feedbacks ?? fallback?.feedbacks_compra ?? [],
    loading,
    addFeedback,
    removeFeedback,
  };
}
