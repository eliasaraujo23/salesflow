'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Star, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { type CarroChefeDef, deleteCarroChefeAction } from '@/lib/actions/carros-chefe';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

type SortCol = 'order' | 'label';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ChevronsUpDown size={12} className="text-zinc-300 dark:text-zinc-600" />;
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-indigo-500" />
    : <ChevronDown size={12} className="text-indigo-500" />;
}

function Tag({ value }: { value: string }) {
  if (!value) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
  return (
    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
      {value}
    </span>
  );
}

interface CcListTableProps {
  defs: CarroChefeDef[];
  onEdit: (def: CarroChefeDef) => void;
}

export function CcListTable({ defs, onEdit }: CcListTableProps) {
  const [sortCol, setSortCol] = useState<SortCol>('order');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pendingDelete, setPendingDelete] = useState<CarroChefeDef | null>(null);

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  const sorted = [...defs].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortCol === 'order') return (a.order - b.order) * mul;
    return a.label.localeCompare(b.label, 'pt-BR') * mul;
  });

  const doDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCarroChefeAction(pendingDelete.id);
      toast.success('Carro-chefe removido');
    } catch {
      toast.error('Erro ao remover');
    }
    setPendingDelete(null);
  };

  const thCls = 'px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400';
  const thBtn = 'inline-flex items-center gap-1.5 cursor-pointer select-none hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors';

  return (
    <>
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={open => { if (!open) setPendingDelete(null); }}
        title="Remover carro-chefe"
        description={pendingDelete ? `Remover "${pendingDelete.label}"? Isso afeta o painel de parceiros e a tabela JF.` : ''}
        confirmLabel="Remover"
        onConfirm={doDelete}
      />

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
                <th className={`${thCls} w-12`}>
                  <span className={thBtn} onClick={() => toggleSort('order')}>
                    #
                    <SortIcon col="order" active={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th className={thCls}>
                  <span className={thBtn} onClick={() => toggleSort('label')}>
                    Nome
                    <SortIcon col="label" active={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th className={thCls}>Tipo de Joia</th>
                <th className={thCls}>Subtipo</th>
                <th className={thCls}>Pedra</th>
                <th className={thCls}>Lapidação</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {defs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    Nenhum carro-chefe cadastrado
                  </td>
                </tr>
              ) : (
                sorted.map(def => (
                  <tr key={def.id} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-zinc-400">{def.order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Star size={11} className="text-amber-400 shrink-0" />
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{def.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Tag value={def.produto} /></td>
                    <td className="px-4 py-3"><Tag value={def.subtipo} /></td>
                    <td className="px-4 py-3"><Tag value={def.tipo_pedra} /></td>
                    <td className="px-4 py-3"><Tag value={def.lapidacao} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => onEdit(def)}
                          className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setPendingDelete(def)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
