'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { KanbanColumn } from '@/components/kanban/kanban-column';
import { TaskFormModal } from '@/components/tasks/task-form-modal';
import { useKanban, COLUMNS } from '@/hooks/use-kanban';
import { useFirebase, type Task } from '@/components/firebase-provider';
import { createTaskAction, type CreateTaskInput } from '@/lib/actions/create-task';
import { updateTaskAction, type UpdateTaskInput } from '@/lib/actions/update-task';
import { deleteTaskAction } from '@/lib/actions/delete-task';
import { requestDeleteTaskAction } from '@/lib/actions/request-delete-task';
import { toast } from 'sonner';

export default function KanbanPage() {
  const {
    isAdmin, columnedTasks, totalCount,
    draggingTask, dragOverCol, personMap,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  } = useKanban();

  const { currentUser, users, deleteRequests } = useFirebase();

  const [showNewModal,  setShowNewModal]  = useState(false);
  const [editingTask,   setEditingTask]   = useState<Task | null>(null);
  const [submitting,    setSubmitting]    = useState(false);

  async function saveNewTask(data: CreateTaskInput) {
    setSubmitting(true);
    const res = await createTaskAction(data);
    setSubmitting(false);
    if (res.httpStatus === 200) { toast.success('Tarefa criada!'); setShowNewModal(false); }
    else toast.error(res.message ?? 'Erro ao criar tarefa');
  }

  async function saveEditTask(data: UpdateTaskInput) {
    setSubmitting(true);
    const res = await updateTaskAction(data);
    setSubmitting(false);
    if (res.httpStatus === 200) { toast.success('Tarefa atualizada!'); setEditingTask(null); }
    else toast.error(res.message ?? 'Erro ao atualizar tarefa');
  }

  async function adminDeleteTask(taskId: string | number) {
    if (!confirm('Excluir esta tarefa definitivamente?')) return;
    const res = await deleteTaskAction(taskId);
    if (res.httpStatus === 200) { toast.success('Tarefa excluída'); setEditingTask(null); }
    else toast.error(res.message ?? 'Erro ao excluir');
  }

  async function requestDelete(task: Task) {
    if (!currentUser) return;
    const existing = deleteRequests.find((r) => String(r.taskId) === String(task.id));
    if (existing) { toast.info('Solicitação já enviada.'); return; }
    const res = await requestDeleteTaskAction(task.id, task.title, currentUser.personKey, currentUser.name);
    if (res.success) { toast.success('Solicitação enviada!'); setEditingTask(null); }
    else toast.error(res.error ?? 'Erro ao enviar');
  }

  return (
    <div className="p-6 flex flex-col gap-5 h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Kanban</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {totalCount} tarefa{totalCount !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus size={15} strokeWidth={2.5} /> Nova tarefa
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            title={col.title}
            color={col.color}
            dot={col.dot}
            tasks={columnedTasks[col.status] ?? []}
            isDragOver={dragOverCol === col.status && draggingTask?.status !== col.status}
            draggingTaskId={draggingTask?.id ?? null}
            personMap={personMap}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onEdit={setEditingTask}
          />
        ))}
      </div>

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
    </div>
  );
}
