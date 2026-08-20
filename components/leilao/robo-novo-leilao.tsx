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
import { useLeilaoRegras } from '@/lib/hooks/use-leilao-regras';
import { useTransferirPecas } from '@/lib/hooks/use-transferir-pecas';
import { TransferirPecasModal } from '@/components/leilao/transferir-pecas-modal';
import { useVerificarRefs } from '@/lib/hooks/use-verificar-refs';

interface Props {
  basePieces:    LeilaoBaseRow[];
  uploadedFiles: UploadedFileStored[];
  refsPerFile:   Map<string, string[]>;
  excludedFiles: Set<string>;
  leiloes:       Leilao[];
  syncKey?:      number;
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

export function RoboNovoLeilao({ basePieces, uploadedFiles, refsPerFile, excludedFiles, leiloes, syncKey }: Props) {
  const [selectedOld,      setSelectedOld]      = useState<string>('');
  const [oldOpen,          setOldOpen]          = useState(false);
  const [novoLeilao,       setNovoLeilao]       = useState('');
  const [novoLeilaoSel,    setNovoLeilaoSel]    = useState<Leilao | null>(null);
  const [novoOpen,              setNovoOpen]              = useState(false);
  const [startLote,             setStartLote]             = useState(1);
  const [fetchingStartLote,     setFetchingStartLote]     = useState(false);
  const [limitQtd,              setLimitQtd]              = useState<number | ''>('' );
  const [transferStartLote,     setTransferStartLote]     = useState(1);
  const [countPecasDestino,     setCountPecasDestino]     = useState(0);
  const [fetchingUltimoLote,    setFetchingUltimoLote]    = useState(false);
  const [transferMode,     setTransferMode]     = useState<TransferMode>('com_valor');
  const [leilaoTipo,       setLeilaoTipo]       = useState<'NORMAL' | 'TOP'>('NORMAL');
  const [loadingExcluidas, setLoadingExcluidas] = useState(false);
  const { open: cadastrarOpen, openModal: openCadastrar, closeModal: closeCadastrar, state: cadastrarState, execute: executeCadastrar, isRunning: cadastrarRunning } = useCadastrarPecas();
  const { regras } = useLeilaoRegras();
  const { open: transferirOpen, openModal: openTransferir, closeModal: closeTransferir, state: transferirState, execute: executeTransferir, isRunning: transferirRunning } = useTransferirPecas();
  const { state: verificarState, verificar: verificarRefs, reset: resetVerificar } = useVerificarRefs();
  // refsJaNoDestino vem do hook verificarRefs (busca por Descricao no leiloesbr)
  const refsJaNoDestino = verificarState.refsPresentes;

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
    setStartLote(1);
    setTransferStartLote(1);
    setCountPecasDestino(0);
    resetVerificar();
  }

  // Ao selecionar leilão novo (ou após sync): detecta ultimoLote para cadastrar + transferir
  useEffect(() => {
    if (!novoLeilao || !novoLeilaoSel) {
      setStartLote(1);
      setTransferStartLote(1);
      setCountPecasDestino(0);
      return;
    }
    void syncKey;
    const ctrl = new AbortController();
    setFetchingStartLote(true);
    setFetchingUltimoLote(true);
    resetVerificar();
    fetch(`/api/leilao/ultimo-lote?leilao=${novoLeilao}&nome=${encodeURIComponent(novoLeilaoSel.nome)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((data: { ultimoLote?: number; countPecas?: number; error?: string }) => {
        if (typeof data.ultimoLote === 'number') {
          setStartLote(data.ultimoLote + 1);
          setTransferStartLote(data.ultimoLote + 1);
        }
        if (typeof data.countPecas === 'number') {
          setCountPecasDestino(data.countPecas);
        }
      })
      .catch(() => {})
      .finally(() => {
        setFetchingStartLote(false);
        setFetchingUltimoLote(false);
      });
    return () => ctrl.abort();
  }, [novoLeilao, novoLeilaoSel, syncKey]);

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

  const pecasParaCadastrar = useMemo(
    () => limitQtd === '' ? newPieces : newPieces.slice(0, Math.max(1, limitQtd)),
    [newPieces, limitQtd],
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

  // Limite de capacidade do leilão destino
  const isDestinoTop  = novoLeilaoSel?.nome?.toUpperCase().includes('TOP') ?? false;
  const MAX_LEILAO    = isDestinoTop ? 400 : 9999;
  // Quantas vagas restam no destino (baseado na contagem real de peças, não no último lote)
  const vagasDestino  = fetchingUltimoLote ? 9999 : Math.max(0, MAX_LEILAO - countPecasDestino);

  // Peças elegíveis para transferência com valor atualizado do sistema
  // Exclui peças já presentes no leilão destino (detectadas via scraping)
  // Limita pela capacidade restante do leilão destino
  const pecasParaTransferir = useMemo(() => {
    if (!oldFile) return [];
    const vendidosSet = new Set(oldFile.vendidos);
    const candidatas = unsoldRefs
      .filter(r => !vendidosSet.has(r))
      .filter(r => {
        const row = priceMap.get(r.toUpperCase());
        return row && (row.preco_avista ?? 0) > 0;
      })
      .filter(r => !refsJaNoDestino.has(r.toUpperCase()))
      .map(r => ({
        ref:   r,
        valor: Math.round(priceMap.get(r.toUpperCase())?.preco_avista ?? 0),
      }));
    return candidatas.slice(0, vagasDestino);
  }, [oldFile, unsoldRefs, priceMap, refsJaNoDestino, vagasDestino]);

  const qtdJaTransferidas = useMemo(() => {
    if (!oldFile || refsJaNoDestino.size === 0) return 0;
    const vendidosSet = new Set(oldFile.vendidos);
    return unsoldRefs.filter(r =>
      !vendidosSet.has(r) &&
      (priceMap.get(r.toUpperCase())?.preco_avista ?? 0) > 0 &&
      refsJaNoDestino.has(r.toUpperCase()),
    ).length;
  }, [oldFile, unsoldRefs, priceMap, refsJaNoDestino]);

  // Peças que cabem mas ficam de fora por limite de capacidade
  const qtdForaCapacidade = useMemo(() => {
    if (!oldFile || vagasDestino >= 9999) return 0;
    const vendidosSet = new Set(oldFile.vendidos);
    const total = unsoldRefs.filter(r =>
      !vendidosSet.has(r) &&
      (priceMap.get(r.toUpperCase())?.preco_avista ?? 0) > 0 &&
      !refsJaNoDestino.has(r.toUpperCase()),
    ).length;
    return Math.max(0, total - vagasDestino);
  }, [oldFile, unsoldRefs, priceMap, refsJaNoDestino, vagasDestino]);

  function handleDownloadCadastrar() {
    if (pecasParaCadastrar.length === 0) return;
    downloadCsv(
      generateCsvCadastrar(pecasParaCadastrar, startLote),
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
    <div className="flex flex-col gap-3">

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
                  .filter(l => l.codigoPlatforma && l.status !== 'finalizado')
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">

        {/* ① Cadastrar Peças Novas */}
        <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-visible self-start">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-t-xl border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/40">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold shrink-0">1</span>
            <div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Cadastrar Peças Novas</p>
              <p className="text-[10px] text-zinc-400 leading-tight">Peças da Base Sistema ainda fora dos leilões ativos</p>
            </div>
            {newPieces.length > 0 && <CheckCircle2 size={13} className="text-emerald-500 ml-auto shrink-0" />}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-3 p-3">
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
            {/* Stat + inputs */}
            <div className="flex items-center gap-4">
              <Stat value={newPieces.length} label="peças disponíveis" color="indigo" />
              <div className="w-px h-8 bg-zinc-100 dark:bg-white/[0.06]" />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Lote inicial{fetchingStartLote ? ' …' : ''}
                </label>
                <div className="flex items-center gap-2">
                  {fetchingStartLote ? (
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  ) : (
                    <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
                      {startLote}
                    </span>
                  )}
                  {!fetchingStartLote && pecasParaCadastrar.length > 0 && (
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                      até {startLote + pecasParaCadastrar.length - 1}
                      {' · '}D{startLote <= 200 ? '1' : startLote <= 400 ? '2' : '3'}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-px h-8 bg-zinc-100 dark:bg-white/[0.06]" />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Quantidade</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1} max={newPieces.length}
                    value={limitQtd}
                    placeholder={String(newPieces.length)}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '') { setLimitQtd(''); return; }
                      const n = Math.min(Math.max(1, Number(v)), newPieces.length);
                      setLimitQtd(n);
                    }}
                    className="w-16 pl-2 pr-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap">de {newPieces.length}</span>
                </div>
              </div>
            </div>

            {/* Botões CSV + Executar */}
            <div className="flex gap-2">
              <button
                onClick={handleDownloadCadastrar}
                disabled={pecasParaCadastrar.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
              >
                <Download size={12} />
                CSV
              </button>
              <button
                onClick={openCadastrar}
                disabled={pecasParaCadastrar.length === 0 || !novoLeilao || !novoLeilaoSel}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors"
              >
                <Zap size={12} />
                {pecasParaCadastrar.length > 0 ? `Executar (${pecasParaCadastrar.length})` : 'Executar'}
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
          pecas={buildPecasParaCadastrar(pecasParaCadastrar, startLote)}
          leilaoNome={novoLeilaoSel?.nome}
          codigoPlatforma={novoLeilao || undefined}
          onClose={closeCadastrar}
          isRunning={cadastrarRunning}
          onExecute={(selected) => {
            if (!novoLeilao || !novoLeilaoSel || selected.length === 0) return;
            const destExcluidos = new Set(regras.map(r => r.destino.toLowerCase()));
            const refDest = new Map(basePieces.map(p => [p.referencia.toUpperCase(), p.destino ?? '']));
            executeCadastrar({
              codigoPlatforma: novoLeilao,
              nome:            novoLeilaoSel.nome,
              pecas: selected.map(p => ({
                ...p,
                ativarSite: !destExcluidos.has((refDest.get(p.referencia.toUpperCase()) ?? '').toLowerCase()),
              })),
            });
          }}
        />

        {/* ② Transferir do Leilão Anterior */}
        <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-visible">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-t-xl border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/40">
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

          <div className="flex flex-col gap-3 p-3">
            {oldFile ? (
              <>
                {/* Stats + Lote inicial */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Stat value={oldRefs.length} label="total" />
                    <div className="w-px h-8 bg-zinc-100 dark:bg-white/[0.06]" />
                    <Stat value={oldFile.vendidos.length} label="vendidas" color="emerald" />
                    <div className="w-px h-8 bg-zinc-100 dark:bg-white/[0.06]" />
                    <Stat value={fetchingUltimoLote ? eligibleCount : pecasParaTransferir.length} label="a transferir" color="violet" />
                  </div>
                  <div className="w-px h-8 bg-zinc-100 dark:bg-white/[0.06]" />
                  <div className="flex flex-col gap-1 shrink-0">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      Lote inicial{fetchingUltimoLote ? ' …' : ''}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={1}
                        value={transferStartLote}
                        disabled={fetchingUltimoLote}
                        onChange={e => setTransferStartLote(Math.max(1, Number(e.target.value)))}
                        className="w-16 pl-2 pr-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-violet-400 transition-colors disabled:opacity-50"
                      />
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                        até {transferStartLote + pecasParaTransferir.length - 1}
                      </span>
                    </div>
                  </div>
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

                {/* ── Linha de avisos + verificação (não empurra os botões) ── */}
                <div className="flex flex-col gap-1.5">

                  {/* Excluídas — linha compacta com CSV inline */}
                  {excluded.total > 0 && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                      <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex-1 min-w-0 truncate">
                        {excluded.total} excluída{excluded.total > 1 ? 's' : ''}
                        {excluded.foraBase > 0 && ` · ${excluded.foraBase} fora da base`}
                        {excluded.destinoExcluido > 0 && ` · ${excluded.destinoExcluido} destino exclusivo`}
                      </span>
                      <button
                        disabled={loadingExcluidas}
                        onClick={async () => {
                          setLoadingExcluidas(true);
                          try {
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
                        className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-60 text-amber-700 dark:text-amber-400 text-[10px] font-semibold transition-colors"
                      >
                        <Download size={10} />
                        {loadingExcluidas ? '...' : 'CSV'}
                      </button>
                    </div>
                  )}

                  {/* Limite TOP — linha compacta */}
                  {!fetchingUltimoLote && isDestinoTop && qtdForaCapacidade > 0 && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40">
                      <AlertTriangle size={11} className="text-orange-500 shrink-0" />
                      <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-400">
                        {qtdForaCapacidade} fora do limite TOP · destino tem {countPecasDestino}, cabem {vagasDestino}
                      </span>
                    </div>
                  )}

                  {/* Verificar duplicatas / progresso / resultado */}
                  {fetchingUltimoLote && novoLeilao && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-white/[0.06]">
                      <div className="w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin shrink-0" />
                      <span className="text-[10px] text-zinc-400">Lendo leilão destino...</span>
                    </div>
                  )}

                  {!fetchingUltimoLote && novoLeilao && novoLeilaoSel && verificarState.status === 'idle' && (
                    <button
                      onClick={() => {
                        const refs = unsoldRefs.filter(r => {
                          const row = priceMap.get(r.toUpperCase());
                          return row && (row.preco_avista ?? 0) > 0;
                        });
                        verificarRefs({ nome: novoLeilaoSel.nome, leilao: novoLeilao, refs });
                      }}
                      className="self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-400 text-[10px] font-semibold transition-colors"
                    >
                      <CheckCircle2 size={11} />
                      Verificar duplicatas no destino
                    </button>
                  )}

                  {verificarState.status === 'running' && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40">
                      <div className="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0" />
                      <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 flex-1">Verificando...</span>
                      <span className="text-[10px] text-sky-500 tabular-nums shrink-0">{verificarState.done}/{verificarState.total}</span>
                      <div className="w-16 h-1.5 rounded-full bg-sky-200 dark:bg-sky-900 overflow-hidden shrink-0">
                        <div className="h-full rounded-full bg-sky-500 transition-all duration-300"
                          style={{ width: `${verificarState.total > 0 ? Math.round(verificarState.done / verificarState.total * 100) : 0}%` }} />
                      </div>
                    </div>
                  )}

                  {verificarState.status === 'done' && (
                    qtdJaTransferidas > 0 ? (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40">
                        <CheckCircle2 size={11} className="text-sky-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 flex-1">
                          {qtdJaTransferidas} já no destino — removidas · {pecasParaTransferir.length} restam
                        </span>
                        <button onClick={resetVerificar} className="text-[10px] text-sky-400 hover:text-sky-600 shrink-0">refazer</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex-1">
                          Nenhuma duplicata — {pecasParaTransferir.length} peças OK
                        </span>
                        <button onClick={resetVerificar} className="text-[10px] text-emerald-400 hover:text-emerald-600 shrink-0">refazer</button>
                      </div>
                    )
                  )}

                  {verificarState.status === 'error' && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40">
                      <AlertTriangle size={11} className="text-red-500 shrink-0" />
                      <span className="text-[10px] text-red-600 dark:text-red-400 flex-1 truncate">{verificarState.fatalError}</span>
                      <button onClick={resetVerificar} className="text-[10px] text-red-400 hover:text-red-600 shrink-0">retry</button>
                    </div>
                  )}

                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-400 text-center py-4">Selecione o leilão anterior</p>
            )}

            {/* Botões CSV + Executar */}
            <div className="flex gap-2">
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
        onExecute={(selected) => {
          if (!novoLeilao || !novoLeilaoSel || !selectedOld || selected.length === 0) return;
          executeTransferir({
            nome:          novoLeilaoSel.nome,
            leilaoOrigem:  selectedOld,
            leilaoDestino: novoLeilao,
            startLote:     transferStartLote,
            pecas:         selected,
          });
        }}
      />

    </div>
  );
}
