'use client';

import { RefreshCw } from 'lucide-react';
import type { Leilao } from '@/lib/hooks/use-leiloes';
import { useSyncBases } from '@/lib/hooks/use-sync-bases';

interface Props {
  leiloes:         Leilao[];
  onSyncComplete?: () => void;
}

export function BasesSyncButton({ leiloes, onSyncComplete }: Props) {
  const { sync, syncing } = useSyncBases(leiloes, onSyncComplete);

  return (
    <button
      onClick={sync}
      disabled={syncing}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
      {syncing ? 'Sincronizando...' : 'Sincronizar do leiloes.br'}
    </button>
  );
}
