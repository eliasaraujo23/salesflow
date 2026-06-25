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

export type PendingConfirm =
  | { type: 'complete'; task: Task }
  | { type: 'delete'; taskId: string | number }
  | { type: 'batch-complete'; tasks: Task[] }
  | { type: 'batch-delete'; taskIds: (string | number)[] }
  | null;

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

  const [activeFilter, setActiveFilter]       = useState<FilterId>('todas');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSortPanel, setShowSortPanel]     = useState(false);
  const [filterPerson, setFilterPerson]       = useState('');
  const [filterPriority, setFilterPriority]   = useState('');
  const [sortField, setSortField]             = useState<SortField>(null);
  const [editingTask, setEditingTask]         = useState<Task | null>(null);
  const [showNewModal, setShowNewModal]       = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [pendingConfirm, setPendingConfirm]   = useState<PendingConfirm>(null);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());

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
    if (filterPerson)   list = list.filter((t) => t.person === filterPerson);
    if (filterPriority) list = list.filter((t) => t.priority === filterPriority);

    if (activeFilter !== 'concluidas') {
      list = list.filter((t) => t.status !== 'done');
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    switch (activeFilter) {
      case 'hoje':
        list = list.filter((t) => { const d = parseDue(t.due); return d && d.getTime() === today.getTime(); });
        break;
      case 'amanha':
        list = list.filter((t) => { const d = parseDue(t.due); return d && d.getTime() === tomorrow.getTime(); });
        break;
      case 'semana':
        list = list.filter((t) => { const d = parseDue(t.due); return d && d >= today && d <= weekEnd; });
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
        if (sortField === 'prioridade') return (PRIO_ORDER[a.priority] ?? 9) - (PRIO_ORDER[b.priority] ?? 9);
        if (sortField === 'responsavel') return (a.person ?? '').localeCompare(b.person ?? '');
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

  const selectedTasks = useMemo(
    () => filteredTasks.filter((t) => selectedIds.has(String(t.id))),
    [filteredTasks, selectedIds],
  );

  const stats = useMemo(() => {
    const completed  = scopedTasks.filter((t) => t.status === 'done').length;
    const todayCount = scopedTasks.filter((t) => { const d = parseDue(t.due); return d && d.getTime() === today.getTime(); }).length;
    return {
      total:      todayCount,
      completed,
      pct:        scopedTasks.length > 0 ? Math.round((completed / scopedTasks.length) * 100) : 0,
      inProgress: scopedTasks.filter((t) => t.status === 'progress').length,
      late:       scopedTasks.filter((t) => t.late > 0 && t.status !== 'done').length,
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

  // --- seleção ---

  function toggleSelect(task: Task) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(task.id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // --- ações individuais ---

  function toggleTaskDone(task: Task) {
    if (task.status === 'done') { toast.info('Tarefas concluídas não podem ser reabertas.'); return; }
    setPendingConfirm({ type: 'complete', task });
  }

  function adminDeleteTask(taskId: string | number) {
    setPendingConfirm({ type: 'delete', taskId });
  }

  function deleteTaskDirect(task: Task) {
    if (isAdmin) {
      setPendingConfirm({ type: 'delete', taskId: task.id });
    } else {
      void requestDelete(task);
    }
  }

  // --- ações em lote (via barra de seleção) ---

  function batchComplete() {
    const tasks = selectedTasks.filter((t) => t.status !== 'done');
    if (tasks.length === 0) return;
    if (tasks.length === 1) {
      setPendingConfirm({ type: 'complete', task: tasks[0] });
    } else {
      setPendingConfirm({ type: 'batch-complete', tasks });
    }
  }

  function batchDelete() {
    const ids = selectedTasks.map((t) => t.id);
    if (ids.length === 0) return;
    if (ids.length === 1) {
      if (isAdmin) setPendingConfirm({ type: 'delete', taskId: ids[0] });
      else {
        const task = selectedTasks[0];
        void requestDelete(task);
        clearSelection();
      }
    } else {
      if (isAdmin) {
        setPendingConfirm({ type: 'batch-delete', taskIds: ids });
      } else {
        void Promise.all(selectedTasks.map((t) => requestDelete(t)));
        clearSelection();
      }
    }
  }

  // --- resolver confirmação ---

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
    } else if (p.type === 'batch-complete') {
      await Promise.all(p.tasks.map((t) => updateTaskStatusAction(t.id, 'done')));
      toast.success(`${p.tasks.length} tarefas concluídas!`);
      clearSelection();
    } else if (p.type === 'batch-delete') {
      await Promise.all(p.taskIds.map((id) => deleteTaskAction(id)));
      toast.success(`${p.taskIds.length} tarefas excluídas`);
      clearSelection();
    }
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

  async function requestDelete(task: Task) {
    if (!currentUser) return;
    const existing = deleteRequests.find((r) => String(r.taskId) === String(task.id));
    if (existing) { toast.info('Solicitação de exclusão já enviada para este item.'); return; }
    const res = await requestDeleteTaskAction(task.id, task.title, currentUser.personKey, currentUser.name);
    if (res.success) { toast.success('Solicitação de exclusão enviada!'); setEditingTask(null); }
    else toast.error(res.error ?? 'Erro ao enviar solicitação');
  }

  async function approveDelete(docId: string, taskId: string | number) {
    const res = await approveDeleteRequestAction(docId, taskId);
    if (res.success) toast.success('Tarefa excluída');
    else toast.error(res.error ?? 'Erro ao aprovar');
  }

  async function rejectDelete(docId: string) {
    const res = await rejectDeleteRequestAction(docId);
    if (res.success) toast.success('Solicitação rejeitada');
    else toast.error(res.error ?? 'Erro ao rejeitar');
  }

  return {
    isAdmin,
    currentUser,
    users,
    deleteRequests,
    scopedTasks,
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
    pendingConfirm,
    resolvePendingConfirm,
    selectedIds,
    selectedTasks,
    toggleSelect,
    clearSelection,
    batchComplete,
    batchDelete,
    toggleTaskDone,
    saveNewTask,
    saveEditTask,
    adminDeleteTask,
    deleteTaskDirect,
    requestDelete,
    approveDelete,
    rejectDelete,
  };
}
