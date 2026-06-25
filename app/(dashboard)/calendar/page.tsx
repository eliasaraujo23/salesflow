'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { CalendarDayPanel } from '@/components/calendar/calendar-day-panel';
import { TaskFormModal } from '@/components/tasks/task-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCalendar } from '@/hooks/use-calendar';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function CalendarPage() {
  const {
    isAdmin, currentUser, users, deleteRequests,
    scopedTasks, selectedDayTasks, personMap,
    viewYear, viewMonth, selectedDay, setSelectedDay,
    prevMonth, nextMonth, goToToday,
    showNewModal, setShowNewModal, editingTask, setEditingTask, submitting,
    pendingConfirm, resolvePendingConfirm,
    toggleTaskDone, saveNewTask, saveEditTask, adminDeleteTask, requestDelete,
  } = useCalendar();

  return (
    <div className="p-6 flex flex-col gap-5 h-full">

      {/* Page header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 min-w-[160px] text-center">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={goToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] text-[12px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12] transition-all"
          >
            <CalendarDays size={13} />
            Hoje
          </button>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus size={15} strokeWidth={2.5} /> Nova tarefa
        </button>
      </div>

      {/* Calendar + Day panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-4 overflow-auto">
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            tasks={scopedTasks}
            onDayClick={setSelectedDay}
            selectedDay={selectedDay}
          />
        </div>

        {/* Day panel */}
        <div className="min-h-[300px]">
          {selectedDay !== null ? (
            <CalendarDayPanel
              day={selectedDay}
              month={viewMonth}
              year={viewYear}
              tasks={selectedDayTasks}
              personMap={personMap}
              onClose={() => setSelectedDay(null)}
              onToggleDone={toggleTaskDone}
              onEdit={setEditingTask}
            />
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-4 flex flex-col items-center justify-center h-full text-center">
              <CalendarDays size={28} className="text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Clique em um dia para ver as tarefas</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nova Tarefa */}
      {showNewModal && (
        <TaskFormModal
          mode="new"
          isAdmin={isAdmin}
          currentUser={currentUser}
          users={users}
          submitting={submitting}
          onClose={() => setShowNewModal(false)}
          onSaveNew={saveNewTask}
          onSaveEdit={saveEditTask}
          onAdminDelete={adminDeleteTask}
          onRequestDelete={requestDelete}
        />
      )}

      {/* Modal: Editar Tarefa */}
      {editingTask && (
        <TaskFormModal
          mode="edit"
          task={editingTask}
          isAdmin={isAdmin}
          currentUser={currentUser}
          users={users}
          submitting={submitting}
          onClose={() => setEditingTask(null)}
          onSaveNew={saveNewTask}
          onSaveEdit={saveEditTask}
          onAdminDelete={adminDeleteTask}
          onRequestDelete={requestDelete}
        />
      )}

      <ConfirmDialog
        open={!!pendingConfirm}
        onOpenChange={open => { if (!open) void resolvePendingConfirm(false); }}
        title={pendingConfirm?.type === 'delete' ? 'Excluir tarefa' : 'Concluir tarefa'}
        description={
          pendingConfirm?.type === 'delete'
            ? 'Excluir esta tarefa definitivamente? Essa ação não pode ser desfeita.'
            : 'Ao confirmar, esta tarefa será arquivada. Tarefas concluídas não podem ser reabertas.'
        }
        confirmLabel={pendingConfirm?.type === 'delete' ? 'Excluir' : 'Concluir'}
        onConfirm={() => void resolvePendingConfirm(true)}
      />
    </div>
  );
}
