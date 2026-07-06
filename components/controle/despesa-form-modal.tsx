'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Receipt } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { type LojaConfig } from '@/lib/controle-config';
import { type DespesaRecord } from '@/types/controle';
import { useConfigGlobal } from '@/hooks/use-config-global';

const schema = z.object({
  data:            z.string().min(1, 'Data obrigatória'),
  tipo_despesa:    z.string().min(1, 'Tipo obrigatório'),
  forma_pagamento: z.string().min(1, 'Forma de pagamento obrigatória'),
  banco_caixa:     z.string().min(1, 'Banco/Caixa obrigatório'),
  valor:           z.number().positive('Valor deve ser positivo'),
  observacao:      z.string(),
});

type FormValues = z.infer<typeof schema>;

const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1';

function nowDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function recordToForm(r: DespesaRecord): FormValues {
  const d = r.data instanceof Timestamp ? r.data.toDate() : new Date();
  return {
    data:            d.toISOString().slice(0, 10),
    tipo_despesa:    r.tipo_despesa,
    forma_pagamento: r.forma_pagamento,
    banco_caixa:     r.banco_caixa,
    valor:           r.valor,
    observacao:      r.observacao,
  };
}

interface Props {
  record?: DespesaRecord;
  loja: LojaConfig;
  onClose: () => void;
  onSave: (data: Omit<DespesaRecord, 'id' | 'createdAt'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function DespesaFormModal({ record, loja, onClose, onSave, onDelete }: Props) {
  const isEdit = !!record;
  const config = useConfigGlobal();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: record ? recordToForm(record) : {
      data:            nowDate(),
      tipo_despesa:    '',
      forma_pagamento: '',
      banco_caixa:     '',
      valor:           0,
      observacao:      '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const [y, m, d] = values.data.split('-').map(Number);
      await onSave({
        data:            Timestamp.fromDate(new Date(y, m - 1, d)),
        tipo_despesa:    values.tipo_despesa,
        forma_pagamento: values.forma_pagamento,
        banco_caixa:     values.banco_caixa,
        valor:           values.valor,
        observacao:      values.observacao,
      });
      toast.success(isEdit ? 'Despesa atualizada' : 'Despesa registrada');
      onClose();
    } catch {
      toast.error('Erro ao salvar');
    }
  }

  async function handleDelete() {
    if (!record || !onDelete) return;
    try {
      await onDelete(record.id);
      toast.success('Despesa excluída');
      onClose();
    } catch {
      toast.error('Erro ao excluir');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-red-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {isEdit ? 'Editar Despesa' : 'Nova Despesa'} · {loja.sigla}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Data</label>
            <input type="date" {...register('data')} className={inputCls} />
            {errors.data && <p className="text-xs text-red-500 mt-1">{errors.data.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo de Despesa</label>
              <select {...register('tipo_despesa')} className={inputCls}>
                <option value="">Selecionar...</option>
                {config.tipos_despesa.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.tipo_despesa && <p className="text-xs text-red-500 mt-1">{errors.tipo_despesa.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Forma de Pagamento</label>
              <select {...register('forma_pagamento')} className={inputCls}>
                <option value="">Selecionar...</option>
                {config.formas_pagamento.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {errors.forma_pagamento && <p className="text-xs text-red-500 mt-1">{errors.forma_pagamento.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Banco / Caixa</label>
              <select {...register('banco_caixa')} className={inputCls}>
                <option value="">Selecionar...</option>
                {config.bancos_caixa.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.banco_caixa && <p className="text-xs text-red-500 mt-1">{errors.banco_caixa.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input type="number" step="0.01" min="0" {...register('valor', { valueAsNumber: true })} className={inputCls} />
              {errors.valor && <p className="text-xs text-red-500 mt-1">{errors.valor.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Observação</label>
            <textarea {...register('observacao')} rows={2} className={`${inputCls} resize-none`} placeholder="Observações..." />
          </div>

          <div className="flex items-center justify-between pt-1">
            {isEdit && onDelete ? (
              <button type="button" onClick={handleDelete}
                className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 transition-colors">
                Excluir
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-500 border border-zinc-200 dark:border-white/[0.08] rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50">
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
