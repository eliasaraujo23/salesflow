'use client';

import React from 'react';
import { CheckCircle2, X, Calendar } from 'lucide-react';
import { type Task } from '@/components/firebase-provider';

const PRIO_LABEL: Record<string, string> = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const PRIO_CLS: Record<string, string> = {
  urgente: 'bg-red-500/15 text-red-500',
  alta:    'bg-amber-500/15 text-amber-500',
  media:   'bg-indigo-500/15 text-indigo-500',
  baixa:   'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
};

interface Props {
  tasks: Task[];
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BatchCompleteModal({ tasks, open, onConfirm, onCancel }: Props) {
  if (!open || tasks.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-2xl w-full max-w-md shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Concluir {tasks.length} tarefas
            </h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04] max-h-72 overflow-y-auto">
          {tasks.map(task => (
            <div key={task.id} className="px-5 py-3 flex items-start gap-3">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5 ${PRIO_CLS[task.priority] ?? PRIO_CLS.baixa}`}>
                {PRIO_LABEL[task.priority] ?? task.priority}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-tight">{task.title}</p>
                {task.due && task.due !== 'Sem prazo' && (
                  <p className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    <Calendar size={9} /> {task.due}
                    {task.late > 0 && <span className="text-red-500 font-semibold ml-1">{task.late}d atraso</span>}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 dark:border-white/[0.06] flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            Confirmar conclusão
          </button>
        </div>
      </div>
    </div>
  );
}
