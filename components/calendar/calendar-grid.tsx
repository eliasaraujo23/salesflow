'use client';

import React from 'react';
import { type Task } from '@/components/firebase-provider';

interface CalendarGridProps {
  year: number;
  month: number;
  tasks: Task[];
  onDayClick: (day: number) => void;
  selectedDay: number | null;
}

interface Cell { day: number; current: boolean; }

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_PILL: Record<string, string> = {
  done:     'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  progress: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  blocked:  'bg-purple-500/15 text-purple-700 dark:text-purple-400',
};

const PRIORITY_DOT: Record<string, string> = {
  urgente: 'bg-red-500',
  alta:    'bg-amber-500',
  media:   'bg-indigo-500',
  baixa:   'bg-emerald-500',
};

function parseDue(due: string): { day: number; month: number; year: number } | null {
  if (!due || due === 'Sem prazo') return null;
  const parts = due.split('/');
  if (parts.length !== 3) return null;
  const d = Number(parts[0]), m = Number(parts[1]) - 1, y = Number(parts[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return { day: d, month: m, year: y };
}

export function CalendarGrid({ year, month, tasks, onDayClick, selectedDay }: CalendarGridProps) {
  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const prevMonthEnd = new Date(year, month, 0).getDate();
  const today        = new Date();
  const todayDay     = (today.getFullYear() === year && today.getMonth() === month) ? today.getDate() : -1;

  const tasksByDay = tasks.reduce<Record<number, Task[]>>((acc, t) => {
    const p = parseDue(t.due);
    if (!p || p.month !== month || p.year !== year) return acc;
    acc[p.day] = acc[p.day] ?? [];
    acc[p.day].push(t);
    return acc;
  }, {});

  const cells: Cell[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: prevMonthEnd - firstDay + 1 + i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ day: next++, current: false });

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-2 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          /* Overflow days: faded, not clickable */
          if (!cell.current) {
            return (
              <div
                key={i}
                className="relative flex flex-col items-start p-1.5 rounded-lg min-h-[72px] opacity-30 pointer-events-none"
              >
                <span className="text-[12px] font-medium text-zinc-400 dark:text-zinc-600 w-6 h-6 flex items-center justify-center">
                  {cell.day}
                </span>
              </div>
            );
          }

          const dayTasks = tasksByDay[cell.day] ?? [];
          const isToday    = cell.day === todayDay;
          const isSelected = cell.day === selectedDay;
          const hasLate    = dayTasks.some((t) => t.late > 0 && t.status !== 'done');
          const pills      = dayTasks.slice(0, 2);
          const overflow   = dayTasks.length - 2;

          return (
            <button
              key={i}
              onClick={() => onDayClick(cell.day)}
              className={`
                relative flex flex-col items-start p-1.5 rounded-lg min-h-[72px] border transition-all text-left
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : isToday
                  ? 'border-indigo-500/40 bg-indigo-500/5'
                  : 'border-transparent hover:border-zinc-200 dark:hover:border-white/[0.06] hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}
              `}
            >
              {/* Late dot */}
              {hasLate && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}

              {/* Day number */}
              <span
                className={`text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 shrink-0 ${
                  isToday ? 'bg-indigo-600 text-white' : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {cell.day}
              </span>

              {/* Task pills */}
              {pills.length > 0 && (
                <div className="w-full flex flex-col gap-[2px]">
                  {pills.map((t, ti) => {
                    const pillCls = STATUS_PILL[t.status] ?? 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
                    return (
                      <div key={ti} className={`text-[9px] font-medium px-1 py-[1px] rounded truncate w-full leading-[1.4] ${pillCls}`}>
                        {t.title}
                      </div>
                    );
                  })}

                  {/* Overflow dots + count */}
                  {overflow > 0 && (
                    <div className="flex items-center gap-0.5 px-0.5 mt-[1px]">
                      {dayTasks.slice(2, 5).map((t, ti) => (
                        <div
                          key={ti}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] ?? 'bg-zinc-400 dark:bg-zinc-600'}`}
                        />
                      ))}
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-400 ml-0.5">+{overflow}</span>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
