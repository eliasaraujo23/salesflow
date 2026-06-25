'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import type { Task } from '@/components/firebase-provider';

const PRIO_CLS: Record<string, string> = {
  urgente: 'bg-red-500/15 text-red-500 border border-red-500/30',
  alta:    'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  media:   'bg-indigo-500/15 text-indigo-500 border border-indigo-500/30',
  baixa:   'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08]',
};

interface Props {
  tasks: Task[];
  onGoToAtrasadas: () => void;
}

export function OverdueModal({ tasks, onGoToAtrasadas }: Props) {
  const [open, setOpen] = useState(false);
  const checked = useRef(false);

  const overdue = tasks.filter(t => t.late > 0 && t.status !== 'done');

  useEffect(() => {
    if (overdue.length === 0 || checked.current) return;
    checked.current = true;
    try {
      const shown = sessionStorage.getItem('overdue_popup_shown');
      if (!shown) {
        sessionStorage.setItem('overdue_popup_shown', '1');
        setOpen(true);
      }
    } catch {
      // sessionStorage not available (SSR)
    }
  }, [overdue.length]);

  if (!open) return null;

  const sorted = [...overdue].sort((a, b) => b.late - a.late);
  const preview = sorted.slice(0, 8);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.04] bg-red-500/5 dark:bg-red-500/10 rounded-t-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-sm font-bold text-red-600 dark:text-red-400">
              {overdue.length} tarefa{overdue.length !== 1 ? 's' : ''} atrasada{overdue.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Task list */}
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04] max-h-72 overflow-y-auto">
          {preview.map(task => (
            <div key={task.id} className="px-5 py-3 flex items-start gap-3">
              <span className={`text-[9px] font-black uppercase tracking-[0.5px] px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5 ${PRIO_CLS[task.priority] ?? PRIO_CLS.baixa}`}>
                {task.priority}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight truncate">
                  {task.title}
                </p>
                <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5 font-medium">
                  {task.late}d de atraso · vence {task.due}
                </p>
              </div>
            </div>
          ))}
          {overdue.length > 8 && (
            <div className="px-5 py-2 text-[10px] text-zinc-400 dark:text-zinc-500 text-center">
              +{overdue.length - 8} mais…
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-white/[0.04] flex gap-3">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => { setOpen(false); onGoToAtrasadas(); }}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Ver Atrasadas <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
