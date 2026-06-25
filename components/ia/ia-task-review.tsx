'use client';

import React from 'react';
import { ArrowLeft, Rocket, AlertTriangle } from 'lucide-react';
import { type ParsedTask } from '@/lib/utils/parse-meeting';
import { type AppUser } from '@/components/firebase-provider';
import { IaTaskCard } from '@/components/ia/ia-task-card';

interface IaTaskReviewProps {
  tasks: ParsedTask[];
  users: AppUser[];
  creating: boolean;
  onUpdate: (id: string, updates: Partial<ParsedTask>) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onCreate: () => void;
}

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

export function IaTaskReview({
  tasks, users, creating,
  onUpdate, onRemove, onBack, onCreate,
}: IaTaskReviewProps) {
  const unmatchedCount = tasks.filter(t => !t.userMatched).length;

  // Group tasks by person, preserving order of first appearance
  const groupOrder: string[] = [];
  const grouped: Record<string, ParsedTask[]> = {};
  for (const task of tasks) {
    if (!grouped[task.person]) {
      grouped[task.person] = [];
      groupOrder.push(task.person);
    }
    grouped[task.person].push(task);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} · {groupOrder.length} pessoa{groupOrder.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Revise e edite antes de criar
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.1] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-[12.5px] font-medium transition-colors"
        >
          <ArrowLeft size={13} /> Voltar
        </button>
      </div>

      {/* Unmatched warning */}
      {unmatchedCount > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200/60 dark:border-amber-500/20 rounded-xl text-[12.5px] text-amber-700 dark:text-amber-400">
          <AlertTriangle size={14} className="shrink-0" />
          {unmatchedCount} pessoa{unmatchedCount !== 1 ? 's' : ''} não encontrada{unmatchedCount !== 1 ? 's' : ''} nos usuários — selecione o responsável manualmente.
        </div>
      )}

      {/* Grouped by person */}
      <div className="space-y-6">
        {groupOrder.map(person => {
          const personTasks = grouped[person];
          const count = personTasks.length;
          return (
            <div key={person}>
              {/* Person header */}
              <div className="flex items-center gap-2.5 mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-[11.5px] font-bold ${personColor(person)}`}>
                  {person}
                </span>
                <span className="text-[11.5px] text-zinc-400 dark:text-zinc-500">
                  {count} tarefa{count !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
              </div>

              {/* Tasks for this person */}
              <div className="space-y-2.5">
                {personTasks.map(task => (
                  <IaTaskCard
                    key={task.id}
                    task={task}
                    users={users}
                    onChange={onUpdate}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create button */}
      {tasks.length > 0 && (
        <div className="pt-1 flex justify-end">
          <button
            onClick={onCreate}
            disabled={creating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors shadow-md shadow-indigo-500/20"
          >
            <Rocket size={14} />
            {creating ? 'Criando...' : `Criar ${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
