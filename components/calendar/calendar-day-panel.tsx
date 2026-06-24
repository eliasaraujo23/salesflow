'use client';

import React from 'react';
import { Pencil, X, Clock } from 'lucide-react';
import { type Task } from '@/components/firebase-provider';
import { type PersonInfo } from '@/hooks/use-calendar';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PRIORITY_STRIP: Record<string, string> = {
  urgente: 'border-l-red-500',
  alta:    'border-l-amber-500',
  media:   'border-l-indigo-500',
  baixa:   'border-l-emerald-500',
};

interface StatusBadgeProps { status: string; late: number; }

function StatusBadge({ status, late }: StatusBadgeProps) {
  const base = 'text-[10px] font-semibold px-1.5 py-[2px] rounded';
  if (status === 'done')
    return <span className={`${base} bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400`}>Concluída</span>;
  if (status === 'progress')
    return <span className={`${base} bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400`}>Em andamento</span>;
  if (status === 'blocked')
    return <span className={`${base} bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400`}>Bloqueada</span>;
  if (late > 0)
    return <span className={`${base} bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400`}>Atrasada {late}d</span>;
  return <span className={`${base} bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400`}>Pendente</span>;
}

interface Props {
  day: number;
  month: number;
  year: number;
  tasks: Task[];
  personMap: Record<string, PersonInfo>;
  onClose: () => void;
  onToggleDone: (task: Task) => void;
  onEdit: (task: Task) => void;
}

export function CalendarDayPanel({ day, month, year, tasks, personMap, onClose, onToggleDone, onEdit }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {day} de {MONTHS[month]} de {year}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.05] flex items-center justify-center mb-3">
            <Clock size={20} className="text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma tarefa neste dia</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const strip = PRIORITY_STRIP[task.priority] ?? 'border-l-zinc-300 dark:border-l-white/[0.10]';
            const person = personMap[task.person];
            const isDone = task.status === 'done';

            return (
              <div
                key={task.id}
                className={`border-l-4 ${strip} bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/[0.13] rounded-r-lg p-3`}
              >
                <div className="flex items-start gap-2">
                  {/* Checkbox */}
                  <button
                    onClick={() => onToggleDone(task)}
                    title={isDone ? 'Concluída' : 'Marcar como concluída'}
                    className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400'
                    }`}
                  >
                    {isDone && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-snug ${
                      isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                    }`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <StatusBadge status={task.status} late={task.late} />
                      {person && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{person.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Person avatar */}
                  {person && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                      style={{ background: person.bg, color: person.text }}
                      title={person.name}
                    >
                      {person.initials}
                    </div>
                  )}

                  {/* Edit button (not shown for done tasks) */}
                  {!isDone && (
                    <button
                      onClick={() => onEdit(task)}
                      className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors shrink-0"
                      title="Editar tarefa"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
