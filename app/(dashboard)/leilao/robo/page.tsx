'use client';

import { useLeilaoBase } from '@/lib/hooks/use-leilao-base';
import { useLeiloes } from '@/lib/hooks/use-leiloes';
import { useLeilaoBasesStorage } from '@/lib/hooks/use-leilao-bases-storage';
import { BaseSistemaUpload } from '@/components/leilao/base-sistema-upload';
import { RoboNovoLeilao } from '@/components/leilao/robo-novo-leilao';
import { RoboOperacoes } from '@/components/leilao/robo-operacoes';

export default function RoboPage() {
  const { data: basePieces = [], isLoading, error } = useLeilaoBase();
  const { leiloes } = useLeiloes();
  const { uploadedFiles, refsPerFile, excludedFiles, add, remove, toggleExclude } = useLeilaoBasesStorage(leiloes);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-sm text-zinc-400">Carregando base...</div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-full text-sm text-red-500">Erro ao carregar. Verifique a conexão.</div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-8">

      {/* ── Bases do Leilão ──────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Bases do Leilão</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            CSVs exportados da leiloes.br — um arquivo por leilão ativo
          </p>
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

      <hr className="border-zinc-100 dark:border-white/[0.06]" />

      {/* ── Criar Novo Leilão ─────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Criar Novo Leilão</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gera os CSVs para o robô: peças novas da Base Sistema + transferência do leilão anterior
          </p>
        </div>
        {uploadedFiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.08] p-6 text-center">
            <p className="text-xs text-zinc-400">Carregue ao menos uma base do leilão acima</p>
          </div>
        ) : (
          <RoboNovoLeilao
            basePieces={basePieces}
            uploadedFiles={uploadedFiles}
            refsPerFile={refsPerFile}
            excludedFiles={excludedFiles}
          />
        )}
      </section>

      <hr className="border-zinc-100 dark:border-white/[0.06]" />

      {/* ── Operações Avulsas ─────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Operações Avulsas</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Upload de imagens ou atualização de preço para uma base específica
          </p>
        </div>
        {uploadedFiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.08] p-6 text-center">
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
