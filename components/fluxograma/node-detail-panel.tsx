'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { type Node } from '@xyflow/react';
import { X, User, AlignLeft } from 'lucide-react';

const TYPE_META: Record<string, { label: string; color: string }> = {
  terminal: {
    label: 'Início / Fim',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  },
  process: {
    label: 'Etapa',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  decision: {
    label: 'Decisão',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
};

export interface NodeDetailValues {
  label:       string;
  description: string;
  responsavel: string;
}

interface Props {
  node: Node | null;
  onClose: () => void;
  onSave: (id: string, data: NodeDetailValues) => void;
}

export function NodeDetailPanel({ node, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<NodeDetailValues>({ defaultValues: { label: '', description: '', responsavel: '' } });

  useEffect(() => {
    if (!node) return;
    reset({
      label:       (node.data.label       as string) ?? '',
      description: (node.data.description as string) ?? '',
      responsavel: (node.data.responsavel as string) ?? '',
    });
  // Reset only when the selected node ID changes, not on every data update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  function onSubmit(values: NodeDetailValues) {
    if (!node) return;
    onSave(node.id, values);
    onClose();
  }

  const typeMeta = TYPE_META[(node?.data?.nodeType as string) ?? 'process'] ?? TYPE_META.process;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100 dark:border-white/[0.06] shrink-0">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${typeMeta.color}`}>
          {typeMeta.label}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Form */}
      {node && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4 flex-1">
          {/* Título */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
              Título
            </label>
            <input
              {...register('label', { required: 'Obrigatório' })}
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            />
            {errors.label && (
              <p className="text-xs text-red-500 mt-1">{errors.label.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
              <AlignLeft size={10} />
              Descrição
            </label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="O que acontece nesta etapa..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
          </div>

          {/* Responsável */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
              <User size={10} />
              Responsável
            </label>
            <input
              {...register('responsavel')}
              autoComplete="off"
              placeholder="Nome ou setor..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-auto pt-2">
            <button
              type="submit"
              disabled={!isDirty}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 text-sm hover:bg-zinc-50 dark:hover:bg-white/[0.05] transition-colors"
            >
              Fechar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
