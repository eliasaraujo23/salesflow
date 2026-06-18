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
          <span className="text-sm font-semibold text-text">{title}</span>
        </div>
        <span className="text-xs font-medium text-text-muted bg-bg-surface px-2 py-0.5 rounded-full border border-border">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-[200px] bg-bg-surface/50 rounded-lg p-2 border border-border">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-text-muted opacity-50">
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
