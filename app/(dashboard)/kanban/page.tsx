'use client';

import React, { useMemo } from 'react';
import { useFirebase, type Task } from '@/components/firebase-provider';
import { KanbanColumn } from '@/components/kanban/kanban-column';
import { updateTaskStatusAction } from '@/lib/actions/tasks';
import { toast } from 'sonner';

const COLUMNS = [
  { status: 'pendente', title: 'A Fazer', dotColor: 'bg-text-muted' },
  { status: 'progress', title: 'Em Andamento', dotColor: 'bg-accent' },
  { status: 'blocked', title: 'Bloqueada', dotColor: 'bg-semantic-red' },
  { status: 'done', title: 'Concluída', dotColor: 'bg-semantic-green' },
];

export default function KanbanPage() {
  const { tasks } = useFirebase();

  const columnedTasks = useMemo(() => {
    return COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
      acc[col.status] = tasks.filter((t) => t.status === col.status);
      return acc;
    }, {});
  }, [tasks]);

  const handleMoveTask = async (task: Task, direction: 'left' | 'right') => {
    const currentIndex = COLUMNS.findIndex((c) => c.status === task.status);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= COLUMNS.length) return;

    const newStatus = COLUMNS[newIndex].status;
    const result = await updateTaskStatusAction(task.id, newStatus);
    if (!result.success) {
      toast.error('Erro ao mover tarefa: ' + result.error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Kanban</h1>
        <p className="text-sm text-text-muted mt-1">
          {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} no total
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col, index) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            count={columnedTasks[col.status]?.length ?? 0}
            dotColor={col.dotColor}
            tasks={columnedTasks[col.status] ?? []}
            isFirst={index === 0}
            isLast={index === COLUMNS.length - 1}
            onMoveTask={handleMoveTask}
          />
        ))}
      </div>
    </div>
  );
}
