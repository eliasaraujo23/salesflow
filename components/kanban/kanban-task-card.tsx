'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { type Task } from '@/components/firebase-provider';
import { type PersonInfo } from '@/hooks/use-kanban';

const PRIORITY_BADGE: Record<string, string> = {
  urgente: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-500/20',
  alta:    'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20',
  media:   'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20',
  baixa:   'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20',
};

const PRIORITY_STRIP: Record<string, string> = {
  urgente: 'border-l-red-500',
  alta:    'border-l-amber-500',
  media:   'border-l-indigo-500',
  baixa:   'border-l-emerald-500',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa',
};

interface KanbanTaskCardProps {
  task: Task;
  isDragging: boolean;
  person: PersonInfo | undefined;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onEdit: (task: Task) => void;
}

export function KanbanTaskCard({ task, isDragging, person, onDragStart, onDragEnd, onEdit }: KanbanTaskCardProps) {
  const strip = PRIORITY_STRIP[task.priority] ?? 'border-l-zinc-300 dark:border-l-white/[0.10]';
  const badge = PRIORITY_BADGE[task.priority];
  const label = PRIORITY_LABEL[task.priority];
  const isLate = task.late > 0 && task.status !== 'done';

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task); }}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      className={`border-l-4 ${strip} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-r-lg p-3 select-none transition-all ${
        isDragging
          ? 'opacity-30 scale-95 cursor-grabbing'
          : 'cursor-grab hover:border-indigo-500/40 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-black/30 active:cursor-grabbing active:shadow-lg active:scale-[1.02]'
      }`}
    >
      <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 leading-snug mb-2.5 pointer-events-none">
        {task.title}
      </p>
      <div className="flex items-end justify-between gap-2 pointer-events-none">
        <div className="flex flex-col gap-1 min-w-0">
          {badge && (
            <span className={`self-start text-[10px] font-semibold px-1.5 py-[2px] rounded ${badge}`}>
              {label}
            </span>
          )}
          {task.due && task.due !== 'Sem prazo' && (
            <span className={`flex items-center gap-1 text-[10px] ${
              isLate ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-zinc-400 dark:text-zinc-500'
            }`}>
              <Clock size={9} />
              {task.due}{isLate ? ` (${task.late}d)` : ''}
            </span>
          )}
        </div>

        {person && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
            style={{ background: person.bg, color: person.text }}
            title={person.name}
          >
            {person.initials}
          </div>
        )}
      </div>
    </div>
  );
}
