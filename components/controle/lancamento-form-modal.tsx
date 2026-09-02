'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { type LojaConfig } from '@/lib/controle-config';
import { type LancamentoRecord } from '@/types/controle';
import { useConfigGlobal } from '@/hooks/use-config-global';
import { todayLocalISO } from '@/lib/date-utils';

const schema = z.object({
  data:      z.string().min(1, 'Data obrigatória'),
  tipo:      z.string().min(1, 'Tipo obrigatório'),
  banco:     z.string().min(1, 'Banco/Caixa obrigatório'),
  descricao: z.string(),
  valor:     z.number().positive('Valor deve ser positivo'),
});

type FormValues = z.infer<typeof schema>;

const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1';

function nowDate(): string { return todayLocalISO(); }

function recordToForm(r: LancamentoRecord): FormValues {
  return {
    data:      r.data,
    tipo:      r.tipo_lancamento_id ?? '',
    banco:     r.banco_caixa_id ?? '',
    descricao: r.descricao,
    valor:     r.valor,
  };
}

interface Props {
  record?: LancamentoRecord;
  loja: LojaConfig;
  onClose: () => void;
  onSave: (data: Omit<LancamentoRecord, 'id' | 'created_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function LancamentoFormModal({ record, loja, onClose, onSave, onDelete }: Props) {
  const isEdit = !!record;
  const config = useConfigGlobal();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: record ? recordToForm(record) : {
      data:      nowDate(),
      tipo:      '',
      banco:     '',
      descricao: '',
      valor:     0,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await onSave({
        data:               values.data,
        tipo_lancamento_id: values.tipo || null,
        banco_caixa_id:     values.banco || null,
        descricao:          values.descricao,
        valor:              values.valor,
      });
      toast.success(isEdit ? 'Lançamento atualizado' : 'Lançamento registrado');
      onClose();
    } catch {
      toast.error('Erro ao salvar');
    }
  }

  async function handleDelete() {
    if (!record || !onDelete) return;
    try {
      await onDelete(record.id);
      toast.success('Lançamento excluído');
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
            <ArrowLeftRight size={14} className="text-blue-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {isEdit ? 'Editar Lançamento' : 'Novo Lançamento'} · {loja.sigla}
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
              <label className={labelCls}>Tipo</label>
              <select {...register('tipo')} className={inputCls}>
                <option value="">Selecionar...</option>
                {config.tipos_lancamento.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              {errors.tipo && <p className="text-xs text-red-500 mt-1">{errors.tipo.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Banco / Caixa</label>
              <select {...register('banco')} className={inputCls}>
                <option value="">Selecionar...</option>
                {config.bancos_caixa.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
              {errors.banco && <p className="text-xs text-red-500 mt-1">{errors.banco.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input type="number" step="0.01" min="0" {...register('valor', { valueAsNumber: true })} className={inputCls} />
              {errors.valor && <p className="text-xs text-red-500 mt-1">{errors.valor.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <input {...register('descricao')} placeholder="Referência..." className={inputCls} />
            </div>
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
