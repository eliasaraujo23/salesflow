'use client';

import React from 'react';
import { Calendar, Check, Pencil } from 'lucide-react';
import { type Task } from '@/components/firebase-provider';

const PRIORITY: Record<string, { label: string; strip: string; pill: string }> = {
  urgente: { label: 'Urgente', strip: 'bg-red-500',     pill: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-500/20' },
  alta:    { label: 'Alta',    strip: 'bg-amber-500',   pill: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20' },
  media:   { label: 'Média',   strip: 'bg-indigo-500',  pill: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-500/20' },
  baixa:   { label: 'Baixa',   strip: 'bg-emerald-500', pill: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20' },
  _none:   { label: '—',       strip: 'bg-zinc-300 dark:bg-zinc-700', pill: 'bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 dark:text-zinc-500 border-transparent' },
};

interface TaskItemProps {
  task: Task;
  pendingDelete: boolean;
  onToggleDone: (task: Task) => void;
  onEdit: (task: Task) => void;
}

export function TaskItem({ task, pendingDelete, onToggleDone, onEdit }: TaskItemProps) {
  const cfg    = PRIORITY[task.priority] ?? PRIORITY._none;
  const isDone = task.status === 'done';
  const isLate = task.late > 0 && !isDone;

  return (
    <div className="flex items-stretch hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group">
      <div className={`w-[3px] shrink-0 ${cfg.strip} opacity-80`} />

      <div className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5">
        <button
          onClick={() => onToggleDone(task)}
          className={`w-[17px] h-[17px] rounded-[5px] border shrink-0 flex items-center justify-center transition-colors ${
            isDone
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500'
          }`}
          title={isDone ? 'Concluída' : 'Marcar como concluída'}
        >
          {isDone && <Check size={10} className="text-white" strokeWidth={3.5} />}
        </button>

        <span className={`px-2 py-[3px] rounded-md text-[10px] font-semibold border shrink-0 ${cfg.pill}`}>
          {cfg.label}
        </span>

        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium leading-snug ${
            isDone
              ? 'line-through text-zinc-400 dark:text-zinc-600'
              : pendingDelete
              ? 'text-zinc-400 dark:text-zinc-600 italic'
              : 'text-zinc-900 dark:text-zinc-100'
          }`}>
            {task.title}
            {pendingDelete && (
              <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-400 font-semibold not-italic">[exclusão pendente]</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            {task.due && task.due !== 'Sem prazo' ? (
              <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                <Calendar size={10} /> {task.due}
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-600">Sem prazo</span>
            )}
            {isLate && (
              <span className="text-[10px] font-bold px-1.5 py-px rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-500/20">
                {task.late}d atraso
              </span>
            )}
            {task.person && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">· {task.person}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => onEdit(task)}
          className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          title="Editar tarefa"
        >
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
}
