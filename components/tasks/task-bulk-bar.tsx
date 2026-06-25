'use client';

import React from 'react';
import { CheckCircle2, Trash2, X } from 'lucide-react';

interface TaskBulkBarProps {
  count: number;
  onComplete: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function TaskBulkBar({ count, onComplete, onDelete, onClear }: TaskBulkBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-zinc-900 dark:bg-zinc-800 border border-white/[0.12] rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
      <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap">
        {count} selecionada{count !== 1 ? 's' : ''}
      </span>
      <div className="w-px h-4 bg-white/[0.15]" />
      <button
        onClick={onComplete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[12px] font-semibold transition-colors"
      >
        <CheckCircle2 size={13} /> Concluir
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[12px] font-semibold transition-colors"
      >
        <Trash2 size={13} /> Excluir
      </button>
      <button
        onClick={onClear}
        className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Cancelar seleção"
      >
        <X size={14} />
      </button>
    </div>
  );
}
