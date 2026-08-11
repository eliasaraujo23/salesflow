'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  collection, getDocs, deleteDoc, addDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import type { Leilao } from '@/lib/hooks/use-leiloes';
import type { SyncResult } from '@/app/api/leilao/sync-base/route';

const COLLECTION = 'leilao_bases_ativas';
const QUERY_KEY  = ['leilao-bases-ativas'];

export function useSyncBases(leiloes: Leilao[]) {
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  const sync = useCallback(async () => {
    const eligible = leiloes.filter(l => l.codigoPlatforma?.trim());
    if (eligible.length === 0) {
      toast.error('Nenhum leilão tem N° leiloes.br cadastrado');
      return;
    }

    setSyncing(true);
    const tid = toast.loading(`Sincronizando ${eligible.length} leilão(ões)...`);

    try {
      const res = await fetch('/api/leilao/sync-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leiloes: eligible.map(l => ({
            codigoPlatforma: l.codigoPlatforma,
            nome:            l.nome,
            numero:          l.numero,
          })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json() as { data: SyncResult[] };

      let ok      = 0;
      let skipped = 0;
      let errors  = 0;

      for (const item of data) {
        if (item.error) { errors++; continue; }
        if (item.skipped) { skipped++; continue; }

        const filename = `Lotes_${item.codigoPlatforma}.xls`;

        // Substitui qualquer doc existente com o mesmo codigo_plataforma
        const existing = await getDocs(
          query(collection(db, COLLECTION), where('codigo_plataforma', '==', item.codigoPlatforma)),
        );
        await Promise.all(existing.docs.map(d => deleteDoc(d.ref)));

        await addDoc(collection(db, COLLECTION), {
          codigo_plataforma: item.codigoPlatforma,
          filename,
          count_pecas:       item.count   ?? 0,
          refs:              item.refs    ?? [],
          refs_vendidos:     item.vendidos ?? [],
          price_per_ref:     item.pricePerRef ?? {},
          excluded:          false,
          createdAt:         serverTimestamp(),
        });

        ok++;
      }

      qc.invalidateQueries({ queryKey: QUERY_KEY });

      const parts: string[] = [];
      if (ok      > 0) parts.push(`${ok} sincronizada${ok !== 1 ? 's' : ''}`);
      if (skipped > 0) parts.push(`${skipped} sem credencial`);
      if (errors  > 0) parts.push(`${errors} com erro`);
      toast.success(parts.join(' · '), { id: tid });
    } catch (err) {
      toast.error(
        `Erro ao sincronizar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        { id: tid },
      );
    } finally {
      setSyncing(false);
    }
  }, [leiloes, qc]);

  return { sync, syncing };
}
