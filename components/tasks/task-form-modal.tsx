'use client';

import React from 'react';
import { X, Trash2, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type Task, type AppUser } from '@/components/firebase-provider';
import { type CreateTaskInput } from '@/lib/actions/create-task';
import { type UpdateTaskInput } from '@/lib/actions/update-task';

const taskFormSchema = z.object({
  title:       z.string().min(1, 'Título é obrigatório'),
  person:      z.string().min(1, 'Responsável é obrigatório'),
  priority:    z.enum(['urgente', 'alta', 'media', 'baixa']),
  status:      z.enum(['pendente', 'progress', 'blocked', 'done']),
  noPrazo:     z.boolean(),
  dueDate:     z.string().optional(),
  description: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormModalProps {
  mode: 'new' | 'edit';
  task?: Task;
  isAdmin: boolean;
  currentUser: AppUser | null;
  users: AppUser[];
  submitting: boolean;
  onClose: () => void;
  onSaveNew: (data: CreateTaskInput) => void;
  onSaveEdit: (data: UpdateTaskInput) => void;
  onAdminDelete: (taskId: string | number) => void;
  onRequestDelete: (task: Task) => void;
}

function dueToBRToInput(due: string): string {
  if (!due || due === 'Sem prazo') return '';
  const [d, m, y] = due.split('/');
  if (!d || !m || !y) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function dateInputToBR(val: string): string {
  if (!val) return 'Sem prazo';
  const [y, m, d] = val.split('-');
  return `${d}/${m}/${y}`;
}

const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-800 dark:text-zinc-200 text-[13px] focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-colors';
const labelCls = 'block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-[0.6px]';

export function TaskFormModal({
  mode, task, isAdmin, currentUser, users, submitting,
  onClose, onSaveNew, onSaveEdit, onAdminDelete, onRequestDelete,
}: TaskFormModalProps) {
  const isNew = mode === 'new';

  const { register, handleSubmit, watch, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title:       task?.title ?? '',
      person:      task?.person ?? currentUser?.personKey ?? '',
      priority:    (task?.priority as TaskFormValues['priority']) ?? 'media',
      status:      (task?.status as TaskFormValues['status']) ?? 'pendente',
      noPrazo:     !task?.due || task.due === 'Sem prazo',
      dueDate:     task ? dueToBRToInput(task.due) : '',
      description: task?.description ?? '',
    },
  });

  const noPrazo = watch('noPrazo');

  const peopleOptions = isAdmin
    ? users.filter((u) => u.personKey).map((u) => ({ key: u.personKey, name: u.name }))
    : currentUser
    ? [{ key: currentUser.personKey, name: currentUser.name }]
    : [];

  function onSubmit(values: TaskFormValues) {
    const due = values.noPrazo
      ? 'Sem prazo'
      : values.dueDate
      ? dateInputToBR(values.dueDate)
      : 'Sem prazo';
    const person = isAdmin ? values.person : (currentUser?.personKey ?? '');

    if (isNew) {
      onSaveNew({ title: values.title, person, priority: values.priority, status: values.status, due, description: values.description });
    } else if (task) {
      onSaveEdit({ id: task.id, title: values.title, person, priority: values.priority, status: values.status, due, description: values.description });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-white/[0.06] w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
            {isNew ? 'Nova Tarefa' : 'Editar Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Título</label>
            <input
              {...register('title')}
              placeholder="Descreva a tarefa..."
              className={inputCls}
              autoFocus
            />
            {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          {isAdmin && (
            <div>
              <label className={labelCls}>Responsável</label>
              <select {...register('person')} className={inputCls}>
                <option value="">Selecionar...</option>
                {peopleOptions.map((p) => (
                  <option key={p.key} value={p.key}>{p.name}</option>
                ))}
              </select>
              {errors.person && <p className="text-[11px] text-red-500 mt-1">{errors.person.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridade</label>
              <select {...register('priority')} className={inputCls}>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select {...register('status')} className={inputCls}>
                <option value="pendente">Pendente</option>
                <option value="progress">Em andamento</option>
                {!isNew && <option value="blocked">Bloqueada</option>}
                {!isNew && <option value="done">Concluída</option>}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Prazo</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                {...register('dueDate')}
                disabled={noPrazo}
                className={`flex-1 ${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              />
              <label className="flex items-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register('noPrazo')}
                  className="w-3.5 h-3.5 rounded accent-indigo-600"
                />
                Sem prazo
              </label>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Contexto adicional..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {!isNew && task ? (
              isAdmin ? (
                <button
                  type="button"
                  onClick={() => onAdminDelete(task.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[12px] font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={13} /> Excluir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRequestDelete(task)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[12px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                >
                  <Send size={13} /> Solicitar exclusão
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 text-[12px] font-semibold hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Salvando...' : isNew ? 'Criar tarefa' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
