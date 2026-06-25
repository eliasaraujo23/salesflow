'use client';

import React from 'react';
import { Calendar, Check, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { type Task } from '@/components/firebase-provider';

const PRIORITY: Record<string, { label: string; pill: string }> = {
  urgente: { label: 'Urgente', pill: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-500/20' },
  alta:    { label: 'Alta',    pill: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20' },
  media:   { label: 'Média',   pill: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20' },
  baixa:   { label: 'Baixa',   pill: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20' },
  _none:   { label: '—',       pill: 'bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 dark:text-zinc-500 border border-transparent' },
};

const PERSON_COLORS = [
  'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300',
  'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300',
  'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300',
  'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
];

function personColor(name: string): string {
  if (!name) return PERSON_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PERSON_COLORS[Math.abs(hash) % PERSON_COLORS.length];
}

function firstName(name: string): string {
  return name.split(' ')[0];
}

interface TaskItemProps {
  task: Task;
  pendingDelete: boolean;
  selected: boolean;
  onSelect: (task: Task) => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  resolvePerson?: (person: string) => string;
}

export function TaskItem({ task, pendingDelete, selected, onSelect, onComplete, onEdit, onDelete, resolvePerson }: TaskItemProps) {
  const cfg      = PRIORITY[task.priority] ?? PRIORITY._none;
  const isDone   = task.status === 'done';
  const isLate   = task.late > 0 && !isDone;
  const personName = task.person ? (resolvePerson ? resolvePerson(task.person) : task.person) : '';

  return (
    <div className={`flex items-stretch transition-colors group ${
      selected
        ? 'bg-indigo-50/60 dark:bg-indigo-500/[0.07]'
        : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
    }`}>

      <div className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5">

        {/* Checkbox */}
        {isDone ? (
          <div className="w-[17px] h-[17px] rounded-[5px] bg-emerald-500 border border-emerald-500 shrink-0 flex items-center justify-center">
            <Check size={10} className="text-white" strokeWidth={3.5} />
          </div>
        ) : (
          <button
            onClick={() => onSelect(task)}
            className={`w-[17px] h-[17px] rounded-[5px] border shrink-0 flex items-center justify-center transition-colors ${
              selected
                ? 'bg-indigo-500 border-indigo-500'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500'
            }`}
            title="Selecionar"
          >
            {selected && <Check size={10} className="text-white" strokeWidth={3.5} />}
          </button>
        )}

        {/* Nome da pessoa — pill colorido */}
        {personName ? (
          <span className={`px-2 py-[3px] rounded-md text-[10px] font-semibold shrink-0 ${personColor(personName)}`}>
            {firstName(personName)}
          </span>
        ) : (
          <span className="w-[42px] shrink-0" />
        )}

        {/* Conteúdo principal */}
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
            {/* Prioridade inline */}
            <span className={`px-1.5 py-px rounded text-[10px] font-semibold ${cfg.pill}`}>
              {cfg.label}
            </span>

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
          </div>

          {task.description && !isDone && (
            <p className="mt-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Botões inline (hover) */}
        {!isDone && (
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onComplete(task)}
              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              title="Concluir tarefa"
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              title="Editar tarefa"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(task)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Excluir tarefa"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
