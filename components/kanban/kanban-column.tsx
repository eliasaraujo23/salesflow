'use client';

import React from 'react';
import { type Task } from '@/components/firebase-provider';
import { type PersonInfo } from '@/hooks/use-kanban';
import { KanbanTaskCard } from './kanban-task-card';

interface KanbanColumnProps {
  status: string;
  title: string;
  color: string;
  dot: string;
  tasks: Task[];
  isDragOver: boolean;
  draggingTaskId: string | number | null;
  personMap: Record<string, PersonInfo>;
  onDragOver: (status: string, e: React.DragEvent) => void;
  onDragLeave: (status: string, e: React.DragEvent) => void;
  onDrop: (status: string) => void;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onEdit: (task: Task) => void;
}

export function KanbanColumn({
  status, title, color, dot, tasks,
  isDragOver, draggingTaskId, personMap,
  onDragOver, onDragLeave, onDrop,
  onDragStart, onDragEnd, onEdit,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col gap-3 min-w-[240px] flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dot}`} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${color}`}>{title}</span>
        </div>
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => onDragOver(status, e)}
        onDragLeave={(e) => onDragLeave(status, e)}
        onDrop={() => onDrop(status)}
        className={`flex flex-col gap-2 flex-1 min-h-[300px] rounded-xl p-2 border-2 transition-all duration-150 ${
          isDragOver
            ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/5 border-dashed'
            : 'border-transparent bg-zinc-50 dark:bg-zinc-900/50'
        }`}
      >
        {tasks.map((task) => (
          <KanbanTaskCard
            key={task.id}
            task={task}
            isDragging={draggingTaskId === task.id}
            person={personMap[task.person]}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onEdit={onEdit}
          />
        ))}

        {/* Empty/drop hint */}
        {tasks.length === 0 && (
          <div className={`flex items-center justify-center flex-1 text-[12px] transition-colors ${
            isDragOver ? 'text-indigo-500 dark:text-indigo-400 font-medium' : 'text-zinc-300 dark:text-zinc-700'
          }`}>
            {isDragOver ? '↓ Soltar aqui' : 'Nenhuma tarefa'}
          </div>
        )}

        {/* Drop indicator at bottom when column has tasks */}
        {isDragOver && tasks.length > 0 && (
          <div className="h-10 rounded-lg border-2 border-dashed border-indigo-400/50 dark:border-indigo-500/40 flex items-center justify-center text-[11px] text-indigo-400 dark:text-indigo-500 font-medium shrink-0">
            ↓ Soltar aqui
          </div>
        )}
      </div>
    </div>
  );
}
