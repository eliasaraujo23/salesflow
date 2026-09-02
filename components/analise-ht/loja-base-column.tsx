'use client';

import { X } from 'lucide-react';
import type { LojaBaseItem } from '@/lib/hooks/use-analise-ht-loja-base';

interface Props {
  loja: string;
  cor: string;
  itens: LojaBaseItem[];
  isDragOver: boolean;
  draggingId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragStart: (item: LojaBaseItem) => void;
  onDragEnd: () => void;
  onRemove: (id: string) => void;
}

export function LojaBaseColumn({
  loja, cor, itens, isDragOver, draggingId,
  onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd, onRemove,
}: Props) {
  return (
    <div
      className="flex flex-col min-w-[150px] flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.10] rounded-xl overflow-hidden"
      style={{ borderTopColor: cor, borderTopWidth: 3 }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cor }}>{loja}</span>
        </div>
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
          {itens.length}
        </span>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); onDragOver(e); }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="flex flex-col gap-2 flex-1 min-h-[200px] p-2 border-2 border-dashed rounded-b-xl transition-all duration-150"
        style={isDragOver ? { borderColor: cor, backgroundColor: `${cor}0f` } : { borderColor: 'transparent' }}
      >
        {itens.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={() => onDragStart(item)}
            onDragEnd={onDragEnd}
            className={`group flex items-center justify-between gap-2 pl-2.5 pr-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] border-l-[3px] text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-grab active:cursor-grabbing shadow-sm transition-opacity ${
              draggingId === item.id ? 'opacity-40' : ''
            }`}
            style={{ borderLeftColor: cor }}
          >
            <span className="truncate">{item.avaliador}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
              title="Remover"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {itens.length === 0 && (
          <div
            className="flex items-center justify-center flex-1 text-[11px] transition-colors text-zinc-300 dark:text-zinc-700"
            style={isDragOver ? { color: cor, fontWeight: 500 } : undefined}
          >
            {isDragOver ? '↓ Soltar aqui' : 'Ninguém aqui'}
          </div>
        )}
      </div>
    </div>
  );
}
