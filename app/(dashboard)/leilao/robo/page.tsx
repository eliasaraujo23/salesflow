'use client';

import { useState } from 'react';
import { useLeilaoBase } from '@/lib/hooks/use-leilao-base';
import { useLeiloes } from '@/lib/hooks/use-leiloes';
import { useLeilaoBasesStorage } from '@/lib/hooks/use-leilao-bases-storage';
import { useLeilaoRegras } from '@/lib/hooks/use-leilao-regras';
import { BaseSistemaUpload } from '@/components/leilao/base-sistema-upload';
import { BasesSyncButton } from '@/components/leilao/bases-sync-button';
import { RoboNovoLeilao } from '@/components/leilao/robo-novo-leilao';
import { RoboOperacoes } from '@/components/leilao/robo-operacoes';

export default function RoboPage() {
  const { activeDestinos } = useLeilaoRegras();
  const { data: basePieces = [], isLoading, error } = useLeilaoBase(activeDestinos);
  const { leiloes } = useLeiloes();
  const { uploadedFiles, refsPerFile, excludedFiles, add, remove, toggleExclude } = useLeilaoBasesStorage(leiloes);
  // Incrementado após sync — força RoboNovoLeilao a re-detectar ultimoLote e resetar verificação
  const [syncKey, setSyncKey] = useState(0);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-sm text-zinc-400">Carregando base...</div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-full text-sm text-red-500">Erro ao carregar. Verifique a conexão.</div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">

      {/* ── Bases do Leilão ──────────────────────────────────── */}
      <section className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Bases do Leilão</h2>
            <p className="text-[11px] text-zinc-400">Sincronize ou importe CSVs da leiloes.br</p>
          </div>
          <BasesSyncButton leiloes={leiloes} onSyncComplete={() => setSyncKey(k => k + 1)} />
        </div>
        <BaseSistemaUpload
          uploaded={uploadedFiles}
          excludedFiles={excludedFiles}
          leiloes={leiloes}
          onAdd={add}
          onRemove={remove}
          onToggleExclude={toggleExclude}
        />
      </section>

      {/* ── Criar Novo Leilão ─────────────────────────────────── */}
      <section className="flex flex-col gap-2 shrink-0">
        {uploadedFiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.08] p-5 text-center">
            <p className="text-xs text-zinc-400">Carregue ao menos uma base do leilão acima</p>
          </div>
        ) : (
          <RoboNovoLeilao
            basePieces={basePieces}
            uploadedFiles={uploadedFiles}
            refsPerFile={refsPerFile}
            excludedFiles={excludedFiles}
            leiloes={leiloes}
            syncKey={syncKey}
          />
        )}
      </section>

      {/* ── Operações Avulsas ─────────────────────────────────── */}
      <section className="flex flex-col gap-2 shrink-0">
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Operações Avulsas</h2>
        {uploadedFiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.08] p-5 text-center">
            <p className="text-xs text-zinc-400">Nenhuma base carregada</p>
          </div>
        ) : (
          <RoboOperacoes
            basePieces={basePieces}
            uploadedFiles={uploadedFiles}
            refsPerFile={refsPerFile}
          />
        )}
      </section>

    </div>
  );
}
