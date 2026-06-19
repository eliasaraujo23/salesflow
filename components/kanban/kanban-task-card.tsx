'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { type Task } from '@/components/firebase-provider';

const PRIORITY_BORDER: Record<string, string> = {
  urgente: 'border-l-red-500',
  alta: 'border-l-amber-500',
  media: 'border-l-indigo-500',
  baixa: 'border-l-emerald-500',
};

interface KanbanTaskCardProps {
  task: Task;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

export function KanbanTaskCard({ task, canMoveLeft, canMoveRight, onMoveLeft, onMoveRight }: KanbanTaskCardProps) {
  const borderColor = PRIORITY_BORDER[task.priority] ?? 'border-l-zinc-300 dark:border-l-white/[0.10]';

  return (
    <div
      className={`border-l-4 ${borderColor} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-r-lg p-3 group hover:border-indigo-500/30 transition-colors`}
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug mb-2">{task.title}</p>
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{task.person}</span>
          {task.due && task.due !== 'Sem prazo' && (
            <span className={`text-xs flex items-center gap-1 ${task.late > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
              <Clock size={10} />
              {task.due}
              {task.late > 0 && ` (${task.late}d)`}
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canMoveLeft && (
            <button
              onClick={onMoveLeft}
              className="p-1 rounded bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title="Mover para a esquerda"
            >
              <ArrowLeft size={12} />
            </button>
          )}
          {canMoveRight && (
            <button
              onClick={onMoveRight}
              className="p-1 rounded bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title="Mover para a direita"
            >
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
