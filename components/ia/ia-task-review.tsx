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

export function IaTaskReview({
  tasks, users, creating,
  onUpdate, onRemove, onBack, onCreate,
}: IaTaskReviewProps) {
  const unmatchedCount = tasks.filter(t => !t.userMatched).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} encontrada{tasks.length !== 1 ? 's' : ''}
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

      {/* Task list */}
      <div className="space-y-3">
        {tasks.map(task => (
          <IaTaskCard
            key={task.id}
            task={task}
            users={users}
            onChange={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Create button */}
      {tasks.length > 0 && (
        <div className="pt-2 flex justify-end">
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
