'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { type PhotoBag } from '@/lib/actions/photo-bags';
import { useCreatePhotoBag, useUpdatePhotoBag } from '@/hooks/use-photo-bags';
import { toast } from 'sonner';

const schema = z.object({
  cod_saquinho: z.string().min(1, 'Código obrigatório'),
  responsavel: z.string().min(1, 'Responsável obrigatório'),
  status: z.enum(['pendente', 'fotografado', 'catalogado', 'finalizado']),
  detalhes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PhotoBagDialogProps {
  bag?: PhotoBag;
  onClose: () => void;
  currentUser: string;
}

export function PhotoBagDialog({ bag, onClose, currentUser }: PhotoBagDialogProps) {
  const isEdit = !!bag;
  const createMutation = useCreatePhotoBag();
  const updateMutation = useUpdatePhotoBag();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cod_saquinho: bag?.cod_saquinho ?? '',
      responsavel: bag?.responsavel ?? currentUser,
      status: bag?.status ?? 'pendente',
      detalhes: bag?.detalhes ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (isEdit && bag) {
      const result = await updateMutation.mutateAsync({ id: bag.id, data: values });
      if (result.httpStatus === 200) {
        toast.success('Saquinho atualizado!');
        onClose();
      } else {
        toast.error(result.message ?? 'Erro ao atualizar');
      }
    } else {
      const result = await createMutation.mutateAsync(values);
      if (result.httpStatus === 201) {
        toast.success('Saquinho criado!');
        onClose();
      } else {
        toast.error(result.message ?? 'Erro ao criar');
      }
    }
  };

  const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {isEdit ? 'Editar Saquinho' : 'Novo Saquinho'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Código</label>
            <input
              {...register('cod_saquinho')}
              placeholder="Ex: SAQ-001"
              className={inputCls}
            />
            {errors.cod_saquinho && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.cod_saquinho.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Responsável</label>
            <input
              {...register('responsavel')}
              className={inputCls}
            />
            {errors.responsavel && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.responsavel.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Status</label>
            <select {...register('status')} className={inputCls}>
              <option value="pendente">Pendente</option>
              <option value="fotografado">Fotografado</option>
              <option value="catalogado">Catalogado</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Detalhes</label>
            <textarea
              {...register('detalhes')}
              rows={3}
              placeholder="Opcional"
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
