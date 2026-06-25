'use client';

import React from 'react';
import { KPICard } from '@/components/kpi-card';
import { TaskItem } from '@/components/tasks/task-item';
import { TaskFormModal } from '@/components/tasks/task-form-modal';
import { DeleteRequestBanner } from '@/components/tasks/delete-request-banner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OverdueModal } from '@/components/tasks/overdue-modal';
import { useTasksPage } from '@/hooks/use-tasks-page';
import {
  ClipboardList, CheckCircle, Loader2, AlertTriangle,
  Plus, Filter, ArrowDownUp,
} from 'lucide-react';

const FILTER_OPTIONS = [
  { id: 'todas',      label: 'Todas' },
  { id: 'hoje',       label: 'Hoje' },
  { id: 'amanha',     label: 'Amanhã' },
  { id: 'semana',     label: 'Esta semana' },
  { id: 'atrasadas',  label: 'Atrasadas' },
  { id: 'concluidas', label: 'Concluídas' },
] as const;

const SORT_OPTIONS: { id: 'data' | 'prioridade' | 'responsavel'; label: string }[] = [
  { id: 'data',        label: 'Data' },
  { id: 'prioridade',  label: 'Prioridade' },
  { id: 'responsavel', label: 'Responsável' },
];

export default function TasksPage() {
  const {
    isAdmin, currentUser, users, deleteRequests,
    filteredTasks, stats, filterCounts,
    activeFilter, setActiveFilter,
    showFilterPanel, setShowFilterPanel,
    showSortPanel, setShowSortPanel,
    filterPerson, setFilterPerson,
    filterPriority, setFilterPriority,
    sortField, setSortField,
    editingTask, setEditingTask,
    showNewModal, setShowNewModal,
    submitting,
    pendingConfirm, resolvePendingConfirm,
    toggleTaskDone, saveNewTask, saveEditTask,
    adminDeleteTask, requestDelete,
    approveDelete, rejectDelete,
    scopedTasks,
  } = useTasksPage();

  const pendingDeleteIds = new Set(deleteRequests.map((r) => String(r.taskId)));

  const panelCls = 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-4 shadow-sm';
  const selectCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-700 dark:text-zinc-300 text-[13px] focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-colors';
  const filterLabelCls = 'block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-2 uppercase tracking-[0.6px]';

  return (
    <div className="p-3 sm:p-6 space-y-5 w-full">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors shadow-md shadow-indigo-500/20"
        >
          <Plus size={15} strokeWidth={2.5} /> Nova tarefa
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowFilterPanel((v) => !v); setShowSortPanel(false); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all ${
              showFilterPanel
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12]'
            }`}
          >
            <Filter size={13} /> Filtrar
          </button>
          <button
            onClick={() => { setShowSortPanel((v) => !v); setShowFilterPanel(false); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all ${
              showSortPanel || sortField !== null
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12]'
            }`}
          >
            <ArrowDownUp size={13} />
            Ordenar
            {sortField !== null && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={ClipboardList} label="Total hoje"   value={stats.total}      subtext="tarefas para hoje"        variant="blue"  />
        <KPICard icon={CheckCircle}   label="Concluídas"   value={stats.completed}  subtext={`${stats.pct}% do total`} variant="green" />
        <KPICard icon={Loader2}       label="Em andamento" value={stats.inProgress} subtext="em progresso"             variant="amber" />
        <KPICard icon={AlertTriangle} label="Atrasadas"    value={stats.late}       subtext="precisam de atenção"      variant="red"   />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActiveFilter(opt.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
              activeFilter === opt.id
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12]'
            }`}
          >
            {opt.label}
            {filterCounts[opt.id] > 0 && (
              <span className={`text-[10px] font-bold ${activeFilter === opt.id ? 'opacity-75' : 'opacity-50'}`}>
                {filterCounts[opt.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div className={panelCls}>
          <div className={`grid gap-4 ${isAdmin ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {isAdmin && (
              <div>
                <label className={filterLabelCls}>Responsável</label>
                <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} className={selectCls}>
                  <option value="">Todos</option>
                  {users.filter((u) => u.personKey).map((u) => (
                    <option key={u.personKey} value={u.personKey}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={filterLabelCls}>Prioridade</label>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectCls}>
                <option value="">Todas</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Sort panel */}
      {showSortPanel && (
        <div className={panelCls}>
          <p className={filterLabelCls}>Ordenar por:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setSortField(null); setShowSortPanel(false); }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                sortField === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Padrão
            </button>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setSortField(opt.id); setShowSortPanel(false); }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  sortField === opt.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete requests banner — admin only */}
      {isAdmin && (
        <DeleteRequestBanner
          requests={deleteRequests}
          onApprove={approveDelete}
          onReject={rejectDelete}
        />
      )}

      {/* Task list */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden shadow-sm">
        {filteredTasks.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                pendingDelete={pendingDeleteIds.has(String(task.id))}
                onToggleDone={toggleTaskDone}
                onEdit={setEditingTask}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={22} className="text-zinc-400" />
            </div>
            <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nenhuma tarefa encontrada</p>
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">Ajuste os filtros ou crie uma nova tarefa</p>
          </div>
        )}
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

      <OverdueModal
        tasks={scopedTasks}
        onGoToAtrasadas={() => setActiveFilter('atrasadas')}
      />
    </div>
  );
}
