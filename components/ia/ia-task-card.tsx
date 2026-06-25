'use client';

import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { type ParsedTask } from '@/lib/utils/parse-meeting';
import { type AppUser } from '@/components/firebase-provider';

const PRIORITY_OPTIONS = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta',    label: 'Alta' },
  { value: 'media',   label: 'Média' },
  { value: 'baixa',   label: 'Baixa' },
] as const;

const PRIORITY_PILL: Record<string, string> = {
  urgente: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-500/20',
  alta:    'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20',
  media:   'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-500/20',
  baixa:   'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20',
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
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PERSON_COLORS[Math.abs(hash) % PERSON_COLORS.length];
}

interface IaTaskCardProps {
  task: ParsedTask;
  users: AppUser[];
  onChange: (id: string, updates: Partial<ParsedTask>) => void;
  onRemove: (id: string) => void;
}

const inputCls = 'w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-[12.5px] text-zinc-700 dark:text-zinc-300 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';

export function IaTaskCard({ task, users, onChange, onRemove }: IaTaskCardProps) {
  const firstName = task.person.split(' ')[0];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.1] rounded-xl p-4 space-y-3 shadow-sm">

      {/* Row 1: person pill + title + remove */}
      <div className="flex items-start gap-3">
        <span className={`shrink-0 mt-0.5 px-2 py-[3px] rounded-md text-[10px] font-semibold ${personColor(task.person)}`}>
          {firstName}
        </span>
        <input
          value={task.title}
          onChange={e => onChange(task.id, { title: e.target.value })}
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-[13px] font-medium text-zinc-800 dark:text-zinc-100 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
        />
        <button
          onClick={() => onRemove(task.id)}
          className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          title="Remover tarefa"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Row 2: person select, priority select, due */}
      <div className="flex flex-wrap gap-2 pl-[52px]">
        <select
          value={task.person}
          onChange={e => onChange(task.id, { person: e.target.value, userMatched: true })}
          className={`${inputCls} w-40`}
        >
          {users.filter(u => u.personKey || u.name).map(u => (
            <option key={u.email} value={u.name}>{u.name}</option>
          ))}
          {!task.userMatched && (
            <option value={task.person}>{task.person} (não encontrado)</option>
          )}
        </select>

        <select
          value={task.priority}
          onChange={e => onChange(task.id, { priority: e.target.value as ParsedTask['priority'] })}
          className={`${inputCls} w-32`}
        >
          {PRIORITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <span className={`px-2 py-1.5 rounded-lg text-[11.5px] font-medium border ${PRIORITY_PILL[task.priority]}`}>
          {task.due === 'Sem prazo' ? 'Sem prazo' : `até ${task.due}`}
        </span>
      </div>

      {/* Warning: unmatched person */}
      {!task.userMatched && (
        <div className="pl-[52px] flex items-center gap-1.5 text-[11.5px] text-amber-600 dark:text-amber-400">
          <AlertTriangle size={12} />
          <span>Pessoa não encontrada nos usuários — selecione acima.</span>
        </div>
      )}
    </div>
  );
}
