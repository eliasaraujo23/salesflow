'use client';

import { useEffect, useRef } from 'react';
import { X, CheckCircle2, XCircle, Loader2, AlertTriangle, FileDown, ArrowRightLeft } from 'lucide-react';
import type { PecaTransferencia, TransferirPecasState } from '@/lib/hooks/use-transferir-pecas';

interface Props {
  open:          boolean;
  state:         TransferirPecasState;
  pecas:         PecaTransferencia[];
  startLote:     number;
  leilaoOrigem?: string;
  leilaoDestino?: string;
  onClose:       () => void;
  onExecute:     () => void;
  isRunning:     boolean;
}

function fmtPreco(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function downloadRelatorio(
  state:        TransferirPecasState,
  leilaoOrigem: string | undefined,
  leilaoDestino: string | undefined,
) {
  const now    = new Date().toLocaleString('pt-BR');
  const header = ['Novo Lote', 'REF', 'Preço (R$)', 'Status', 'Erro'];
  const rows   = state.pecas.map(p => {
    const status = p.status === 'ok'       ? 'Transferido'
                 : p.status === 'error'    ? 'Erro'
                 : p.status === 'notfound' ? 'Não encontrada'
                 : 'Não processado';
    return [p.lote, p.ref, status, p.error ?? ''];
  });

  const csv = [
    `# Relatório de Transferência de Peças`,
    `# De: N°${leilaoOrigem ?? ''} → Para: N°${leilaoDestino ?? ''}`,
    `# Gerado em: ${now}`,
    '',
    header.join(';'),
    ...rows.map(r => r.join(';')),
  ].join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `transferencia_N${leilaoOrigem}_para_${leilaoDestino}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TransferirPecasModal({
  open, state, pecas, startLote, leilaoOrigem, leilaoDestino, onClose, onExecute, isRunning,
}: Props) {
  const tbodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.phase !== 'running') return;
    const el = tbodyRef.current?.querySelector('[data-running="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [state.done, state.phase]);

  if (!open) return null;

  const isDone  = state.phase === 'done';
  const isError = state.phase === 'error';
  const isIdle  = state.phase === 'idle';

  const rows = isIdle
    ? pecas.map((p, i) => ({ ref: p.ref, lote: startLote + i, valor: p.valor, status: 'pending' as const, error: undefined }))
    : state.pecas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isRunning ? undefined : onClose}
      />

      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Transferir Peças</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {leilaoOrigem && leilaoDestino
                ? `N°${leilaoOrigem} → N°${leilaoDestino}`
                : 'Transferência direta na plataforma'}
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

        {/* Table */}
        <div ref={tbodyRef} className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-xs border-separate border-spacing-0 data-table">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500 w-16">Lote</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500">REF</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500 w-24">Preço</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500 w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isRunningRow = r.status === 'pending' && state.phase === 'running' && state.pecas.find(p => p.ref === r.ref && p.status === 'running');
                const currentStatus = state.phase === 'running'
                  ? (state.pecas.find(p => p.ref === r.ref)?.status ?? 'pending')
                  : r.status;
                const currentError = state.pecas.find(p => p.ref === r.ref)?.error ?? r.error;

                return (
                  <tr
                    key={`${r.ref}-${r.lote}`}
                    data-running={isRunningRow ? 'true' : undefined}
                    className={
                      currentStatus === 'ok'       ? 'bg-emerald-50/40 dark:bg-emerald-950/10' :
                      currentStatus === 'error'    ? 'bg-red-50/40 dark:bg-red-950/10' :
                      currentStatus === 'notfound' ? 'bg-amber-50/40 dark:bg-amber-950/10' :
                      currentStatus === 'running'  ? 'bg-violet-50 dark:bg-violet-950/30' :
                      ''
                    }
                  >
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] tabular-nums font-semibold text-zinc-500">
                      {r.lote}
                      {r.lote > 200 && <span className="ml-1 text-[9px] text-zinc-400">D2</span>}
                    </td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] font-mono font-semibold text-zinc-700 dark:text-zinc-200">{r.ref}</td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] tabular-nums font-semibold text-violet-600 dark:text-violet-400">
                      {'valor' in r ? fmtPreco((r as typeof pecas[0]).valor) : '—'}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04]">
                      {currentStatus === 'pending' && (
                        state.phase === 'running'
                          ? <Loader2 size={11} className="animate-spin text-zinc-300 mx-auto" />
                          : <span className="text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                      {currentStatus === 'running' && <Loader2 size={11} className="animate-spin text-violet-500 mx-auto" />}
                      {currentStatus === 'ok' && (
                        <span className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={11} /><span>OK</span>
                        </span>
                      )}
                      {currentStatus === 'notfound' && (
                        <span className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400" title={currentError}>
                          <AlertTriangle size={11} /><span>Não achada</span>
                        </span>
                      )}
                      {currentStatus === 'error' && (
                        <span className="flex items-center justify-center gap-1 text-red-500" title={currentError ?? ''}>
                          <XCircle size={11} /><span className="truncate max-w-[60px]">{currentError ?? 'Erro'}</span>
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

          {/* Status em progresso */}
          {state.phase === 'running' && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Loader2 size={11} className="animate-spin shrink-0 text-violet-500" />
                <span>Transferindo: {state.done} de {state.total}</span>
              </div>
              {state.statusMsg && (
                <p className="text-[10px] text-zinc-400 pl-5">{state.statusMsg}</p>
              )}
            </div>
          )}

          {/* Resultado final */}
          {isDone && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              state.errors === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
            }`}>
              {state.errors === 0 ? <CheckCircle2 size={13} className="mt-px shrink-0" /> : <AlertTriangle size={13} className="mt-px shrink-0" />}
              <span>
                {state.success} transferida{state.success !== 1 ? 's' : ''}
                {state.errors > 0 && ` · ${state.errors} com erro ou não encontrada`}
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

          {/* Preview count */}
          {isIdle && (
            <p className="text-[11px] text-zinc-400">
              {pecas.length} peça{pecas.length !== 1 ? 's' : ''} — lotes {startLote} a {startLote + pecas.length - 1}
              {startLote + pecas.length - 1 > 200 && ` (dias 1 e 2)`}
            </p>
          )}

          {/* Buttons */}
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
                onClick={() => downloadRelatorio(state, leilaoOrigem, leilaoDestino)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg border border-zinc-300 dark:border-white/[0.12] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.06] font-medium transition-colors"
              >
                <FileDown size={12} />
                Baixar Relatório
              </button>
            )}

            {isIdle && (
              <button
                onClick={onExecute}
                disabled={pecas.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 font-semibold transition-colors"
              >
                <ArrowRightLeft size={12} />
                Transferir {pecas.length} peça{pecas.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
