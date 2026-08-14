'use client';

import { useState, useMemo, useRef } from 'react';
import { Download, ChevronDown, AlertTriangle, CheckCircle2, Info, Zap, Trash2, Loader2, XCircle } from 'lucide-react';
import type { LeilaoBaseRow } from '@/lib/hooks/use-leilao-base';
import type { UploadedFileStored } from '@/lib/hooks/use-leilao-bases-storage';
import {
  generateCsvUploadImagens,
  generateCsvAtualizarPreco,
  countRefsWithPrice,
  downloadCsv,
  type ImageKeysRow,
} from '@/lib/leilao-csv';
import { fetchImageKeys } from '@/lib/actions/fetch-image-keys';
import { useAtualizarPreco } from '@/lib/hooks/use-atualizar-preco';
import { AtualizarPrecoModal } from '@/components/leilao/atualizar-preco-modal';

interface Props {
  basePieces:    LeilaoBaseRow[];
  uploadedFiles: UploadedFileStored[];
  refsPerFile:   Map<string, string[]>;
}

function BaseSelect({
  value, onChange, uploadedFiles,
}: {
  value: string;
  onChange: (v: string) => void;
  uploadedFiles: UploadedFileStored[];
}) {
  const [open, setOpen] = useState(false);
  const selected = uploadedFiles.find(f => f.filename === value);
  const sorted = [...uploadedFiles].sort((a, b) => Number(a.codigoPlatforma ?? 0) - Number(b.codigoPlatforma ?? 0));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full flex items-center gap-2 pl-3 pr-8 py-2 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-left focus:outline-none focus:border-indigo-400 transition-colors"
      >
        {selected ? (
          <>
            {selected.leilao && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: selected.leilao.cor }} />
            )}
            <span className="font-bold text-zinc-700 dark:text-zinc-200 tabular-nums shrink-0">N°{selected.codigoPlatforma ?? '—'}</span>
            {selected.leilao && <>
              <span className="text-zinc-400">·</span>
              <span className="font-semibold text-zinc-500 tabular-nums shrink-0">#{selected.leilao.numero}</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600 dark:text-zinc-400 truncate">{selected.leilao.nome}</span>
            </>}
            <span className="ml-auto text-zinc-400 shrink-0">{selected.count} peças</span>
          </>
        ) : (
          <span className="text-zinc-400">— Selecionar base —</span>
        )}
      </button>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />

      {open && (
        <div className="absolute top-full mt-1 w-full z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.10] rounded-lg shadow-lg overflow-visible">
          <button
            type="button"
            onMouseDown={() => { onChange(''); setOpen(false); }}
            className="w-full px-3 py-2.5 text-left text-xs text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            — Selecionar base —
          </button>
          {sorted.map(f => (
            <button
              key={f.filename}
              type="button"
              onMouseDown={() => { onChange(f.filename); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            >
              {f.leilao && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.leilao.cor }} />}
              <span className="font-bold text-zinc-700 dark:text-zinc-200 tabular-nums shrink-0">N°{f.codigoPlatforma ?? '—'}</span>
              {f.leilao && <>
                <span className="text-zinc-400">·</span>
                <span className="font-semibold text-zinc-500 tabular-nums shrink-0">#{f.leilao.numero}</span>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-600 dark:text-zinc-400 truncate">{f.leilao.nome}</span>
              </>}
              <span className="ml-auto text-zinc-400 shrink-0">{f.count} peças</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type DupPhase = 'idle' | 'scanning' | 'scanned' | 'running' | 'done' | 'error';
interface DupState {
  phase:      DupPhase;
  totalPecas: number;
  duplicatas: number;
  done:       number;
  total:      number;
  removed:    number;
  errors:     number;
  statusMsg:  string;
  fatalError: string;
}
const DUP_INIT: DupState = { phase: 'idle', totalPecas: 0, duplicatas: 0, done: 0, total: 0, removed: 0, errors: 0, statusMsg: '', fatalError: '' };

type ZerarPhase = 'idle' | 'confirm' | 'running' | 'done' | 'error';
interface ZerarState { phase: ZerarPhase; done: number; total: number; removed: number; errors: number; statusMsg: string; fatalError: string; }
const ZERAR_INIT: ZerarState = { phase: 'idle', done: 0, total: 0, removed: 0, errors: 0, statusMsg: '', fatalError: '' };

function useZerarLeilao() {
  const [state, setState] = useState<ZerarState>(ZERAR_INIT);

  async function zerar(leilao: string, nome: string) {
    setState(s => ({ ...s, phase: 'running', done: 0, total: 0, removed: 0, errors: 0, statusMsg: '' }));
    try {
      const res = await fetch('/api/leilao/remover-duplicatas', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ leilao, nome }),
      });
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const event = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
          if (event.type === 'status')   setState(s => ({ ...s, statusMsg: event.message as string }));
          if (event.type === 'start')    setState(s => ({ ...s, total: event.total as number }));
          if (event.type === 'progress') setState(s => ({ ...s, done: event.done as number, removed: s.removed + (event.success ? 1 : 0), errors: s.errors + (!event.success ? 1 : 0) }));
          if (event.type === 'done')     setState(s => ({ ...s, phase: 'done', removed: event.removed as number, errors: event.errors as number, statusMsg: '' }));
          if (event.type === 'error')    setState(s => ({ ...s, phase: 'error', fatalError: event.message as string }));
        }
      }
    } catch (e) {
      setState(s => ({ ...s, phase: 'error', fatalError: e instanceof Error ? e.message : 'Erro' }));
    }
  }

  function confirm() { setState(s => ({ ...s, phase: 'confirm' })); }
  function reset()   { setState(ZERAR_INIT); }
  return { state, confirm, zerar, reset };
}

function useDuplicatas() {
  const [state, setState] = useState<DupState>(DUP_INIT);

  async function scan(leilao: string, nome: string) {
    setState({ ...DUP_INIT, phase: 'scanning' });
    try {
      const res  = await fetch(`/api/leilao/remover-duplicatas?leilao=${leilao}&nome=${encodeURIComponent(nome)}`);
      const data = await res.json() as { totalPecas?: number; totalDuplicatas?: number; error?: string };
      if (data.error) { setState(s => ({ ...s, phase: 'error', fatalError: data.error! })); return; }
      setState(s => ({ ...s, phase: 'scanned', totalPecas: data.totalPecas ?? 0, duplicatas: data.totalDuplicatas ?? 0 }));
    } catch (e) {
      setState(s => ({ ...s, phase: 'error', fatalError: e instanceof Error ? e.message : 'Erro' }));
    }
  }

  const abortRef = useRef<(() => void) | null>(null);

  async function remover(leilao: string, nome: string) {
    setState(s => ({ ...s, phase: 'running', done: 0, total: s.duplicatas, removed: 0, errors: 0, statusMsg: '' }));
    try {
      const res = await fetch('/api/leilao/remover-duplicatas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ leilao, nome }),
      });
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      abortRef.current = () => reader.cancel();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const event = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
          if (event.type === 'status')   setState(s => ({ ...s, statusMsg: event.message as string }));
          if (event.type === 'start')    setState(s => ({ ...s, total: event.total as number }));
          if (event.type === 'progress') setState(s => ({ ...s, done: event.done as number, removed: s.removed + (event.success ? 1 : 0), errors: s.errors + (!event.success ? 1 : 0) }));
          if (event.type === 'done')     setState(s => ({ ...s, phase: 'done', removed: event.removed as number, errors: event.errors as number, statusMsg: '' }));
          if (event.type === 'error')    setState(s => ({ ...s, phase: 'error', fatalError: event.message as string }));
        }
      }
    } catch (e) {
      setState(s => ({ ...s, phase: 'error', fatalError: e instanceof Error ? e.message : 'Erro' }));
    } finally {
      abortRef.current = null;
    }
  }

  function reset() { setState(DUP_INIT); }
  return { state, scan, remover, reset };
}

export function RoboOperacoes({ basePieces, uploadedFiles, refsPerFile }: Props) {
  const [imgBase,       setImgBase]       = useState('');
  const [loadingImagem, setLoadingImagem] = useState(false);
  const [precoBase,     setPrecoBase]     = useState('');
  const [dupBase,       setDupBase]       = useState('');
  const [zerarBase,     setZerarBase]     = useState('');
  const { open, openModal, closeModal, state, execute, isRunning } = useAtualizarPreco();
  const { state: dupState, scan: dupScan, remover: dupRemover, reset: dupReset } = useDuplicatas();
  const { state: zerarState, confirm: zerarConfirm, zerar, reset: zerarReset } = useZerarLeilao();

  const priceMap = useMemo(
    () => new Map<string, LeilaoBaseRow>(basePieces.map(p => [p.referencia.toUpperCase(), p])),
    [basePieces],
  );

  async function handleUploadImagens() {
    const refs = refsPerFile.get(imgBase) ?? [];
    if (refs.length === 0) return;
    setLoadingImagem(true);
    try {
      const file    = uploadedFiles.find(f => f.filename === imgBase);
      const num     = file?.codigoPlatforma ?? 'base';
      const rows    = await fetchImageKeys(refs);
      const keyMap  = new Map<string, ImageKeysRow>(
        rows.map(r => [r.mini_descricao.toUpperCase(), r])
      );
      downloadCsv(generateCsvUploadImagens(refs, keyMap), `upload_imagens_${num}.csv`);
    } finally {
      setLoadingImagem(false);
    }
  }

  const precoFile = uploadedFiles.find(f => f.filename === precoBase);
  const precoRefs = refsPerFile.get(precoBase) ?? [];

  // Compute price diffs: null = unknown (old upload with no pricePerRef data)
  // leilaoPrice = preço atual no leilão (do CSV exportado)
  // sistemaPrice = preço atual no sistema (o que deve ser atualizado)
  const priceDiffs = useMemo((): Array<{ ref: string; leilaoPrice: number; sistemaPrice: number }> | null => {
    if (!precoFile) return null;
    const ppr = precoFile.pricePerRef;
    if (Object.keys(ppr).length === 0) return null;
    const vendidosSet = new Set(precoFile.vendidos.map(v => v.toUpperCase()));
    const diffs: Array<{ ref: string; leilaoPrice: number; sistemaPrice: number }> = [];
    for (const ref of precoRefs) {
      const refUpper    = ref.toUpperCase();
      if (vendidosSet.has(refUpper)) continue;
      const systemRow   = priceMap.get(refUpper);
      const leilaoPrice = ppr[refUpper] ?? ppr[ref];
      if (systemRow && leilaoPrice !== undefined) {
        const sistemaPrice = systemRow.preco_avista ?? 0;
        if (Math.round(leilaoPrice) !== Math.round(sistemaPrice)) {
          diffs.push({ ref, leilaoPrice, sistemaPrice });
        }
      }
    }
    return diffs;
  }, [precoFile, precoRefs, priceMap]);

  function handleAtualizarPreco() {
    if (precoRefs.length === 0) return;
    const num  = precoFile?.codigoPlatforma ?? 'base';
    // Com diff: baixa só as divergentes. Sem diff data (null): baixa tudo.
    const refs = (priceDiffs && priceDiffs.length > 0) ? priceDiffs.map(d => d.ref) : precoRefs;
    downloadCsv(generateCsvAtualizarPreco(refs, priceMap), `atualizar_preco_${num}.csv`);
  }

  const imgRefs       = refsPerFile.get(imgBase) ?? [];
  const precoWithPrice = useMemo(
    () => countRefsWithPrice(precoRefs, priceMap),
    [precoRefs, priceMap],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* Upload Imagens */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-visible">
        <div className="px-4 py-3 rounded-t-xl bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-white/[0.06]">
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Upload Imagens</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">Gera lista de referências — imagens buscadas pelo banco</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <BaseSelect value={imgBase} onChange={setImgBase} uploadedFiles={uploadedFiles} />
          <button
            onClick={handleUploadImagens}
            disabled={!imgBase || imgRefs.length === 0 || loadingImagem}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors"
          >
            <Download size={13} />
            {loadingImagem
              ? 'Buscando imagens...'
              : `Baixar CSV — Upload Imagens${imgRefs.length > 0 ? ` (${imgRefs.length})` : ''}`
            }
          </button>
        </div>
      </div>

      {/* Atualizar Preço */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-visible">
        <div className="px-4 py-3 rounded-t-xl bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-white/[0.06]">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Atualizar Preço</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">Atualiza preço contratado com o valor à vista do sistema</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <BaseSelect value={precoBase} onChange={setPrecoBase} uploadedFiles={uploadedFiles} />

          {/* Price diff info block */}
          {precoBase && (
            priceDiffs === null ? (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-white/[0.06]">
                <Info size={13} className="text-zinc-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Re-faça o upload para ver diff de preços</span>
              </div>
            ) : priceDiffs.length === 0 ? (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Todos os preços estão atualizados</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  {priceDiffs.length} peça{priceDiffs.length > 1 ? 's' : ''} com preço diferente
                </span>
              </div>
            )
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAtualizarPreco}
              disabled={!precoBase || precoWithPrice === 0 || priceDiffs?.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
            >
              <Download size={12} />
              CSV
            </button>
            <button
              onClick={() => {
                if (priceDiffs && priceDiffs.length > 0) {
                  openModal();
                }
              }}
              disabled={!precoBase || !priceDiffs || priceDiffs.length === 0 || !precoFile?.codigoPlatforma}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors"
            >
              <Zap size={12} />
              {priceDiffs && priceDiffs.length > 0
                ? `Executar (${priceDiffs.length})`
                : 'Executar'}
            </button>
          </div>

          <AtualizarPrecoModal
            open={open}
            state={state}
            pecas={priceDiffs ?? []}
            leilaoNome={precoFile?.leilao?.nome}
            codigoPlatforma={precoFile?.codigoPlatforma ?? undefined}
            onClose={closeModal}
            isRunning={isRunning}
            onExecute={(selected) => {
              if (!precoFile?.codigoPlatforma || !precoFile?.leilao?.nome || !selected.length) return;
              execute({
                codigoPlatforma: precoFile.codigoPlatforma,
                nome:            precoFile.leilao.nome,
                pecas:           selected,
              });
            }}
          />
        </div>
      </div>

      {/* Remover Duplicatas */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-visible sm:col-span-2">
        <div className="px-4 py-3 rounded-t-xl bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-white/[0.06]">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">Remover Duplicatas</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">Detecta e remove peças com a mesma REF no leilão, mantendo a de menor lote</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <BaseSelect
                value={dupBase}
                onChange={v => { setDupBase(v); dupReset(); }}
                uploadedFiles={uploadedFiles}
              />
            </div>
            {(() => {
              const dupFile    = uploadedFiles.find(f => f.filename === dupBase);
              const leilao     = dupFile?.codigoPlatforma ?? '';
              const nome       = dupFile?.leilao?.nome ?? '';
              const isRunningDup = dupState.phase === 'scanning' || dupState.phase === 'running';

              return (
                <button
                  onClick={() => {
                    if (!leilao || !nome) return;
                    if (dupState.phase === 'idle' || dupState.phase === 'error') dupScan(leilao, nome);
                    else if (dupState.phase === 'scanned' && dupState.duplicatas > 0) dupRemover(leilao, nome);
                    else dupReset();
                  }}
                  disabled={!dupBase || isRunningDup}
                  className={[
                    'shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                    dupState.phase === 'scanned' && dupState.duplicatas > 0
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]',
                  ].join(' ')}
                >
                  {isRunningDup
                    ? <Loader2 size={12} className="animate-spin" />
                    : dupState.phase === 'scanned' && dupState.duplicatas > 0
                      ? <Trash2 size={12} />
                      : <Zap size={12} />}
                  {dupState.phase === 'idle'    && 'Escanear'}
                  {dupState.phase === 'scanning' && 'Escaneando...'}
                  {dupState.phase === 'scanned' && dupState.duplicatas === 0 && 'Escanear novamente'}
                  {dupState.phase === 'scanned' && dupState.duplicatas > 0  && `Remover ${dupState.duplicatas} duplicata${dupState.duplicatas > 1 ? 's' : ''}`}
                  {dupState.phase === 'running' && 'Removendo...'}
                  {dupState.phase === 'done'    && 'Escanear novamente'}
                  {dupState.phase === 'error'   && 'Tentar novamente'}
                </button>
              );
            })()}
          </div>

          {dupState.phase === 'scanned' && dupState.duplicatas === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              <span>Nenhuma duplicata — {dupState.totalPecas} peças únicas no leilão</span>
            </div>
          )}
          {dupState.phase === 'scanned' && dupState.duplicatas > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle size={13} />
              <span>{dupState.duplicatas} cópia{dupState.duplicatas > 1 ? 's' : ''} para remover · {dupState.totalPecas} peças no leilão</span>
            </div>
          )}

          {dupState.phase === 'running' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <div className="flex items-center gap-2">
                  <Loader2 size={11} className="animate-spin shrink-0 text-red-500" />
                  <span>{dupState.statusMsg || `Removendo: ${dupState.done} de ${dupState.total}`}</span>
                </div>
                <span className="tabular-nums font-semibold text-red-500">
                  {dupState.total > 0 ? Math.round(dupState.done / dupState.total * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-red-100 dark:bg-red-950 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-300"
                  style={{ width: `${dupState.total > 0 ? Math.round(dupState.done / dupState.total * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          {dupState.phase === 'done' && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              dupState.errors === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
            }`}>
              {dupState.errors === 0 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              <span>
                {dupState.removed} duplicata{dupState.removed !== 1 ? 's' : ''} removida{dupState.removed !== 1 ? 's' : ''}
                {dupState.errors > 0 && ` · ${dupState.errors} com erro`}
              </span>
            </div>
          )}

          {dupState.phase === 'error' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
              <XCircle size={13} />
              <span>{dupState.fatalError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Zerar Leilão */}
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 overflow-visible sm:col-span-2">
        <div className="px-4 py-3 rounded-t-xl bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/40">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400">Zerar Leilão</span>
          <p className="text-[10px] text-red-500 dark:text-red-500 mt-0.5">Remove <strong>todas</strong> as peças do leilão selecionado. Use para recomeçar do zero.</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <BaseSelect
                value={zerarBase}
                onChange={v => { setZerarBase(v); zerarReset(); }}
                uploadedFiles={uploadedFiles}
              />
            </div>
            {(() => {
              const zerarFile    = uploadedFiles.find(f => f.filename === zerarBase);
              const leilao       = zerarFile?.codigoPlatforma ?? '';
              const nome         = zerarFile?.leilao?.nome ?? '';
              const isRunningZerar = zerarState.phase === 'running';

              if (zerarState.phase === 'confirm') {
                return (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => zerarReset()}
                      className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => zerar(leilao, nome)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Trash2 size={12} />
                      Confirmar — zerar N°{leilao}
                    </button>
                  </div>
                );
              }

              return (
                <button
                  onClick={() => {
                    if (!leilao || !nome) return;
                    if (zerarState.phase === 'idle' || zerarState.phase === 'error') zerarConfirm();
                    else zerarReset();
                  }}
                  disabled={!zerarBase || isRunningZerar}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
                >
                  {isRunningZerar ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {zerarState.phase === 'idle'    && 'Zerar leilão'}
                  {zerarState.phase === 'running' && 'Zerando...'}
                  {zerarState.phase === 'done'    && 'Zerar novamente'}
                  {zerarState.phase === 'error'   && 'Tentar novamente'}
                </button>
              );
            })()}
          </div>

          {zerarState.phase === 'confirm' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs font-semibold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40">
              <AlertTriangle size={13} className="shrink-0" />
              <span>Isso vai remover <strong>todas</strong> as peças do leilão. Confirme clicando no botão acima.</span>
            </div>
          )}

          {zerarState.phase === 'running' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <div className="flex items-center gap-2">
                  <Loader2 size={11} className="animate-spin shrink-0 text-red-500" />
                  <span>{zerarState.statusMsg || `Removendo: ${zerarState.done} de ${zerarState.total}`}</span>
                </div>
                <span className="tabular-nums font-semibold text-red-500">
                  {zerarState.total > 0 ? Math.round(zerarState.done / zerarState.total * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-red-100 dark:bg-red-950 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-300"
                  style={{ width: `${zerarState.total > 0 ? Math.round(zerarState.done / zerarState.total * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          {zerarState.phase === 'done' && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              zerarState.errors === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
            }`}>
              {zerarState.errors === 0 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              <span>
                {zerarState.removed} peça{zerarState.removed !== 1 ? 's' : ''} removida{zerarState.removed !== 1 ? 's' : ''}
                {zerarState.errors > 0 && ` · ${zerarState.errors} com erro`}
              </span>
            </div>
          )}

          {zerarState.phase === 'error' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
              <XCircle size={13} />
              <span>{zerarState.fatalError}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
