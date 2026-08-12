'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { X, CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, FileDown } from 'lucide-react';
import type { PecaDiff, AtualizarPrecoState } from '@/lib/hooks/use-atualizar-preco';

interface Props {
  open:             boolean;
  state:            AtualizarPrecoState;
  pecas:            PecaDiff[];
  leilaoNome?:      string;
  codigoPlatforma?: string;
  onClose:          () => void;
  onExecute:        (selected: PecaDiff[]) => void;
  isRunning:        boolean;
}

function fmtPreco(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function downloadRelatorio(
  pecas:           PecaDiff[],
  progList:        AtualizarPrecoState['pecas'],
  leilaoNome:      string | undefined,
  codigoPlatforma: string | undefined,
) {
  const now    = new Date().toLocaleString('pt-BR');
  const header = ['REF', 'Preço Anterior (R$)', 'Novo Preço (R$)', 'Status', 'Erro'];
  const rows   = pecas.map(p => {
    const prog   = progList.find(x => x.ref === p.ref);
    const status = prog?.status === 'ok' ? 'Atualizado' : prog?.status === 'error' ? 'Erro' : 'Não processado';
    return [p.ref, Math.round(p.leilaoPrice), Math.round(p.sistemaPrice), status, prog?.error ?? ''];
  });

  const csv = [
    `# Relatório de Atualização de Preço`,
    `# Leilão: ${leilaoNome ?? ''} · N°${codigoPlatforma ?? ''}`,
    `# Gerado em: ${now}`,
    '',
    header.join(';'),
    ...rows.map(r => r.join(';')),
  ].join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `atualizar_preco_${codigoPlatforma ?? 'leilao'}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AtualizarPrecoModal({
  open, state, pecas, leilaoNome, codigoPlatforma, onClose, onExecute, isRunning,
}: Props) {
  const tbodyRef = useRef<HTMLDivElement>(null);

  // Seleção — inicializa com todos selecionados quando o modal abre
  const [selected, setSelected] = useState<Set<string>>(() => new Set(pecas.map(p => p.ref)));

  // Reinicia seleção quando a lista de peças muda (novo modal)
  useEffect(() => {
    setSelected(new Set(pecas.map(p => p.ref)));
  }, [pecas]);

  const handleDownload = useCallback(() => {
    downloadRelatorio(pecas, state.pecas, leilaoNome, codigoPlatforma);
  }, [pecas, state.pecas, leilaoNome, codigoPlatforma]);

  // Scroll para manter a peça em processamento visível
  useEffect(() => {
    if (state.phase !== 'running') return;
    const el = tbodyRef.current?.querySelector('[data-status="running"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [state.done, state.phase]);

  if (!open) return null;

  const canSelect   = state.phase === 'idle';
  const allSelected = selected.size === pecas.length;
  const noneSelected = selected.size === 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pecas.map(p => p.ref)));
  }

  function toggleOne(ref: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(ref) ? next.delete(ref) : next.add(ref);
      return next;
    });
  }

  const pct     = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;
  const isDone  = state.phase === 'done';
  const isError = state.phase === 'error';
  const isMapping = state.phase === 'mapping';

  // Mescla diffs com status atual
  const rows = pecas.map(p => {
    const prog = state.pecas.find(x => x.ref === p.ref);
    return { ...p, status: prog?.status ?? 'pending', error: prog?.error };
  });

  const selectedPecas = pecas.filter(p => selected.has(p.ref));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isRunning ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Atualizar Preço no leiloes.br</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {leilaoNome && codigoPlatforma
                ? `${leilaoNome} · N°${codigoPlatforma}`
                : 'Atualização direta na plataforma'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabela */}
        <div ref={tbodyRef} className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-xs border-separate border-spacing-0 data-table">
            <thead>
              <tr>
                {/* Checkbox select-all */}
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] w-8">
                  {canSelect && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                    />
                  )}
                </th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500 w-8">#</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500">REF</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500">Preço Atual</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500">Novo Preço</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500 w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isChecked     = selected.has(r.ref);
                const isRunningSelf = state.phase === 'running' && r.status === 'pending' &&
                  state.pecas.filter(p => p.status === 'running').some(p => p.ref === r.ref);
                const effectiveStatus = isRunningSelf ? 'running' : r.status;
                const isSkipped = !isChecked && canSelect;

                return (
                  <tr
                    key={r.ref}
                    data-status={effectiveStatus}
                    onClick={canSelect ? () => toggleOne(r.ref) : undefined}
                    className={[
                      canSelect ? 'cursor-pointer select-none' : '',
                      isSkipped            ? 'opacity-40' :
                      effectiveStatus === 'running' ? 'bg-indigo-50 dark:bg-indigo-950/30' :
                      effectiveStatus === 'ok'      ? 'bg-emerald-50/40 dark:bg-emerald-950/10' :
                      effectiveStatus === 'error'   ? 'bg-red-50/40 dark:bg-red-950/10' :
                      canSelect && isChecked ? 'hover:bg-zinc-50 dark:hover:bg-white/[0.03]' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04]">
                      {canSelect && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(r.ref)}
                          onClick={e => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] text-zinc-400 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] font-mono font-semibold text-zinc-700 dark:text-zinc-200">{r.ref}</td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] tabular-nums text-zinc-500 line-through">{fmtPreco(r.leilaoPrice)}</td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{fmtPreco(r.sistemaPrice)}</td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04]">
                      {effectiveStatus === 'pending' && <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      {effectiveStatus === 'running' && (
                        <span className="flex items-center gap-1 text-indigo-500">
                          <Loader2 size={11} className="animate-spin" />
                          <span>Atualizando</span>
                        </span>
                      )}
                      {effectiveStatus === 'ok' && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={11} />
                          <span>OK</span>
                        </span>
                      )}
                      {effectiveStatus === 'error' && (
                        <span className="flex items-center gap-1 text-red-500" title={r.error ?? ''}>
                          <XCircle size={11} />
                          <span className="truncate max-w-[80px]">{r.error ?? 'Erro'}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-zinc-200 dark:border-white/[0.08] flex flex-col gap-3">

          {/* Contagem de selecionados (apenas no idle) */}
          {canSelect && (
            <p className="text-[11px] text-zinc-400">
              {selected.size === pecas.length
                ? `Todas as ${pecas.length} peças selecionadas`
                : selected.size === 0
                  ? 'Nenhuma peça selecionada'
                  : `${selected.size} de ${pecas.length} peças selecionadas`}
            </p>
          )}

          {/* Progress bar */}
          {(isMapping || state.phase === 'running') && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={10} className="animate-spin" />
                  {isMapping
                    ? state.mappingMsg
                    : `${state.done} de ${state.total} peças${state.chunkInfo ? ` · ${state.chunkInfo}` : ''}`}
                </span>
                {!isMapping && <span className="tabular-nums font-semibold">{pct}%</span>}
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${isMapping ? 0 : pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Resultado final */}
          {isDone && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              state.errorCount === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
            }`}>
              {state.errorCount === 0 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              <span>
                {state.successCount} atualizada{state.successCount !== 1 ? 's' : ''}
                {state.errorCount > 0 && ` · ${state.errorCount} com erro`}
              </span>
            </div>
          )}

          {/* Erro fatal */}
          {isError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
              <XCircle size={13} />
              <span>{state.fatalError}</span>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isDone || isError ? 'Fechar' : 'Cancelar'}
            </button>

            {(isDone || isError) && state.pecas.length > 0 && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg border border-zinc-300 dark:border-white/[0.12] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.06] font-medium transition-colors"
              >
                <FileDown size={12} />
                Baixar Relatório
              </button>
            )}

            {state.phase === 'idle' && (
              <button
                onClick={() => onExecute(selectedPecas)}
                disabled={noneSelected}
                className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 font-semibold transition-colors"
              >
                <RefreshCw size={12} />
                Executar {selected.size} atualização{selected.size !== 1 ? 'ões' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
