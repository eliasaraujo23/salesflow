'use client';

import React from 'react';
import { type Task } from '@/components/firebase-provider';

interface CalendarGridProps {
  year: number;
  month: number;
  tasks: Task[];
  onDayClick: (day: number, dayTasks: Task[]) => void;
  selectedDay: number | null;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PRIORITY_DOT: Record<string, string> = {
  urgente: 'bg-red-500',
  alta: 'bg-amber-500',
  media: 'bg-indigo-500',
  baixa: 'bg-emerald-500',
};

function parseTaskDay(due: string): number | null {
  if (!due || due === 'Sem prazo') return null;
  const parts = due.split('/');
  if (parts.length !== 3) return null;
  return Number(parts[0]);
}

function parseTaskMonthYear(due: string): { month: number; year: number } | null {
  if (!due || due === 'Sem prazo') return null;
  const parts = due.split('/');
  if (parts.length !== 3) return null;
  return { month: Number(parts[1]) - 1, year: Number(parts[2]) };
}

export function CalendarGrid({ year, month, tasks, onDayClick, selectedDay }: CalendarGridProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const tasksByDay = tasks.reduce<Record<number, Task[]>>((acc, task) => {
    const my = parseTaskMonthYear(task.due);
    if (!my || my.month !== month || my.year !== year) return acc;
    const day = parseTaskDay(task.due);
    if (!day) return acc;
    acc[day] = acc[day] ?? [];
    acc[day].push(task);
    return acc;
  }, {});

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.day) return <div key={i} />;
          const dayTasks = tasksByDay[cell.day] ?? [];
          const isToday = cell.day === todayDay;
          const isSelected = cell.day === selectedDay;
          const hasLate = dayTasks.some((t) => t.late > 0);

          return (
            <button
              key={i}
              onClick={() => onDayClick(cell.day!, dayTasks)}
              className={`
                relative flex flex-col items-center p-2 rounded-lg min-h-[64px] border transition-all
                ${isSelected ? 'border-indigo-500 bg-indigo-500/10' :
                  isToday ? 'border-indigo-500/40 bg-indigo-500/5' :
                  'border-transparent hover:border-zinc-200 dark:hover:border-white/[0.06] hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}
              `}
            >
              <span
                className={`
                  text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1
                  ${isToday ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-900 dark:text-zinc-100'}
                `}
              >
                {cell.day}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {dayTasks.slice(0, 3).map((t, ti) => (
                    <div
                      key={ti}
                      className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority] ?? 'bg-zinc-400 dark:bg-zinc-600'}`}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">+{dayTasks.length - 3}</span>
                  )}
                </div>
              )}
              {hasLate && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
