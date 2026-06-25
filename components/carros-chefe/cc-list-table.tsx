'use client';

import React from 'react';
import { Pencil, Trash2, Star } from 'lucide-react';
import { type CarroChefeDef, deleteCarroChefeAction } from '@/lib/actions/carros-chefe';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { useState } from 'react';

function Tag({ text }: { text: string }) {
  if (!text) return <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>;
  return (
    <span className="text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
      {text}
    </span>
  );
}

interface CcListTableProps {
  defs: CarroChefeDef[];
  onEdit: (def: CarroChefeDef) => void;
}

export function CcListTable({ defs, onEdit }: CcListTableProps) {
  const sorted = [...defs].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  const [pendingDelete, setPendingDelete] = useState<CarroChefeDef | null>(null);

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
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-8">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nome</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tipo de Joia</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Subtipo</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pedra</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Lapidação</th>
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
                    <td className="px-4 py-3 text-center"><Tag text={def.produto} /></td>
                    <td className="px-4 py-3 text-center"><Tag text={def.subtipo} /></td>
                    <td className="px-4 py-3 text-center"><Tag text={def.tipo_pedra} /></td>
                    <td className="px-4 py-3 text-center"><Tag text={def.lapidacao} /></td>
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
