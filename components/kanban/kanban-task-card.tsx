'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { type Task } from '@/components/firebase-provider';

const PRIORITY_BORDER: Record<string, string> = {
  urgente: 'border-l-semantic-red',
  alta: 'border-l-semantic-amber',
  media: 'border-l-accent',
  baixa: 'border-l-semantic-green',
};

interface KanbanTaskCardProps {
  task: Task;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

export function KanbanTaskCard({ task, canMoveLeft, canMoveRight, onMoveLeft, onMoveRight }: KanbanTaskCardProps) {
  const borderColor = PRIORITY_BORDER[task.priority] ?? 'border-l-border-2';

  return (
    <div
      className={`border-l-4 ${borderColor} bg-bg-surface border border-border rounded-r-lg p-3 group hover:border-accent/30 transition-colors`}
    >
      <p className="text-sm font-medium text-text leading-snug mb-2">{task.title}</p>
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-muted">{task.person}</span>
          {task.due && task.due !== 'Sem prazo' && (
            <span className={`text-xs flex items-center gap-1 ${task.late > 0 ? 'text-semantic-red' : 'text-text-muted'}`}>
              <Clock size={10} />
              {task.due}
              {task.late > 0 && ` (${task.late}d)`}
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canMoveLeft && (
            <button
              onClick={onMoveLeft}
              className="p-1 rounded bg-bg-surface-2 hover:bg-border text-text-muted hover:text-text transition-colors"
              title="Mover para a esquerda"
            >
              <ArrowLeft size={12} />
            </button>
          )}
          {canMoveRight && (
            <button
              onClick={onMoveRight}
              className="p-1 rounded bg-bg-surface-2 hover:bg-border text-text-muted hover:text-text transition-colors"
              title="Mover para a direita"
            >
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
