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
  data_recebimento: z.string().min(1, 'Data obrigatória'),
  qtd_fabricado: z.number().min(0),
  foto_fabricado: z.number().min(0),
  edit_fabricado: z.number().min(0),
  qtd_second: z.number().min(0),
  foto_second: z.number().min(0),
  edit_second: z.number().min(0),
  qtd_scrap: z.number().min(0),
  foto_scrap: z.number().min(0),
  edit_scrap: z.number().min(0),
  data_finalizacao: z.string().optional(),
  observacao: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PhotoBagDialogProps {
  bag?: PhotoBag;
  onClose: () => void;
}

const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors';
const numInputCls = `${inputCls} text-center`;
const labelCls = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1';

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {children}
      </div>
    </div>
  );
}

export function PhotoBagDialog({ bag, onClose }: PhotoBagDialogProps) {
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
      data_recebimento: bag?.data_recebimento?.slice(0, 10) ?? '',
      qtd_fabricado: bag?.qtd_fabricado ?? 0,
      foto_fabricado: bag?.foto_fabricado ?? 0,
      edit_fabricado: bag?.edit_fabricado ?? 0,
      qtd_second: bag?.qtd_second ?? 0,
      foto_second: bag?.foto_second ?? 0,
      edit_second: bag?.edit_second ?? 0,
      qtd_scrap: bag?.qtd_scrap ?? 0,
      foto_scrap: bag?.foto_scrap ?? 0,
      edit_scrap: bag?.edit_scrap ?? 0,
      data_finalizacao: bag?.data_finalizacao?.slice(0, 10) ?? '',
      observacao: bag?.observacao ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      data_finalizacao: values.data_finalizacao || null,
      observacao: values.observacao || null,
    };

    if (isEdit && bag) {
      const result = await updateMutation.mutateAsync({ id: bag.id, data: payload });
      if (result.httpStatus === 200) {
        toast.success('Lote atualizado!');
        onClose();
      } else {
        toast.error(result.message ?? 'Erro ao atualizar');
      }
    } else {
      const result = await createMutation.mutateAsync(payload);
      if (result.httpStatus === 201) {
        toast.success('Lote criado!');
        onClose();
      } else {
        toast.error(result.message ?? 'Erro ao criar');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {isEdit ? 'Editar Lote' : 'Novo Lote'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelCls}>Data de Recebimento</label>
            <input type="date" {...register('data_recebimento')} className={inputCls} />
            {errors.data_recebimento && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.data_recebimento.message}</p>
            )}
          </div>

          <FieldGroup label="Fabricado">
            <div>
              <label className={labelCls}>Qtd</label>
              <input type="number" min={0} {...register('qtd_fabricado', { valueAsNumber: true })} className={numInputCls} />
            </div>
            <div>
              <label className={labelCls}>Fotos</label>
              <input type="number" min={0} {...register('foto_fabricado', { valueAsNumber: true })} className={numInputCls} />
            </div>
            <div>
              <label className={labelCls}>Edições</label>
              <input type="number" min={0} {...register('edit_fabricado', { valueAsNumber: true })} className={numInputCls} />
            </div>
          </FieldGroup>

          <FieldGroup label="Second">
            <div>
              <label className={labelCls}>Qtd</label>
              <input type="number" min={0} {...register('qtd_second', { valueAsNumber: true })} className={numInputCls} />
            </div>
            <div>
              <label className={labelCls}>Fotos</label>
              <input type="number" min={0} {...register('foto_second', { valueAsNumber: true })} className={numInputCls} />
            </div>
            <div>
              <label className={labelCls}>Edições</label>
              <input type="number" min={0} {...register('edit_second', { valueAsNumber: true })} className={numInputCls} />
            </div>
          </FieldGroup>

          <FieldGroup label="Scrap">
            <div>
              <label className={labelCls}>Qtd</label>
              <input type="number" min={0} {...register('qtd_scrap', { valueAsNumber: true })} className={numInputCls} />
            </div>
            <div>
              <label className={labelCls}>Fotos</label>
              <input type="number" min={0} {...register('foto_scrap', { valueAsNumber: true })} className={numInputCls} />
            </div>
            <div>
              <label className={labelCls}>Edições</label>
              <input type="number" min={0} {...register('edit_scrap', { valueAsNumber: true })} className={numInputCls} />
            </div>
          </FieldGroup>

          <div>
            <label className={labelCls}>Data de Finalização (opcional)</label>
            <input type="date" {...register('data_finalizacao')} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Observação (opcional)</label>
            <textarea
              {...register('observacao')}
              rows={2}
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
