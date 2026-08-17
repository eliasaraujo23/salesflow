'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

export interface SitePeca { pieceId: string; lote: number; }

interface Props {
  open:             boolean;
  pecas:            SitePeca[];
  leilaoNome?:      string;
  codigoPlatforma?: string;
  phase:            'idle' | 'scanning' | 'scanned' | 'running' | 'done' | 'error';
  done:             number;
  ok:               number;
  errors:           number;
  statusMsg:        string;
  fatalError:       string;
  pecaStatus:       Record<string, 'pending' | 'ok' | 'error'>;
  onClose:          () => void;
  onExecute:        (selected: SitePeca[]) => void;
}

export function AtivarSiteModal({
  open, pecas, leilaoNome, codigoPlatforma,
  phase, done, ok, errors, statusMsg, fatalError, pecaStatus,
  onClose, onExecute,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && phase === 'scanned') {
      setSelected(new Set(pecas.map(p => p.pieceId)));
    }
  }, [open, pecas, phase]);

  if (!open) return null;

  const isRunning  = phase === 'running';
  const isDone     = phase === 'done';
  const isError    = phase === 'error';
  const canExecute = phase === 'scanned';
  const total      = pecas.length;
  const pct        = total > 0 ? Math.round(done / total * 100) : 0;

  const allSelected  = total > 0 && selected.size === total;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pecas.map(p => p.pieceId)));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedPecas = pecas.filter(p => selected.has(p.pieceId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isRunning ? undefined : onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col" style={{ height: 'min(90vh, 600px)' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Ativar Site</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {leilaoNome && codigoPlatforma
                ? `${leilaoNome} · N°${codigoPlatforma} · ${total} peça${total !== 1 ? 's' : ''} com foto e Site desativado`
                : `${total} peça${total !== 1 ? 's' : ''} com foto e Site desativado`}
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
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-xs border-separate border-spacing-0 data-table">
            <thead>
              <tr>
                {canExecute && (
                  <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="cursor-pointer accent-emerald-600"
                    />
                  </th>
                )}
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500 w-8">#</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500">Lote</th>
                <th className="sticky top-0 z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-zinc-500 w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {pecas.map((p, i) => {
                const status     = pecaStatus[p.pieceId] ?? 'pending';
                const isSelected = selected.has(p.pieceId);
                return (
                  <tr
                    key={p.pieceId}
                    onClick={canExecute ? () => toggleOne(p.pieceId) : undefined}
                    className={[
                      canExecute ? 'cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10' : '',
                      status === 'ok'    ? 'bg-emerald-50/40 dark:bg-emerald-950/10' :
                      status === 'error' ? 'bg-red-50/40 dark:bg-red-950/10' :
                      isSelected        ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : '',
                    ].join(' ')}
                  >
                    {canExecute && (
                      <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(p.pieceId)}
                          onClick={e => e.stopPropagation()}
                          className="cursor-pointer accent-emerald-600"
                        />
                      </td>
                    )}
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] text-zinc-400 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] tabular-nums font-semibold text-zinc-700 dark:text-zinc-200">{p.lote}</td>
                    <td className="px-3 py-1.5 border-b border-zinc-100 dark:border-white/[0.04]">
                      {status === 'pending' && <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      {status === 'ok'    && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={11} /><span>Ativado</span></span>}
                      {status === 'error' && <span className="flex items-center gap-1 text-red-500"><XCircle size={11} /><span>Erro</span></span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-zinc-200 dark:border-white/[0.08] flex flex-col gap-3">
          {isRunning && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={10} className="animate-spin text-emerald-500" />
                  <span>{statusMsg || `${done} de ${total} peças`}</span>
                </span>
                <span className="tabular-nums font-semibold text-emerald-500">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {isDone && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${errors === 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'}`}>
              {errors === 0 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              <span>{ok} Site{ok !== 1 ? 's' : ''} ativado{ok !== 1 ? 's' : ''}{errors > 0 && ` · ${errors} com erro`}</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
              <XCircle size={13} />
              <span>{fatalError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isDone || isError ? 'Fechar' : 'Cancelar'}
            </button>
            {canExecute && (
              <button
                onClick={() => onExecute(selectedPecas)}
                disabled={selectedPecas.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 font-semibold transition-colors"
              >
                <CheckCircle2 size={12} />
                Ativar — {selectedPecas.length} peça{selectedPecas.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
