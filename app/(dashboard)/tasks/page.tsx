'use client';

import React from 'react';
import { FilterCard } from '@/components/tasks/filter-card';
import { TaskItem } from '@/components/tasks/task-item';
import { TaskFormModal } from '@/components/tasks/task-form-modal';
import { TaskBulkBar } from '@/components/tasks/task-bulk-bar';
import { BatchCompleteModal } from '@/components/tasks/batch-complete-modal';
import { DeleteRequestBanner } from '@/components/tasks/delete-request-banner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OverdueModal } from '@/components/tasks/overdue-modal';
import { useTasksPage } from '@/hooks/use-tasks-page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClipboardList, Plus, Filter, ArrowDownUp, Check } from 'lucide-react';

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
    filterPerson, setFilterPerson,
    filterPriority, setFilterPriority,
    sortField, setSortField,
    editingTask, setEditingTask,
    showNewModal, setShowNewModal,
    submitting,
    pendingConfirm, resolvePendingConfirm,
    selectedIds, selectedTasks,
    toggleSelect, clearSelection,
    batchComplete, batchDelete,
    toggleTaskDone, saveNewTask, saveEditTask,
    adminDeleteTask, deleteTaskDirect, requestDelete,
    approveDelete, rejectDelete,
    scopedTasks, resolvePerson,
  } = useTasksPage();

  const pendingDeleteIds = new Set(deleteRequests.map((r) => String(r.taskId)));

  const selectCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-700 dark:text-zinc-300 text-[13px] focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-colors';
  const filterLabelCls = 'block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-2.5 uppercase tracking-[0.6px]';

  const activeFilterCount = (filterPerson ? 1 : 0) + (filterPriority ? 1 : 0);

  const PRIORITY_CHIPS = [
    { value: 'urgente', label: 'Urgente', color: 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' },
    { value: 'alta',    label: 'Alta',    color: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
    { value: 'media',   label: 'Média',   color: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' },
    { value: 'baixa',   label: 'Baixa',   color: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' },
  ];

  const isConfirmDialog = !!pendingConfirm && pendingConfirm.type !== 'batch-complete';
  const confirmTitle =
    pendingConfirm?.type === 'batch-delete'
      ? `Excluir ${(pendingConfirm as { type: 'batch-delete'; taskIds: (string | number)[] }).taskIds.length} tarefas`
      : pendingConfirm?.type === 'delete'
      ? 'Excluir tarefa'
      : 'Concluir tarefa';
  const confirmDesc =
    pendingConfirm?.type === 'delete' || pendingConfirm?.type === 'batch-delete'
      ? 'Excluir definitivamente? Essa ação não pode ser desfeita.'
      : 'Ao confirmar, esta tarefa será arquivada. Tarefas concluídas não podem ser reabertas.';
  const confirmLabel =
    pendingConfirm?.type === 'delete' || pendingConfirm?.type === 'batch-delete' ? 'Excluir' : 'Concluir';

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
          {/* Filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all ${
                activeFilterCount > 0
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12]'
              }`}>
                <Filter size={13} />
                Filtrar
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none">{activeFilterCount}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-4 space-y-4">
              {/* Priority chips */}
              <div>
                <label className={filterLabelCls}>Prioridade</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRIORITY_CHIPS.map(chip => (
                    <button
                      key={chip.value}
                      onClick={() => setFilterPriority(filterPriority === chip.value ? '' : chip.value)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition-all ${
                        filterPriority === chip.value
                          ? chip.color
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/[0.12]'
                      }`}
                    >
                      {chip.label}
                      {filterPriority === chip.value && <Check size={11} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Person select — admin only */}
              {isAdmin && (
                <div>
                  <label className={filterLabelCls}>Responsável</label>
                  <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className={selectCls}>
                    <option value="">Todos</option>
                    {users.filter(u => u.personKey).map(u => (
                      <option key={u.personKey} value={u.personKey}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterPriority(''); setFilterPerson(''); }}
                  className="w-full text-center text-[12px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </PopoverContent>
          </Popover>

          {/* Sort popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all ${
                sortField !== null
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.12]'
              }`}>
                <ArrowDownUp size={13} />
                Ordenar
                {sortField !== null && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-2">
              {[{ id: null, label: 'Padrão' }, ...SORT_OPTIONS].map(opt => (
                <button
                  key={String(opt.id)}
                  onClick={() => setSortField(opt.id as typeof sortField)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    sortField === opt.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {opt.label}
                  {sortField === opt.id && <Check size={13} strokeWidth={2.5} />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filter cards (substituem KPIs + chips) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <FilterCard label="Todas"       count={filterCounts.todas}      subtext="tarefas em aberto"   variant="blue"   active={activeFilter === 'todas'}      onClick={() => { setActiveFilter('todas');      clearSelection(); }} />
        <FilterCard label="Hoje"        count={filterCounts.hoje}       subtext="vencem hoje"         variant="indigo" active={activeFilter === 'hoje'}       onClick={() => { setActiveFilter('hoje');       clearSelection(); }} />
        <FilterCard label="Amanhã"      count={filterCounts.amanha}     subtext="vencem amanhã"       variant="purple" active={activeFilter === 'amanha'}     onClick={() => { setActiveFilter('amanha');     clearSelection(); }} />
        <FilterCard label="Esta semana" count={filterCounts.semana}     subtext="nos próximos 7 dias" variant="amber"  active={activeFilter === 'semana'}     onClick={() => { setActiveFilter('semana');     clearSelection(); }} />
        <FilterCard label="Atrasadas"   count={filterCounts.atrasadas}  subtext="precisam de atenção" variant="red"    active={activeFilter === 'atrasadas'}  onClick={() => { setActiveFilter('atrasadas');  clearSelection(); }} />
        <FilterCard label="Concluídas"  count={filterCounts.concluidas} subtext="finalizadas"         variant="green"  active={activeFilter === 'concluidas'} onClick={() => { setActiveFilter('concluidas'); clearSelection(); }} />
      </div>

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
                selected={selectedIds.has(String(task.id))}
                onSelect={toggleSelect}
                onComplete={toggleTaskDone}
                onEdit={setEditingTask}
                onDelete={deleteTaskDirect}
                resolvePerson={resolvePerson}
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
        open={isConfirmDialog}
        onOpenChange={open => { if (!open) void resolvePendingConfirm(false); }}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel={confirmLabel}
        onConfirm={() => void resolvePendingConfirm(true)}
      />

      <BatchCompleteModal
        open={pendingConfirm?.type === 'batch-complete'}
        tasks={pendingConfirm?.type === 'batch-complete' ? pendingConfirm.tasks : []}
        onConfirm={() => void resolvePendingConfirm(true)}
        onCancel={() => void resolvePendingConfirm(false)}
      />

      <OverdueModal
        tasks={scopedTasks}
        onGoToAtrasadas={() => setActiveFilter('atrasadas')}
      />

      {/* Barra de ações em lote */}
      {selectedIds.size > 0 && (
        <TaskBulkBar
          count={selectedIds.size}
          onComplete={batchComplete}
          onDelete={batchDelete}
          onClear={clearSelection}
        />
      )}
    </div>
  );
}
