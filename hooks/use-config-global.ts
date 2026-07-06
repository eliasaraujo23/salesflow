'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ConfigGlobalKey =
  | 'avaliadores'
  | 'motivos_nc'
  | 'bancos_caixa'
  | 'tipos_lancamento'
  | 'formas_pagamento'
  | 'tipos_despesa'
  | 'modalidades'
  | 'empresas';

export interface ConfigGlobal {
  avaliadores: string[];
  motivos_nc: string[];
  bancos_caixa: string[];
  tipos_lancamento: string[];
  formas_pagamento: string[];
  tipos_despesa: string[];
  modalidades: string[];
  empresas: string[];
  loading: boolean;
  addItem: (key: ConfigGlobalKey, item: string) => Promise<void>;
  removeItem: (key: ConfigGlobalKey, item: string) => Promise<void>;
}

const FALLBACKS: Record<ConfigGlobalKey, string[]> = {
  avaliadores: [
    'Ana Clara', 'Ana Paula', 'Andressa', 'Augusto', 'Bruno',
    'Caroline', 'Clarisse', 'Daiana', 'Eduardo', 'Fernanda',
    'Francesco', 'Giovanna', 'Helton', 'Joyce', 'Juliana',
    'Larissa', 'Luciana', 'Matheus', 'Paula',
    'Raphael Borges', 'Thaís', 'Thays', 'Vinicius de Paula',
  ],
  motivos_nc: [
    'MELHOR PREÇO CONCORRENTE', 'IMAGINA PREÇO MELHOR', 'ELO EMOCIONAL',
    'BIJUTERIA', 'PEÇA DE TERCEIROS', 'NÃO DEIXOU LIMAR',
    'IMAGINA PREÇO ACIMA DA COTAÇÃO', 'PESQUISANDO PREÇO',
    'SEM DOCUMENTOS', 'NÃO QUIS ASSINAR', 'DISPENSADO', 'FIZ MERDA',
  ],
  bancos_caixa: [
    'BMG KADU',
    'BTG AUGUSTO', 'BTG ETERNNO', 'BTG HELTON', 'BTG KADU', 'BTG THAÍS',
    'C6 AUGUSTO', 'C6 HELTON', 'C6 KADU',
    'ESPECIE',
    'INTER CLARISSE', 'INTER KADU', 'INTER MATHEUS', 'INTER THAIS',
    'ITAÚ A. TECH', 'ITAÚ AUGUSTO', 'ITAÚ BRUNO', 'ITAÚ  G. TECH', 'ITAÚ KADU', 'ITAÚ MATHEUS',
    'LANCAMENTOS',
    'MERCADO PAGO 24K', 'MERCADO PAGO A. TECH', 'MERCADO PAGO AUGUSTO',
    'MERCADO PAGO ETERNNO', 'MERCADO PAGO GOLD TECH', 'MERCADO PAGO G. TECH',
    'MERCADO PAGO KADU', 'MERCADO PAGO TECH GOLD',
    'METAL',
    'NUBANK BRUNO', 'NUBANK G.TECH', 'NUBANK HELTON', 'NUBANK KADU', 'NUBANK THAÍS',
    'PAYPAL 24K', 'PAYPAL ETERNNO', 'PAYPAL GOLDTECH', 'PAYPAL TECHGOLD',
    'SANTANDER 24K', 'SANTANDER AUGUSTO', 'SANTANDER BRUNO', 'SANTANDER ETERNNO',
    'SANTANDER GOLD TECH', 'SANTANDER G. TECH', 'SANTANDER HELTON',
    'SANTANDER  H. TECH', 'SANTANDER KADU', 'SANTANDER TECH GOLD', 'SANTANDER THAIS',
    'SERGIO METAL',
    'SICREDI BRUNO',
  ],
  tipos_lancamento: ['PIX', 'SAQUE', 'PAGAMENTO', 'EMPRÉSTIMO', 'ENTRADA', 'DEVOLUÇÃO', 'CORRETO'],
  formas_pagamento: ['Dinheiro', 'PIX', 'Transferência', 'Cartão'],
  tipos_despesa: ['Alimentação', 'Transporte', 'Material de escritório', 'Serviço', 'Fornecedor', 'Outros'],
  modalidades: ['24K', 'ANTIGO', 'ETN', 'GTI', 'GTT', 'SCRAP', 'SECOND HAND'],
  empresas: [
    '24K Joias | Thais Joias LTDA',
    'A. Tech Comércio De Joias LTDA',
    'ETERNNO Comércio de Jóias e Artigos de Luxo LTDA',
    'G. Tech Comércio de Joias LTDA',
    'Gold Tech Comércio de Joias LTDA',
    'H. Tech Comércio De Joias LTDA',
    'Tech Gold Ipanema Comércio de Joias LTDA',
  ],
};

export function useConfigGlobal(): ConfigGlobal {
  const [data, setData] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'config_global'), snap => {
      const map: Record<string, string[]> = {};
      snap.docs.forEach(d => {
        const docData = d.data();
        if (Array.isArray(docData.lista)) map[d.id] = docData.lista;
      });
      setData(map);
      setLoading(false);
    });
    return unsub;
  }, []);

  const addItem = useCallback(async (key: ConfigGlobalKey, item: string) => {
    await setDoc(doc(db, 'config_global', key), { lista: arrayUnion(item) }, { merge: true });
  }, []);

  const removeItem = useCallback(async (key: ConfigGlobalKey, item: string) => {
    await setDoc(doc(db, 'config_global', key), { lista: arrayRemove(item) }, { merge: true });
  }, []);

  return {
    avaliadores:      data.avaliadores      ?? FALLBACKS.avaliadores,
    motivos_nc:       data.motivos_nc       ?? FALLBACKS.motivos_nc,
    bancos_caixa:     data.bancos_caixa     ?? FALLBACKS.bancos_caixa,
    tipos_lancamento: data.tipos_lancamento ?? FALLBACKS.tipos_lancamento,
    formas_pagamento: data.formas_pagamento ?? FALLBACKS.formas_pagamento,
    tipos_despesa:    data.tipos_despesa    ?? FALLBACKS.tipos_despesa,
    modalidades:      data.modalidades      ?? FALLBACKS.modalidades,
    empresas:         data.empresas         ?? FALLBACKS.empresas,
    loading,
    addItem,
    removeItem,
  };
}
