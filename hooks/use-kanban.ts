'use client';

import { useState, useMemo, useCallback } from 'react';
import { useFirebase, type Task } from '@/components/firebase-provider';
import { updateTaskStatusAction } from '@/lib/actions/tasks';
import { toast } from 'sonner';

export const COLUMNS = [
  { status: 'pendente', title: 'Pendente',      color: 'text-zinc-500 dark:text-zinc-400',         dot: 'bg-zinc-400 dark:bg-zinc-600' },
  { status: 'progress', title: 'Em andamento',  color: 'text-indigo-600 dark:text-indigo-400',      dot: 'bg-indigo-500' },
  { status: 'blocked',  title: 'Bloqueada',     color: 'text-red-600 dark:text-red-400',            dot: 'bg-red-500' },
  { status: 'done',     title: 'Concluída',     color: 'text-emerald-600 dark:text-emerald-400',    dot: 'bg-emerald-500' },
] as const;

export type ColumnStatus = typeof COLUMNS[number]['status'];

export interface PersonInfo {
  name: string;
  bg: string;
  text: string;
  initials: string;
}

const PERSON_COLORS = [
  { bg: '#6366f1', text: '#fff' },
  { bg: '#f59e0b', text: '#fff' },
  { bg: '#10b981', text: '#fff' },
  { bg: '#ef4444', text: '#fff' },
  { bg: '#8b5cf6', text: '#fff' },
  { bg: '#06b6d4', text: '#fff' },
  { bg: '#f97316', text: '#fff' },
  { bg: '#ec4899', text: '#fff' },
];

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function useKanban() {
  const { tasks, currentUser, users } = useFirebase();
  const isAdmin = currentUser?.role === 'admin';

  const scopedTasks = useMemo(() => {
    if (isAdmin) return tasks;
    if (!currentUser?.personKey) return [];
    return tasks.filter((t) => t.person === currentUser.personKey);
  }, [tasks, isAdmin, currentUser]);

  const columnedTasks = useMemo(() =>
    COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
      acc[col.status] = scopedTasks.filter((t) => t.status === col.status);
      return acc;
    }, {}),
  [scopedTasks]);

  const personMap = useMemo(() => {
    const map: Record<string, PersonInfo> = {};
    users.forEach((u) => {
      if (!u.personKey) return;
      const idx = Math.abs(u.personKey.charCodeAt(0) || 0) % PERSON_COLORS.length;
      const c = PERSON_COLORS[idx];
      map[u.personKey] = { name: u.name, bg: c.bg, text: c.text, initials: buildInitials(u.name) };
    });
    return map;
  }, [users]);

  const [draggingTask, setDraggingTask]   = useState<Task | null>(null);
  const [dragOverCol,  setDragOverCol]    = useState<string | null>(null);

  const onDragStart = useCallback((task: Task) => {
    setDraggingTask(task);
  }, []);

  const onDragEnd = useCallback(() => {
    setDraggingTask(null);
    setDragOverCol(null);
  }, []);

  const onDragOver = useCallback((status: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(status);
  }, []);

  const onDragLeave = useCallback((status: string, e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverCol((prev) => (prev === status ? null : prev));
    }
  }, []);

  const onDrop = useCallback(async (targetStatus: string) => {
    const task = draggingTask;
    setDraggingTask(null);
    setDragOverCol(null);
    if (!task || task.status === targetStatus) return;
    const res = await updateTaskStatusAction(task.id, targetStatus);
    if (!res.success) toast.error('Erro ao mover tarefa: ' + res.error);
  }, [draggingTask]);

  return {
    isAdmin,
    columnedTasks,
    totalCount: scopedTasks.length,
    draggingTask,
    dragOverCol,
    personMap,
    currentUser,
    users,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
