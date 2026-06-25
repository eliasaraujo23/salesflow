'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, X } from 'lucide-react';
import { type PhotoBag } from '@/lib/actions/photo-bags';
import { useCreatePhotoBag, useUpdatePhotoBag } from '@/hooks/use-photo-bags';
import { toast } from 'sonner';

const schema = z.object({
  data_recebimento: z.string().min(1, 'Data obrigatória'),
  qtd_fabricado:  z.number().min(0),
  foto_fabricado: z.number().min(0),
  edit_fabricado: z.number().min(0),
  qtd_second:     z.number().min(0),
  foto_second:    z.number().min(0),
  edit_second:    z.number().min(0),
  qtd_scrap:      z.number().min(0),
  foto_scrap:     z.number().min(0),
  edit_scrap:     z.number().min(0),
  data_foto:        z.string().optional(),
  data_edicao:      z.string().optional(),
  data_finalizacao: z.string().optional(),
  observacao:       z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PhotoBagDialogProps {
  bag?: PhotoBag;
  code?: string;
  onClose: () => void;
}

const inputCls = 'w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 text-sm text-center focus:outline-none focus:border-indigo-500 transition-colors';
const labelCls = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1';

interface TypeRowProps {
  label: string;
  color: string;
  bg: string;
  recField: keyof FormValues;
  fotoField: keyof FormValues;
  editField: keyof FormValues;
  register: ReturnType<typeof useForm<FormValues>>['register'];
}

function TypeRow({ label, color, bg, recField, fotoField, editField, register }: TypeRowProps) {
  return (
    <div className={`grid gap-2 items-center rounded-lg px-3 py-2.5 ${bg}`} style={{ gridTemplateColumns: '90px repeat(3, 1fr)' }}>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      </div>
      <input type="number" min={0} {...register(recField,  { valueAsNumber: true })} className={inputCls} />
      <input type="number" min={0} {...register(fotoField, { valueAsNumber: true })} className={inputCls} />
      <input type="number" min={0} {...register(editField, { valueAsNumber: true })} className={inputCls} />
    </div>
  );
}

export function PhotoBagDialog({ bag, code, onClose }: PhotoBagDialogProps) {
  const isEdit = !!bag;
  const createMutation = useCreatePhotoBag();
  const updateMutation = useUpdatePhotoBag();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_recebimento: bag?.data_recebimento?.slice(0, 10) ?? '',
      qtd_fabricado:  bag?.qtd_fabricado  ?? 0,
      foto_fabricado: bag?.foto_fabricado ?? 0,
      edit_fabricado: bag?.edit_fabricado ?? 0,
      qtd_second:     bag?.qtd_second     ?? 0,
      foto_second:    bag?.foto_second    ?? 0,
      edit_second:    bag?.edit_second    ?? 0,
      qtd_scrap:      bag?.qtd_scrap      ?? 0,
      foto_scrap:     bag?.foto_scrap     ?? 0,
      edit_scrap:     bag?.edit_scrap     ?? 0,
      data_foto:        bag?.data_foto?.slice(0, 10)        ?? '',
      data_edicao:      bag?.data_edicao?.slice(0, 10)      ?? '',
      data_finalizacao: bag?.data_finalizacao?.slice(0, 10) ?? '',
      observacao:       bag?.observacao ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      data_foto:        values.data_foto        || null,
      data_edicao:      values.data_edicao      || null,
      data_finalizacao: values.data_finalizacao || null,
      observacao:       values.observacao       || null,
    };

    if (isEdit && bag) {
      const result = await updateMutation.mutateAsync({ id: bag.id, data: payload });
      if (result.httpStatus === 200) { toast.success('Saquinho atualizado!'); onClose(); }
      else toast.error(result.message ?? 'Erro ao atualizar');
    } else {
      const result = await createMutation.mutateAsync(payload);
      if (result.httpStatus === 201) { toast.success('Saquinho criado!'); onClose(); }
      else toast.error(result.message ?? 'Erro ao criar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Camera size={15} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {isEdit ? 'Editar Saquinho' : 'Novo Saquinho'}
            </h2>
            {isEdit && code && (
              <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                #{code}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data Recebimento</label>
              <input type="date" {...register('data_recebimento')} className={`${inputCls} text-left`} />
              {errors.data_recebimento && <p className="text-xs text-red-500 mt-1">{errors.data_recebimento.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Data Finalização <span className="font-normal opacity-50">(opcional)</span></label>
              <input type="date" {...register('data_finalizacao')} className={`${inputCls} text-left`} />
            </div>
          </div>

          {/* Header colunas */}
          <div className="grid gap-2" style={{ gridTemplateColumns: '90px repeat(3, 1fr)' }}>
            <div />
            <div className="text-center text-[10px] font-bold uppercase tracking-wide text-zinc-400">Recebido</div>
            <div className="text-center text-[10px] font-bold uppercase tracking-wide text-zinc-400">Fotografado</div>
            <div className="text-center text-[10px] font-bold uppercase tracking-wide text-zinc-400">Editado</div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            <TypeRow
              label="Fabricado" color="#3b82f6" bg="bg-blue-50/80 dark:bg-blue-500/10"
              recField="qtd_fabricado" fotoField="foto_fabricado" editField="edit_fabricado"
              register={register}
            />
            <TypeRow
              label="Second" color="#f97316" bg="bg-orange-50/80 dark:bg-orange-500/10"
              recField="qtd_second" fotoField="foto_second" editField="edit_second"
              register={register}
            />
            <TypeRow
              label="Scrap" color="#94a3b8" bg="bg-zinc-100/80 dark:bg-zinc-700/30"
              recField="qtd_scrap" fotoField="foto_scrap" editField="edit_scrap"
              register={register}
            />
          </div>

          {/* Observação */}
          <div>
            <label className={labelCls}>Observação <span className="font-normal opacity-50">(opcional)</span></label>
            <input
              type="text"
              {...register('observacao')}
              placeholder="Ex: saquinho urgente, lote especial…"
              className={`${inputCls} text-left`}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
