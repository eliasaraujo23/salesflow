'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Leilao } from '@/lib/hooks/use-leiloes';
import type { SyncResult } from '@/app/api/leilao/sync-base/route';

const QUERY_KEY = ['leilao-bases-ativas'];

export function useSyncBases(leiloes: Leilao[], onSyncComplete?: () => void) {
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  const sync = useCallback(async () => {
    const today    = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
    const SYNC_STATUSES = new Set(['convite_catalogo', 'venda_pos_leilao']);
    // Só sincroniza leilões que o usuário configurou manualmente (status ativo + data preenchida)
    const eligible = leiloes.filter(l =>
      l.codigoPlatforma?.trim() &&
      SYNC_STATUSES.has(l.status ?? '') &&
      l.dataFim && l.dataFim >= today,
    );
    if (eligible.length === 0) {
      toast.error('Nenhum leilão ativo com data cadastrada para sincronizar');
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
            cor:             l.cor,
          })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json() as { data: SyncResult[] };

      let ok         = 0;
      let skipped    = 0;
      let finalizados = 0;
      let errors     = 0;

      for (const item of data) {
        if (item.error) { errors++; continue; }

        // Leilão finalizado na leiloes.br → remover do storage local
        if (item.finalizado) {
          finalizados++;
          await fetch('/api/leilao/bases-ativas/replace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigoPlatforma: item.codigoPlatforma }),
          });
          continue;
        }

        if (item.skipped) { skipped++; continue; }

        const filename = `Lotes_${item.codigoPlatforma}.xls`;

        // Substitui qualquer registro existente com o mesmo codigo_plataforma
        await fetch('/api/leilao/bases-ativas/replace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoPlatforma: item.codigoPlatforma,
            filename,
            count: item.count ?? 0,
            refs: item.refs ?? [],
            refsVendidos: item.vendidos ?? [],
            pricePerRef: item.pricePerRef ?? {},
            loteParaRef: item.loteParaRef ?? {},
          }),
        });

        ok++;
      }

      qc.invalidateQueries({ queryKey: QUERY_KEY });
      onSyncComplete?.();

      const parts: string[] = [];
      if (ok          > 0) parts.push(`${ok} sincronizada${ok !== 1 ? 's' : ''}`);
      if (finalizados > 0) parts.push(`${finalizados} finalizada${finalizados !== 1 ? 's' : ''} (removida${finalizados !== 1 ? 's' : ''})`);
      if (skipped     > 0) parts.push(`${skipped} sem credencial`);
      if (errors      > 0) parts.push(`${errors} com erro`);
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
