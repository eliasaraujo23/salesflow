'use client';

import { useState, useMemo } from 'react';
import { useFirebase, type Task } from '@/components/firebase-provider';
import { updateTaskStatusAction } from '@/lib/actions/tasks';
import { createTaskAction, type CreateTaskInput } from '@/lib/actions/create-task';
import { updateTaskAction, type UpdateTaskInput } from '@/lib/actions/update-task';
import { deleteTaskAction } from '@/lib/actions/delete-task';
import {
  requestDeleteTaskAction,
  approveDeleteRequestAction,
  rejectDeleteRequestAction,
} from '@/lib/actions/request-delete-task';
import { toast } from 'sonner';

export type FilterId = 'todas' | 'hoje' | 'amanha' | 'semana' | 'atrasadas' | 'concluidas';
export type SortField = 'data' | 'prioridade' | 'responsavel' | null;

const PRIO_ORDER: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };

function parseDue(due: string): Date | null {
  if (!due || due === 'Sem prazo') return null;
  const parts = due.split('/');
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return isNaN(d.getTime()) ? null : d;
}

export function useTasksPage() {
  const { tasks, currentUser, users, deleteRequests } = useFirebase();

  const isAdmin = currentUser?.role === 'admin';

  const [activeFilter, setActiveFilter] = useState<FilterId>('todas');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [filterPerson, setFilterPerson] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const scopedTasks = useMemo(() => {
    if (isAdmin) return tasks;
    if (!currentUser?.personKey) return [];
    return tasks.filter((t) => t.person === currentUser.personKey);
  }, [tasks, isAdmin, currentUser]);

  const filteredTasks = useMemo(() => {
    let list = [...scopedTasks];
    if (filterPerson) list = list.filter((t) => t.person === filterPerson);
    if (filterPriority) list = list.filter((t) => t.priority === filterPriority);

    // Todas as views (exceto Concluídas) mostram apenas tarefas em aberto
    if (activeFilter !== 'concluidas') {
      list = list.filter((t) => t.status !== 'done');
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    switch (activeFilter) {
      case 'hoje':
        list = list.filter((t) => {
          const d = parseDue(t.due);
          return d && d.getTime() === today.getTime();
        });
        break;
      case 'amanha':
        list = list.filter((t) => {
          const d = parseDue(t.due);
          return d && d.getTime() === tomorrow.getTime();
        });
        break;
      case 'semana':
        list = list.filter((t) => {
          const d = parseDue(t.due);
          return d && d >= today && d <= weekEnd;
        });
        break;
      case 'atrasadas':
        list = list.filter((t) => t.late > 0);
        break;
      case 'concluidas':
        list = list.filter((t) => t.status === 'done');
        break;
    }

    if (sortField !== null) {
      list.sort((a, b) => {
        if (sortField === 'prioridade') {
          return (PRIO_ORDER[a.priority] ?? 9) - (PRIO_ORDER[b.priority] ?? 9);
        }
        if (sortField === 'responsavel') {
          return (a.person ?? '').localeCompare(b.person ?? '');
        }
        const da = parseDue(a.due);
        const db = parseDue(b.due);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      });
    }

    return list;
  }, [scopedTasks, activeFilter, filterPerson, filterPriority, sortField, today]);

  const stats = useMemo(() => {
    const completed = scopedTasks.filter((t) => t.status === 'done').length;
    const todayCount = scopedTasks.filter((t) => {
      const d = parseDue(t.due);
      return d && d.getTime() === today.getTime();
    }).length;
    return {
      total: todayCount,
      completed,
      pct: scopedTasks.length > 0 ? Math.round((completed / scopedTasks.length) * 100) : 0,
      inProgress: scopedTasks.filter((t) => t.status === 'progress').length,
      late: scopedTasks.filter((t) => t.late > 0 && t.status !== 'done').length,
    };
  }, [scopedTasks, today]);

  const filterCounts = useMemo(() => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const open = scopedTasks.filter((t) => t.status !== 'done');
    return {
      todas:      open.length,
      hoje:       open.filter((t) => { const d = parseDue(t.due); return d && d.getTime() === today.getTime(); }).length,
      amanha:     open.filter((t) => { const d = parseDue(t.due); return d && d.getTime() === tomorrow.getTime(); }).length,
      semana:     open.filter((t) => { const d = parseDue(t.due); return d && d >= today && d <= weekEnd; }).length,
      atrasadas:  open.filter((t) => t.late > 0).length,
      concluidas: scopedTasks.filter((t) => t.status === 'done').length,
    } as Record<string, number>;
  }, [scopedTasks, today]);

  async function toggleTaskDone(task: Task) {
    if (task.status === 'done') {
      toast.info('Tarefas concluídas não podem ser reabertas.');
      return;
    }
    if (!confirm('Ao confirmar, esta tarefa será arquivada. Tarefas concluídas não podem ser reabertas.')) return;
    const res = await updateTaskStatusAction(task.id, 'done');
    if (res.success) {
      toast.success('Tarefa concluída!');
    } else {
      toast.error(res.error ?? 'Erro ao atualizar tarefa');
    }
  }

  async function saveNewTask(data: CreateTaskInput) {
    setSubmitting(true);
    const res = await createTaskAction(data);
    setSubmitting(false);
    if (res.httpStatus === 200) {
      toast.success('Tarefa criada!');
      setShowNewModal(false);
    } else {
      toast.error(res.message ?? 'Erro ao criar tarefa');
    }
  }

  async function saveEditTask(data: UpdateTaskInput) {
    setSubmitting(true);
    const res = await updateTaskAction(data);
    setSubmitting(false);
    if (res.httpStatus === 200) {
      toast.success('Tarefa atualizada!');
      setEditingTask(null);
    } else {
      toast.error(res.message ?? 'Erro ao atualizar tarefa');
    }
  }

  async function adminDeleteTask(taskId: string | number) {
    if (!confirm('Excluir esta tarefa definitivamente? Essa ação não pode ser desfeita.')) return;
    const res = await deleteTaskAction(taskId);
    if (res.httpStatus === 200) {
      toast.success('Tarefa excluída');
      setEditingTask(null);
    } else {
      toast.error(res.message ?? 'Erro ao excluir tarefa');
    }
  }

  async function requestDelete(task: Task) {
    if (!currentUser) return;
    const existing = deleteRequests.find((r) => String(r.taskId) === String(task.id));
    if (existing) {
      toast.info('Solicitação de exclusão já enviada para este item.');
      return;
    }
    const res = await requestDeleteTaskAction(task.id, task.title, currentUser.personKey, currentUser.name);
    if (res.success) {
      toast.success('Solicitação de exclusão enviada!');
      setEditingTask(null);
    } else {
      toast.error(res.error ?? 'Erro ao enviar solicitação');
    }
  }

  async function approveDelete(docId: string, taskId: string | number) {
    const res = await approveDeleteRequestAction(docId, taskId);
    if (res.success) {
      toast.success('Tarefa excluída');
    } else {
      toast.error(res.error ?? 'Erro ao aprovar');
    }
  }

  async function rejectDelete(docId: string) {
    const res = await rejectDeleteRequestAction(docId);
    if (res.success) {
      toast.success('Solicitação rejeitada');
    } else {
      toast.error(res.error ?? 'Erro ao rejeitar');
    }
  }

  return {
    isAdmin,
    currentUser,
    users,
    deleteRequests,
    filteredTasks,
    stats,
    filterCounts,
    activeFilter,
    setActiveFilter,
    showFilterPanel,
    setShowFilterPanel,
    showSortPanel,
    setShowSortPanel,
    filterPerson,
    setFilterPerson,
    filterPriority,
    setFilterPriority,
    sortField,
    setSortField,
    editingTask,
    setEditingTask,
    showNewModal,
    setShowNewModal,
    submitting,
    toggleTaskDone,
    saveNewTask,
    saveEditTask,
    adminDeleteTask,
    requestDelete,
    approveDelete,
    rejectDelete,
  };
}
