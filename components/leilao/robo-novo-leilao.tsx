'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, AlertTriangle, ChevronDown, CheckCircle2, Zap } from 'lucide-react';
import type { LeilaoBaseRow } from '@/lib/hooks/use-leilao-base';
import type { UploadedFileStored } from '@/lib/hooks/use-leilao-bases-storage';
import type { Leilao } from '@/lib/hooks/use-leiloes';
import {
  generateCsvCadastrar,
  generateCsvTransferir,
  generateCsvTransferirComValor,
  countExcludedFromTransfer,
  generateCsvExcluidas,
  downloadCsv,
  type RefDetailExtra,
} from '@/lib/leilao-csv';
import { fetchRefsDetail } from '@/lib/actions/fetch-refs-detail';
import { useCadastrarPecas, buildPecasParaCadastrar } from '@/lib/hooks/use-cadastrar-pecas';
import { CadastrarPecasModal } from '@/components/leilao/cadastrar-pecas-modal';
import { useTransferirPecas } from '@/lib/hooks/use-transferir-pecas';
import { TransferirPecasModal } from '@/components/leilao/transferir-pecas-modal';

interface Props {
  basePieces:    LeilaoBaseRow[];
  uploadedFiles: UploadedFileStored[];
  refsPerFile:   Map<string, string[]>;
  excludedFiles: Set<string>;
  leiloes:       Leilao[];
}

type TransferMode = 'com_valor' | 'simples';

function Stat({ value, label, color = 'zinc' }: { value: number; label: string; color?: string }) {
  const colorMap: Record<string, string> = {
    zinc:    'text-zinc-800 dark:text-zinc-100',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    violet:  'text-violet-600 dark:text-violet-400',
    indigo:  'text-indigo-600 dark:text-indigo-400',
  };
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[56px]">
      <span className={`text-2xl font-bold tabular-nums ${colorMap[color] ?? colorMap.zinc}`}>
        {value.toLocaleString('pt-BR')}
      </span>
      <span className="text-[10px] text-zinc-400 text-center leading-tight">{label}</span>
    </div>
  );
}

export function RoboNovoLeilao({ basePieces, uploadedFiles, refsPerFile, excludedFiles, leiloes }: Props) {
  const [selectedOld,      setSelectedOld]      = useState<string>('');
  const [oldOpen,          setOldOpen]          = useState(false);
  const [novoLeilao,       setNovoLeilao]       = useState('');
  const [novoLeilaoSel,    setNovoLeilaoSel]    = useState<Leilao | null>(null);
  const [novoOpen,         setNovoOpen]         = useState(false);
  const [startLote,        setStartLote]        = useState(1);
  const [transferMode,     setTransferMode]     = useState<TransferMode>('com_valor');
  const [leilaoTipo,       setLeilaoTipo]       = useState<'NORMAL' | 'TOP'>('NORMAL');
  const [loadingExcluidas, setLoadingExcluidas] = useState(false);
  const { open: cadastrarOpen, openModal: openCadastrar, closeModal: closeCadastrar, state: cadastrarState, execute: executeCadastrar, isRunning: cadastrarRunning } = useCadastrarPecas();
  const { open: transferirOpen, openModal: openTransferir, closeModal: closeTransferir, state: transferirState, execute: executeTransferir, isRunning: transferirRunning } = useTransferirPecas();

  useEffect(() => {
    const f = uploadedFiles.find(f => f.codigoPlatforma === selectedOld);
    const nome = f?.leilao?.nome?.toUpperCase() ?? '';
    setLeilaoTipo(nome.includes('TOP') ? 'TOP' : 'NORMAL');
  }, [selectedOld, uploadedFiles]);

  const allActiveRefs = useMemo(() => {
    const set = new Set<string>();
    for (const f of uploadedFiles) {
      if (excludedFiles.has(f.filename)) continue;
      for (const r of (refsPerFile.get(f.filename) ?? []))
        if (!!r) set.add(r.toUpperCase());
    }
    return set;
  }, [uploadedFiles, refsPerFile, excludedFiles]);

  function selectNovoLeilao(l: Leilao) {
    setNovoLeilao(l.codigoPlatforma);
    setNovoLeilaoSel(l);
    setNovoOpen(false);
  }

  function clearNovoLeilao() {
    setNovoLeilao('');
    setNovoLeilaoSel(null);
  }

  const oldFile = uploadedFiles.find(f => f.codigoPlatforma === selectedOld);
  // Filtra refs inválidas que possam ter chegado de uploads antigos (ex: linhas de diamantes)
  const oldRefs = oldFile
    ? (refsPerFile.get(oldFile.filename) ?? []).filter(r => !!r)
    : [];

  const newPieces = useMemo(
    () => basePieces.filter(r =>
      !allActiveRefs.has(r.referencia.toUpperCase()) && r.recomendacao === leilaoTipo
    ),
    [basePieces, allActiveRefs, leilaoTipo],
  );

  const priceMap = useMemo(() => {
    const map = new Map<string, LeilaoBaseRow>();
    for (const p of basePieces) map.set(p.referencia.toUpperCase(), p);
    return map;
  }, [basePieces]);

  const unsoldRefs = useMemo(() => {
    if (!oldFile) return [];
    const vendidosSet = new Set(oldFile.vendidos);
    return oldRefs.filter(r => !vendidosSet.has(r));
  }, [oldFile, oldRefs]);

  const excluded = useMemo(
    () => oldFile ? countExcludedFromTransfer(unsoldRefs, priceMap) : { foraBase: 0, destinoExcluido: 0, total: 0 },
    [unsoldRefs, priceMap, oldFile],
  );
  const eligibleCount = unsoldRefs.length - excluded.total;

  // Lote inicial da transferência = logo após as peças novas
  const transferStartLote = startLote + newPieces.length;

  // Peças elegíveis para transferência com valor atualizado do sistema
  const pecasParaTransferir = useMemo(() => {
    if (!oldFile) return [];
    const vendidosSet = new Set(oldFile.vendidos);
    return unsoldRefs
      .filter(r => !vendidosSet.has(r))
      .filter(r => {
        const row = priceMap.get(r.toUpperCase());
        return row && (row.preco_avista ?? 0) > 0;
      })
      .map(r => ({
        ref:   r,
        valor: Math.round(priceMap.get(r.toUpperCase())?.preco_avista ?? 0),
      }));
  }, [oldFile, unsoldRefs, priceMap]);

  function handleDownloadCadastrar() {
    if (newPieces.length === 0) return;
    downloadCsv(
      generateCsvCadastrar(newPieces, startLote),
      `cadastrar_pecas_leilao_${novoLeilao || 'novo'}.csv`,
    );
  }

  function handleDownloadTransferir() {
    if (!oldFile || eligibleCount === 0 || !novoLeilao) return;
    const csv = transferMode === 'com_valor'
      ? generateCsvTransferirComValor(unsoldRefs, priceMap, novoLeilao)
      : generateCsvTransferir(unsoldRefs, novoLeilao, priceMap);
    downloadCsv(csv, `transferir_N${selectedOld}_para_${novoLeilao}.csv`);
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Config ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Leilão anterior
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOldOpen(o => !o)}
              onBlur={() => setTimeout(() => setOldOpen(false), 150)}
              className="w-full flex items-center gap-2 pl-3 pr-8 py-2.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-left focus:outline-none focus:border-indigo-400 transition-colors"
            >
              {oldFile ? (
                <>
                  {oldFile.leilao && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: oldFile.leilao.cor }} />}
                  <span className="font-bold text-zinc-700 dark:text-zinc-200 tabular-nums shrink-0">N°{oldFile.codigoPlatforma ?? '—'}</span>
                  {oldFile.leilao && <>
                    <span className="text-zinc-400">·</span>
                    <span className="font-semibold text-zinc-500 tabular-nums shrink-0">#{oldFile.leilao.numero}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-600 dark:text-zinc-400 truncate">{oldFile.leilao.nome}</span>
                  </>}
                  <span className="ml-auto text-zinc-400 shrink-0 whitespace-nowrap">
                    {oldFile.count} peças{oldFile.vendidos.length > 0 ? `, ${oldFile.vendidos.length} vendidas` : ''}
                  </span>
                </>
              ) : (
                <span className="text-zinc-400">— Selecionar —</span>
              )}
            </button>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />

            {oldOpen && (
              <div className="absolute top-full mt-1 w-full z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.10] rounded-lg shadow-lg overflow-visible">
                <button
                  type="button"
                  onMouseDown={() => { setSelectedOld(''); setOldOpen(false); }}
                  className="w-full px-3 py-2.5 text-left text-xs text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  — Selecionar —
                </button>
                {[...uploadedFiles]
                  .sort((a, b) => Number(a.codigoPlatforma ?? 0) - Number(b.codigoPlatforma ?? 0))
                  .map(f => (
                    <button
                      key={f.filename}
                      type="button"
                      onMouseDown={() => { setSelectedOld(f.codigoPlatforma ?? ''); setOldOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                    >
                      {f.leilao && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.leilao.cor }} />}
                      <span className="font-bold text-zinc-700 dark:text-zinc-200 tabular-nums shrink-0">N°{f.codigoPlatforma ?? '—'}</span>
                      {f.leilao && <>
                        <span className="text-zinc-400">·</span>
                        <span className="font-semibold text-zinc-500 tabular-nums shrink-0">#{f.leilao.numero}</span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-zinc-600 dark:text-zinc-400 truncate">{f.leilao.nome}</span>
                      </>}
                      <span className="ml-auto text-zinc-400 shrink-0 whitespace-nowrap">
                        {f.count}{f.vendidos.length > 0 ? `, ${f.vendidos.length} vend.` : ''} peças
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            N° do leilão novo (leiloes.br)
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNovoOpen(o => !o)}
              onBlur={() => setTimeout(() => setNovoOpen(false), 150)}
              className="w-full flex items-center gap-2 pl-3 pr-8 py-2.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-left focus:outline-none focus:border-indigo-400 transition-colors"
            >
              {novoLeilaoSel ? (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: novoLeilaoSel.cor }} />
                  <span className="font-bold text-zinc-700 dark:text-zinc-200 tabular-nums shrink-0">N°{novoLeilaoSel.codigoPlatforma}</span>
                  <span className="text-zinc-400">·</span>
                  <span className="font-semibold text-zinc-500 tabular-nums shrink-0">#{novoLeilaoSel.numero}</span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-600 dark:text-zinc-400 truncate">{novoLeilaoSel.nome}</span>
                </>
              ) : (
                <span className="text-zinc-400">— Selecionar —</span>
              )}
            </button>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />

            {novoOpen && (
              <div className="absolute top-full mt-1 w-full z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.10] rounded-lg shadow-lg overflow-visible">
                <button
                  type="button"
                  onMouseDown={() => { clearNovoLeilao(); setNovoOpen(false); }}
                  className="w-full px-3 py-2.5 text-left text-xs text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  — Selecionar —
                </button>
                {[...leiloes]
                  .filter(l => l.codigoPlatforma)
                  .sort((a, b) => Number(a.codigoPlatforma) - Number(b.codigoPlatforma))
                  .map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onMouseDown={() => selectNovoLeilao(l)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.cor }} />
                      <span className="font-bold text-zinc-700 dark:text-zinc-200 tabular-nums shrink-0">N°{l.codigoPlatforma}</span>
                      <span className="text-zinc-400">·</span>
                      <span className="font-semibold text-zinc-500 tabular-nums shrink-0">#{l.numero}</span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-zinc-600 dark:text-zinc-400 truncate">{l.nome}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Step cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ① Cadastrar Peças Novas */}
        <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-visible">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-t-xl border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/40">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold shrink-0">1</span>
            <div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Cadastrar Peças Novas</p>
              <p className="text-[10px] text-zinc-400 leading-tight">Peças da Base Sistema ainda fora dos leilões ativos</p>
            </div>
            {newPieces.length > 0 && <CheckCircle2 size={13} className="text-emerald-500 ml-auto shrink-0" />}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-4 p-4 flex-1">
            {/* Tipo do leilão — auto-detectado, ajustável */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Tipo do leilão</span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/60">
                {(['NORMAL', 'TOP'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setLeilaoTipo(t)}
                    className={`py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      leilaoTipo === t
                        ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {t === 'TOP' ? 'TOP (≥ R$ 5.000)' : 'Normal (< R$ 5.000)'}
                  </button>
                ))}
              </div>
            </div>
            {/* Stat */}
            <div className="flex items-center gap-4">
              <Stat value={newPieces.length} label="peças disponíveis" color="indigo" />
              <div className="w-px h-8 bg-zinc-100 dark:bg-white/[0.06]" />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Lote inicial</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1}
                    value={startLote}
                    onChange={e => setStartLote(Math.max(1, Number(e.target.value)))}
                    className="w-16 pl-2 pr-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap">até {startLote + newPieces.length - 1}</span>
                </div>
              </div>
            </div>

            {/* Botões CSV + Executar */}
            <div className="mt-auto flex gap-2">
              <button
                onClick={handleDownloadCadastrar}
                disabled={newPieces.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
              >
                <Download size={12} />
                CSV
              </button>
              <button
                onClick={openCadastrar}
                disabled={newPieces.length === 0 || !novoLeilao || !novoLeilaoSel}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors"
              >
                <Zap size={12} />
                {newPieces.length > 0 ? `Executar (${newPieces.length})` : 'Executar'}
              </button>
            </div>
            {!novoLeilao && newPieces.length > 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center -mt-1">
                Selecione o leilão novo para executar
              </p>
            )}
          </div>
        </div>

        <CadastrarPecasModal
          open={cadastrarOpen}
          state={cadastrarState}
          pecas={buildPecasParaCadastrar(newPieces, startLote)}
          leilaoNome={novoLeilaoSel?.nome}
          codigoPlatforma={novoLeilao || undefined}
          onClose={closeCadastrar}
          isRunning={cadastrarRunning}
          onExecute={(selected) => {
            if (!novoLeilao || !novoLeilaoSel || selected.length === 0) return;
            executeCadastrar({
              codigoPlatforma: novoLeilao,
              nome:            novoLeilaoSel.nome,
              pecas:           selected,
            });
          }}
        />

        {/* ② Transferir do Leilão Anterior */}
        <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-visible">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-t-xl border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/40">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-bold shrink-0">2</span>
            <div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Transferir do Leilão Anterior</p>
              <p className="text-[10px] text-zinc-400 leading-tight">
                {oldFile
                  ? `N°${oldFile.codigoPlatforma} → N°${novoLeilao || '?'}`
                  : 'Selecione o leilão anterior acima'}
              </p>
            </div>
            {eligibleCount > 0 && !!novoLeilao && <CheckCircle2 size={13} className="text-emerald-500 ml-auto shrink-0" />}
          </div>

          <div className="flex flex-col gap-4 p-4 flex-1">
            {oldFile ? (
              <>
                {/* Stats */}
                <div className="flex items-center justify-around">
                  <Stat value={oldRefs.length} label="total" />
                  <div className="w-px h-8 bg-zinc-100 dark:bg-white/[0.06]" />
                  <Stat value={oldFile.vendidos.length} label="vendidas" color="emerald" />
                  <div className="w-px h-8 bg-zinc-100 dark:bg-white/[0.06]" />
                  <Stat value={eligibleCount} label="a transferir" color="violet" />
                </div>

                {/* Transfer type */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Tipo</span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/60">
                    {(['com_valor', 'simples'] as TransferMode[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setTransferMode(m)}
                        className={`py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                          transferMode === m
                            ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                      >
                        {m === 'com_valor' ? 'c/ Atualizar Preço' : 'Só Transferir'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exclusion warning */}
                {excluded.total > 0 && (
                  <div className="flex flex-col gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 flex-1">
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                          {excluded.total} peça{excluded.total > 1 ? 's' : ''} excluída{excluded.total > 1 ? 's' : ''}
                        </span>
                        {excluded.foraBase > 0 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-500">
                            · {excluded.foraBase} fora da Base Sistema (sem foto, sem preço ou vendidas)
                          </span>
                        )}
                        {excluded.destinoExcluido > 0 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-500">
                            · {excluded.destinoExcluido} com destino exclusivo (Gringa, Lohana, etc.)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      disabled={loadingExcluidas}
                      onClick={async () => {
                        setLoadingExcluidas(true);
                        try {
                          // Fetch detail for refs NOT in priceMap
                          const foraBaseRefs = unsoldRefs.filter(r => !priceMap.has(r.toUpperCase()));
                          const details = await fetchRefsDetail(foraBaseRefs);
                          const detailMap = new Map<string, RefDetailExtra>(
                            details.map(d => [d.referencia.toUpperCase(), d])
                          );
                          downloadCsv(
                            generateCsvExcluidas(unsoldRefs, priceMap, detailMap),
                            `excluidas_N${selectedOld}.csv`,
                          );
                        } catch {
                          toast.error('Erro ao gerar lista. Verifique a conexão.');
                        } finally {
                          setLoadingExcluidas(false);
                        }
                      }}
                      className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-60 disabled:cursor-wait text-amber-700 dark:text-amber-400 text-[10px] font-semibold transition-colors"
                    >
                      <Download size={11} />
                      {loadingExcluidas ? 'Buscando...' : 'Ver lista completa (CSV)'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-400 text-center py-4">Selecione o leilão anterior</p>
            )}

            {/* Botões CSV + Executar */}
            <div className="mt-auto flex gap-2">
              <button
                onClick={handleDownloadTransferir}
                disabled={!oldFile || eligibleCount === 0 || !novoLeilao}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
              >
                <Download size={12} />
                CSV
              </button>
              <button
                onClick={openTransferir}
                disabled={!oldFile || pecasParaTransferir.length === 0 || !novoLeilao || !selectedOld}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors"
              >
                <Zap size={12} />
                {pecasParaTransferir.length > 0 ? `Executar (${pecasParaTransferir.length})` : 'Executar'}
              </button>
            </div>
            {!novoLeilao && !!oldFile && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center -mt-1">
                Informe o N° do leilão novo acima
              </p>
            )}
          </div>
        </div>

      </div>

      <TransferirPecasModal
        open={transferirOpen}
        state={transferirState}
        pecas={pecasParaTransferir}
        startLote={transferStartLote}
        leilaoOrigem={selectedOld || undefined}
        leilaoDestino={novoLeilao || undefined}
        onClose={closeTransferir}
        isRunning={transferirRunning}
        onExecute={() => {
          if (!novoLeilao || !novoLeilaoSel || !selectedOld || pecasParaTransferir.length === 0) return;
          executeTransferir({
            nome:          novoLeilaoSel.nome,
            leilaoOrigem:  selectedOld,
            leilaoDestino: novoLeilao,
            startLote:     transferStartLote,
            pecas:         pecasParaTransferir,
          });
        }}
      />

    </div>
  );
}
