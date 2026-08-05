'use client';

import { useState, useMemo } from 'react';
import { Download, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import type { LeilaoBaseRow } from '@/lib/hooks/use-leilao-base';
import type { UploadedFileStored } from '@/lib/hooks/use-leilao-bases-storage';
import {
  generateCsvCadastrar,
  generateCsvTransferir,
  generateCsvTransferirComValor,
  downloadCsv,
} from '@/lib/leilao-csv';

interface Props {
  basePieces:    LeilaoBaseRow[];
  uploadedFiles: UploadedFileStored[];
  refsPerFile:   Map<string, string[]>;
  excludedFiles: Set<string>;
}

type TransferMode = 'com_valor' | 'simples';

export function RoboNovoLeilao({ basePieces, uploadedFiles, refsPerFile, excludedFiles }: Props) {
  const [selectedOld,  setSelectedOld]  = useState<string>('');
  const [novoLeilao,   setNovoLeilao]   = useState('');
  const [startLote,    setStartLote]    = useState(1);
  const [transferMode, setTransferMode] = useState<TransferMode>('com_valor');

  // All refs currently in ANY active (non-excluded) base
  const allActiveRefs = useMemo(() => {
    const set = new Set<string>();
    for (const f of uploadedFiles) {
      if (excludedFiles.has(f.filename)) continue;
      const refs = refsPerFile.get(f.filename) ?? [];
      for (const r of refs) set.add(r.toUpperCase());
    }
    return set;
  }, [uploadedFiles, refsPerFile, excludedFiles]);

  // Eligible pieces NOT in any active base = candidates for new lots
  const newPieces = useMemo(
    () => basePieces.filter(r => !allActiveRefs.has(r.referencia.toUpperCase())),
    [basePieces, allActiveRefs],
  );

  // Price map for transfers
  const priceMap = useMemo(() => {
    const map = new Map<string, LeilaoBaseRow>();
    for (const p of basePieces) map.set(p.referencia.toUpperCase(), p);
    return map;
  }, [basePieces]);

  // Selected old base info
  const oldFile = uploadedFiles.find(f => f.codigoPlatforma === selectedOld);
  const oldRefs = oldFile ? (refsPerFile.get(oldFile.filename) ?? []) : [];
  const hasVendidosData = (oldFile?.vendidos.length ?? 0) > 0 || oldRefs.length === 0;

  const unsoldRefs = useMemo(() => {
    if (!oldFile) return [];
    const vendidosSet = new Set(oldFile.vendidos);
    return oldRefs.filter(r => !vendidosSet.has(r));
  }, [oldFile, oldRefs]);

  const transferLoteStart = startLote + newPieces.length;

  function handleDownloadCadastrar() {
    if (newPieces.length === 0) return;
    const csv = generateCsvCadastrar(newPieces, startLote);
    downloadCsv(csv, `cadastrar_pecas_leilao_${novoLeilao || 'novo'}.csv`);
  }

  function handleDownloadTransferir() {
    if (!oldFile || unsoldRefs.length === 0 || !novoLeilao) return;
    const csv = transferMode === 'com_valor'
      ? generateCsvTransferirComValor(unsoldRefs, priceMap, novoLeilao)
      : generateCsvTransferir(unsoldRefs, novoLeilao);
    const suffix = transferMode === 'com_valor' ? 'transferir_com_valor' : 'transferir';
    downloadCsv(csv, `${suffix}_${selectedOld}_para_${novoLeilao}.csv`);
  }

  const canDownloadCadastrar = newPieces.length > 0;
  const canDownloadTransferir = !!oldFile && unsoldRefs.length > 0 && !!novoLeilao;

  return (
    <div className="flex flex-col gap-6">

      {/* Header inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Leilão anterior (base carregada)
          </label>
          <div className="relative">
            <select
              value={selectedOld}
              onChange={e => setSelectedOld(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
            >
              <option value="">— Selecionar leilão anterior —</option>
              {uploadedFiles.map(f => (
                <option key={f.filename} value={f.codigoPlatforma ?? ''}>
                  {f.codigoPlatforma ? `N°${f.codigoPlatforma}` : '(sem N°)'}
                  {f.leilao ? ` · #${f.leilao.numero} ${f.leilao.nome}` : ''}
                  {' '}— {f.count} peças
                  {f.vendidos.length > 0 ? ` (${f.vendidos.length} vendidas)` : ' · sem dados de venda'}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
          {oldFile && !hasVendidosData && (
            <p className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertCircle size={10} />
              Base sem dados de venda — re-faça o upload após o leilão encerrar para filtrar peças vendidas
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            N° do leilão novo (leiloes.br)
          </label>
          <input
            value={novoLeilao}
            onChange={e => setNovoLeilao(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 64878"
            maxLength={6}
            className="pl-3 pr-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Step 1 — Cadastrar Peças novas */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">1</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Cadastrar Peças Novas</span>
            <span className="text-[10px] text-zinc-400">peças elegíveis não em nenhum leilão ativo</span>
          </div>
          {canDownloadCadastrar && (
            <CheckCircle2 size={13} className="text-emerald-500" />
          )}
        </div>

        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-6 flex-1">
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{newPieces.length}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">peças novas</div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Lote inicial</label>
              <input
                type="number"
                min={1}
                value={startLote}
                onChange={e => setStartLote(Math.max(1, Number(e.target.value)))}
                className="w-20 pl-2 pr-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 transition-colors"
              />
              <span className="text-[10px] text-zinc-400">lotes {startLote}–{startLote + newPieces.length - 1}</span>
            </div>
          </div>

          <button
            onClick={handleDownloadCadastrar}
            disabled={!canDownloadCadastrar}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors shrink-0"
          >
            <Download size={13} />
            Baixar CSV — Cadastrar Peças ({newPieces.length})
          </button>
        </div>
      </div>

      {/* Step 2 — Transferir do anterior */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-bold">2</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Transferir do Leilão Anterior</span>
            <span className="text-[10px] text-zinc-400">peças não vendidas → novo leilão</span>
          </div>
          {canDownloadTransferir && (
            <CheckCircle2 size={13} className="text-emerald-500" />
          )}
        </div>

        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-6 flex-1 flex-wrap">
            {oldFile ? (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{oldRefs.length}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">total</div>
                </div>
                {oldFile.vendidos.length > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{oldFile.vendidos.length}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">vendidas</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">{unsoldRefs.length}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">a transferir</div>
                </div>
                <div className="flex flex-col gap-1 text-[10px] text-zinc-400">
                  <span>Lote atribuído pelo robô</span>
                  <span>(continua do lote {transferLoteStart})</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-400">Selecione o leilão anterior acima</p>
            )}

            {/* Transfer mode */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Tipo</label>
              <div className="flex gap-2">
                {(['com_valor', 'simples'] as TransferMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setTransferMode(m)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
                      transferMode === m
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-zinc-200 dark:border-white/[0.10] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {m === 'com_valor' ? 'c/ Atualizar Preço' : 'Só Transferir'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadTransferir}
            disabled={!canDownloadTransferir}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors shrink-0"
          >
            <Download size={13} />
            Baixar CSV — Transferir ({unsoldRefs.length})
          </button>
        </div>

        {!novoLeilao && oldFile && (
          <div className="px-4 pb-3">
            <p className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertCircle size={10} />
              Preencha o N° do leilão novo para habilitar o download
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
