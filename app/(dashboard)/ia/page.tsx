'use client';

import React from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { useIaPage } from '@/hooks/use-ia-page';
import { IaMeetingInput } from '@/components/ia/ia-meeting-input';
import { IaTaskReview } from '@/components/ia/ia-task-review';

export default function IAPage() {
  const {
    step, rawText, setRawText, tasks,
    analyze, updateTask, removeTask,
    createTasks, creating, createdCount,
    loadFile, reset, users,
  } = useIaPage();

  return (
    <div className="p-3 sm:p-6 space-y-6 w-full">

      {/* Header */}
      <div>
        <h1 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-50">IA de Reuniões</h1>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
          Cole as notas da reunião e crie tarefas automaticamente
        </p>
      </div>

      {/* Step: input */}
      {step === 'input' && (
        <IaMeetingInput
          rawText={rawText}
          onChange={setRawText}
          onAnalyze={analyze}
          onFileLoad={loadFile}
        />
      )}

      {/* Step: review */}
      {step === 'review' && (
        <IaTaskReview
          tasks={tasks}
          users={users}
          creating={creating}
          onUpdate={updateTask}
          onRemove={removeTask}
          onBack={() => { /* go back to input */ reset(); }}
          onCreate={createTasks}
        />
      )}

      {/* Step: done */}
      {step === 'done' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.1] rounded-xl p-10 text-center shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={26} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-zinc-900 dark:text-zinc-50">
                {createdCount} tarefa{createdCount !== 1 ? 's' : ''} criada{createdCount !== 1 ? 's' : ''}!
              </p>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">
                As tarefas já estão disponíveis no módulo de tarefas.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-[13px] font-medium transition-colors"
              >
                Nova análise
              </button>
              <a
                href="/tasks"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors shadow-md shadow-indigo-500/20"
              >
                <ClipboardList size={14} /> Ver tarefas
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
