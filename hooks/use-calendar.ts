'use client';

import { useState, useMemo } from 'react';
import { useFirebase, type Task } from '@/components/firebase-provider';
import { updateTaskStatusAction } from '@/lib/actions/tasks';
import { createTaskAction, type CreateTaskInput } from '@/lib/actions/create-task';
import { updateTaskAction, type UpdateTaskInput } from '@/lib/actions/update-task';
import { deleteTaskAction } from '@/lib/actions/delete-task';
import { requestDeleteTaskAction } from '@/lib/actions/request-delete-task';
import { toast } from 'sonner';

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

export function useCalendar() {
  const { tasks, currentUser, users, deleteRequests } = useFirebase();
  const isAdmin = currentUser?.role === 'admin';

  const now = new Date();
  const [viewYear, setViewYear]     = useState(now.getFullYear());
  const [viewMonth, setViewMonth]   = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [showNewModal, setShowNewModal]   = useState(false);
  const [editingTask, setEditingTask]     = useState<Task | null>(null);
  const [submitting, setSubmitting]       = useState(false);

  type PendingConfirm =
    | { type: 'complete'; task: Task }
    | { type: 'delete'; taskId: string | number }
    | null;
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  const scopedTasks = useMemo(() => {
    if (isAdmin) return tasks;
    if (!currentUser?.personKey) return [];
    return tasks.filter((t) => t.person === currentUser.personKey);
  }, [tasks, isAdmin, currentUser]);

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

  const selectedDayTasks = useMemo(() => {
    if (selectedDay === null) return [];
    return scopedTasks.filter((t) => {
      if (!t.due || t.due === 'Sem prazo') return false;
      const parts = t.due.split('/');
      if (parts.length !== 3) return false;
      return (
        Number(parts[0]) === selectedDay &&
        Number(parts[1]) - 1 === viewMonth &&
        Number(parts[2]) === viewYear
      );
    });
  }, [scopedTasks, selectedDay, viewMonth, viewYear]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function goToToday() {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    setSelectedDay(n.getDate());
  }

  function toggleTaskDone(task: Task) {
    if (task.status === 'done') {
      toast.info('Tarefas concluídas não podem ser reabertas.');
      return;
    }
    setPendingConfirm({ type: 'complete', task });
  }

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

  function adminDeleteTask(taskId: string | number) {
    setPendingConfirm({ type: 'delete', taskId });
  }

  async function resolvePendingConfirm(confirmed: boolean) {
    if (!confirmed || !pendingConfirm) { setPendingConfirm(null); return; }
    const p = pendingConfirm;
    setPendingConfirm(null);
    if (p.type === 'complete') {
      const res = await updateTaskStatusAction(p.task.id, 'done');
      if (res.success) toast.success('Tarefa concluída!');
      else toast.error(res.error ?? 'Erro ao atualizar tarefa');
    } else if (p.type === 'delete') {
      const res = await deleteTaskAction(p.taskId);
      if (res.httpStatus === 200) { toast.success('Tarefa excluída'); setEditingTask(null); }
      else toast.error(res.message ?? 'Erro ao excluir tarefa');
    }
  }

  async function requestDelete(task: Task) {
    if (!currentUser) return;
    const existing = deleteRequests.find((r) => String(r.taskId) === String(task.id));
    if (existing) { toast.info('Solicitação de exclusão já enviada para este item.'); return; }
    const res = await requestDeleteTaskAction(task.id, task.title, currentUser.personKey, currentUser.name);
    if (res.success) { toast.success('Solicitação enviada!'); setEditingTask(null); }
    else toast.error(res.error ?? 'Erro ao enviar solicitação');
  }

  return {
    isAdmin,
    currentUser,
    users,
    deleteRequests,
    scopedTasks,
    selectedDayTasks,
    personMap,
    viewYear,
    viewMonth,
    selectedDay,
    setSelectedDay,
    prevMonth,
    nextMonth,
    goToToday,
    showNewModal,
    setShowNewModal,
    editingTask,
    setEditingTask,
    submitting,
    pendingConfirm,
    resolvePendingConfirm,
    toggleTaskDone,
    saveNewTask,
    saveEditTask,
    adminDeleteTask,
    requestDelete,
  };
}
