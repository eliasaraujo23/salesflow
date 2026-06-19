'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { useFirebase, type Task } from '@/components/firebase-provider';
import { CalendarGrid } from '@/components/calendar/calendar-grid';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PRIORITY_LABEL: Record<string, string> = {
  urgente: 'Urgente',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgente: 'text-red-600 dark:text-red-400 border-l-red-500',
  alta: 'text-amber-600 dark:text-amber-400 border-l-amber-500',
  media: 'text-indigo-600 dark:text-indigo-400 border-l-indigo-500',
  baixa: 'text-emerald-600 dark:text-emerald-400 border-l-emerald-500',
};

export default function CalendarPage() {
  const { tasks } = useFirebase();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day: number, dayTasks: Task[]) => {
    setSelectedDay(day);
    setSelectedDayTasks(dayTasks);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            tasks={tasks}
            onDayClick={handleDayClick}
            selectedDay={selectedDay}
          />
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            {selectedDay
              ? `${String(selectedDay).padStart(2, '0')}/${String(viewMonth + 1).padStart(2, '0')}/${viewYear}`
              : 'Selecione um dia'}
          </h3>
          {selectedDayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock size={32} className="text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma tarefa neste dia</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`border-l-4 ${PRIORITY_COLOR[task.priority]?.split(' ').find(c => c.startsWith('border-l-')) ?? 'border-l-zinc-300'} bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.06] rounded-r-lg p-3`}
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{task.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{task.person}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${PRIORITY_COLOR[task.priority]?.split(' ').filter(c => c.startsWith('text-')).join(' ') ?? 'text-zinc-500 dark:text-zinc-400'}`}>
                        {PRIORITY_LABEL[task.priority] ?? task.priority}
                      </span>
                      {task.late > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle size={10} />
                          {task.late}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
