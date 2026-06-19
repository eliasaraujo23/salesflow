'use client';

import React from 'react';
import { type Task } from '@/components/firebase-provider';
import { KanbanTaskCard } from './kanban-task-card';

interface KanbanColumnProps {
  title: string;
  count: number;
  dotColor: string;
  tasks: Task[];
  isFirst: boolean;
  isLast: boolean;
  onMoveTask: (task: Task, direction: 'left' | 'right') => void;
}

export function KanbanColumn({ title, count, dotColor, tasks, isFirst, isLast, onMoveTask }: KanbanColumnProps) {
  return (
    <div className="flex flex-col gap-3 min-w-[260px] flex-1">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        </div>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/[0.06]">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-[200px] bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-2 border border-zinc-200 dark:border-white/[0.06]">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-zinc-400 dark:text-zinc-600 opacity-50">
            Nenhuma tarefa
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              canMoveLeft={!isFirst}
              canMoveRight={!isLast}
              onMoveLeft={() => onMoveTask(task, 'left')}
              onMoveRight={() => onMoveTask(task, 'right')}
            />
          ))
        )}
      </div>
    </div>
  );
}
