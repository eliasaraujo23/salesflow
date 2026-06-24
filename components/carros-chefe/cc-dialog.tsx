'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Star } from 'lucide-react';
import { addCarroChefeAction, updateCarroChefeAction, type CarroChefeDef } from '@/lib/actions/carros-chefe';
import { toast } from 'sonner';

const schema = z.object({
  label:      z.string().min(1, 'Nome obrigatório'),
  produto:    z.string(),
  subtipo:    z.string(),
  tipo_pedra: z.string(),
  lapidacao:  z.string(),
  order:      z.number().int().min(1),
});

type FormValues = z.infer<typeof schema>;

const PRODUTO_OPTS   = ['ANEL', 'BRINCO', 'COLAR', 'PULSEIRA', 'ALIANÇA', 'PINGENTE', 'ALIANÇA RIVIERA', 'BRINCO DE PRESSÃO'];
const SUBTIPO_OPTS   = ['SOLITÁRIO', 'PONTO DE LUZ', 'MEIA ALIANÇA', 'RIVIERA', 'MARACANÃ', 'PARA RIVIERA', 'MACIÇO', 'CHUVEIRO', 'PAVÊ', 'CRAVEJADO', 'INFINITO'];
const PEDRA_OPTS     = ['DIAMANTE', 'ESMERALDA', 'ESMERALDA COLOMBIANA', 'TURMALINA PARAÍBA', 'SAFIRA', 'RUBI', 'ALEXANDRITA', 'TOPÁZIO IMPERIAL'];
const LAPIDACAO_OPTS = ['BRILHANTE', 'PRINCESA', 'OVAL', 'PERA', 'MARQUISE', 'ESMERALDA', 'CORAÇÃO', 'CUSHION', 'ASSCHER'];

const inputCls  = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';
const labelCls  = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1';

interface Props {
  def?: CarroChefeDef;
  nextOrder: number;
  onClose: () => void;
}

export function CcDialog({ def, nextOrder, onClose }: Props) {
  const isEdit = !!def;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label:      def?.label      ?? '',
      produto:    def?.produto    ?? '',
      subtipo:    def?.subtipo    ?? '',
      tipo_pedra: def?.tipo_pedra ?? '',
      lapidacao:  def?.lapidacao  ?? '',
      order:      def?.order      ?? nextOrder,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && def) {
        await updateCarroChefeAction(def.id, values);
        toast.success('Carro-chefe atualizado');
      } else {
        await addCarroChefeAction(values);
        toast.success('Carro-chefe criado');
      }
      onClose();
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {isEdit ? 'Editar Carro-Chefe' : 'Novo Carro-Chefe'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className={labelCls}>Nome *</label>
              <input {...register('label')} className={inputCls} placeholder="Ex: Anel Solitário" />
              {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Ordem</label>
              <input type="number" min={1} {...register('order', { valueAsNumber: true })} className={inputCls} />
            </div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Filtros de correspondência <span className="font-normal normal-case">(deixe em branco para qualquer valor)</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo de Joia (produto)</label>
                <input list="produto-opts" {...register('produto')} className={inputCls} placeholder="Ex: ANEL" />
                <datalist id="produto-opts">
                  {PRODUTO_OPTS.map(o => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Subtipo</label>
                <input list="subtipo-opts" {...register('subtipo')} className={inputCls} placeholder="Ex: SOLITÁRIO" />
                <datalist id="subtipo-opts">
                  {SUBTIPO_OPTS.map(o => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Pedra <span className="font-normal opacity-50">(opcional)</span></label>
                <input list="pedra-opts" {...register('tipo_pedra')} className={inputCls} placeholder="Ex: DIAMANTE" />
                <datalist id="pedra-opts">
                  {PEDRA_OPTS.map(o => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Lapidação <span className="font-normal opacity-50">(opcional)</span></label>
                <input list="lap-opts" {...register('lapidacao')} className={inputCls} placeholder="Ex: BRILHANTE" />
                <datalist id="lap-opts">
                  {LAPIDACAO_OPTS.map(o => <option key={o} value={o} />)}
                </datalist>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
