'use client';

import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Scale } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { type LojaConfig, EMPRESA_TIPO_MAP } from '@/lib/controle-config';
import { type MetalRecord, QUALIDADES, QUALIDADE_LABELS } from '@/types/controle';
import { useControleOpcoes } from '@/hooks/use-controle-opcoes';

const schema = z.object({
  data:         z.string().min(1, 'Data obrigatória'),
  hora:         z.string().min(1, 'Hora obrigatória'),
  av1:          z.string().min(1, '1º avaliador obrigatório'),
  av2:          z.string(),
  av3:          z.string(),
  av4:          z.string(),
  nome:         z.string().min(1, 'Nome obrigatório'),
  cpf:          z.string(),
  transacao:    z.enum(['COMPRA', 'NAO_COMPRA']),
  feedback:     z.string().min(1, 'Feedback obrigatório'),
  motivo_nc:    z.string(),
  tipo:         z.string(),
  razao_social: z.string(),
  ouro_24k:     z.number().min(0),
  ouro_22k:     z.number().min(0),
  pt:           z.number().min(0),
  ouro_750:     z.number().min(0),
  ouro_720:     z.number().min(0),
  bx:           z.number().min(0),
  platina:      z.number().min(0),
  prata:        z.number().min(0),
  preco:        z.number().min(0),
  valor:        z.number().min(0),
  observacao:   z.string(),
});

type FormValues = z.infer<typeof schema>;

const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1';

function nowDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowTime(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

function recordToFormValues(r: MetalRecord): FormValues {
  const d = r.data instanceof Timestamp ? r.data.toDate() : new Date();
  return {
    data:         d.toISOString().slice(0, 10),
    hora:         r.hora,
    av1:          r.avaliadores[0] ?? '',
    av2:          r.avaliadores[1] ?? '',
    av3:          r.avaliadores[2] ?? '',
    av4:          r.avaliadores[3] ?? '',
    nome:         r.nome,
    cpf:          r.cpf,
    transacao:    r.transacao,
    feedback:     r.feedback,
    motivo_nc:    r.motivo_nc,
    tipo:         r.tipo ?? '',
    razao_social: r.razao_social ?? '',
    ouro_24k:     r.ouro_24k,
    ouro_22k:     r.ouro_22k,
    pt:           r.pt,
    ouro_750:     r.ouro_750,
    ouro_720:     r.ouro_720,
    bx:           r.bx,
    platina:      r.platina,
    prata:        r.prata,
    preco:        r.preco,
    valor:        r.valor,
    observacao:   r.observacao,
  };
}

interface Props {
  record?: MetalRecord;
  loja: LojaConfig;
  codInterno: string;
  onClose: () => void;
  onSave: (data: Omit<MetalRecord, 'id' | 'createdAt'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function MetalFormModal({ record, loja, codInterno, onClose, onSave, onDelete }: Props) {
  const isEdit = !!record;
  const opcoes = useControleOpcoes(loja.code);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: record ? recordToFormValues(record) : {
      data:         nowDate(),
      hora:         nowTime(),
      av1:          '',
      av2:          '',
      av3:          '',
      av4:          '',
      nome:         '',
      cpf:          '',
      transacao:    'COMPRA',
      feedback:     '',
      motivo_nc:    '',
      tipo:         '',
      razao_social: '',
      ouro_24k:     0,
      ouro_22k:     0,
      pt:           0,
      ouro_750:     0,
      ouro_720:     0,
      bx:           0,
      platina:      0,
      prata:        0,
      preco:        0,
      valor:        0,
      observacao:   '',
    },
  });

  const transacao = watch('transacao');
  const feedbackOptions = transacao === 'COMPRA' ? opcoes.feedbacks_compra : opcoes.feedbacks_nc;
  const razaoSocialWatch = watch('razao_social');

  useEffect(() => { setValue('feedback', ''); }, [transacao, setValue]);

  useEffect(() => {
    const mapped = EMPRESA_TIPO_MAP[razaoSocialWatch];
    if (mapped) setValue('tipo', mapped);
  }, [razaoSocialWatch, setValue]);

  const qualValues = QUALIDADES.map(q => watch(q as keyof FormValues) as number);
  const totalPeso = useMemo(() => qualValues.reduce((sum, v) => sum + (Number(v) || 0), 0), [qualValues]);

  const valorWatch = watch('valor');
  const pagoPorGrama = totalPeso > 0 ? ((Number(valorWatch) || 0) / totalPeso) : 0;

  async function onSubmit(values: FormValues) {
    try {
      const [y, m, d] = values.data.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const totalPesoCalc = QUALIDADES.reduce((sum, q) => sum + (Number(values[q as keyof FormValues]) || 0), 0);
      const pagoPorGramaCalc = totalPesoCalc > 0 ? values.valor / totalPesoCalc : 0;
      const avaliadores = [values.av1, values.av2, values.av3, values.av4].filter(Boolean);

      await onSave({
        cod_interno:    record?.cod_interno ?? codInterno,
        data:           Timestamp.fromDate(date),
        hora:           values.hora,
        avaliadores,
        nome:           values.nome,
        cpf:            values.cpf,
        transacao:      values.transacao,
        feedback:       values.feedback,
        motivo_nc:      values.motivo_nc,
        tipo:           values.tipo,
        razao_social:   values.razao_social,
        ouro_24k:       values.ouro_24k,
        ouro_22k:       values.ouro_22k,
        pt:             values.pt,
        ouro_750:       values.ouro_750,
        ouro_720:       values.ouro_720,
        bx:             values.bx,
        platina:        values.platina,
        prata:          values.prata,
        total_peso:     totalPesoCalc,
        preco:          values.preco,
        valor:          values.valor,
        pago_por_grama: pagoPorGramaCalc,
        observacao:     values.observacao,
      });
      toast.success(isEdit ? 'Registro atualizado' : 'Registro salvo');
      onClose();
    } catch {
      toast.error('Erro ao salvar');
    }
  }

  async function handleDelete() {
    if (!record || !onDelete) return;
    try {
      await onDelete(record.id);
      toast.success('Registro excluído');
      onClose();
    } catch {
      toast.error('Erro ao excluir');
    }
  }

  const avSelectCls = `${inputCls} appearance-none`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl w-full max-w-2xl shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Scale size={14} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {isEdit ? 'Editar Avaliação' : 'Nova Avaliação'} · {loja.sigla}
            </h2>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">{record?.cod_interno ?? codInterno}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          {/* Transação */}
          <div className="flex gap-3">
            {(['COMPRA', 'NAO_COMPRA'] as const).map(t => (
              <label
                key={t}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border cursor-pointer text-sm font-semibold transition-all ${
                  transacao === t
                    ? t === 'COMPRA'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-red-500 border-red-500 text-white'
                    : 'border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/[0.15]'
                }`}
              >
                <input type="radio" {...register('transacao')} value={t} className="sr-only" />
                {t === 'COMPRA' ? 'COMPRA' : 'NÃO COMPRA'}
              </label>
            ))}
          </div>

          {/* Data / Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" {...register('data')} className={inputCls} />
              {errors.data && <p className="text-xs text-red-500 mt-1">{errors.data.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Hora</label>
              <input type="time" {...register('hora')} className={inputCls} />
            </div>
          </div>

          {/* Avaliadores AV1 / AV2 / AV3 / AV4 */}
          <div>
            <label className={labelCls}>Avaliadores</label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">AV1 *</label>
                <select {...register('av1')} className={avSelectCls}>
                  <option value="">—</option>
                  {opcoes.avaliadores.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                {errors.av1 && <p className="text-[10px] text-red-500 mt-0.5">{errors.av1.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">AV2</label>
                <select {...register('av2')} className={avSelectCls}>
                  <option value="">—</option>
                  {opcoes.avaliadores.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">AV3</label>
                <select {...register('av3')} className={avSelectCls}>
                  <option value="">—</option>
                  {opcoes.avaliadores.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">AV4</label>
                <select {...register('av4')} className={avSelectCls}>
                  <option value="">—</option>
                  {opcoes.avaliadores.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Nome / CPF */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nome do Cliente</label>
              <input {...register('nome')} placeholder="Nome completo" className={inputCls} />
              {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <label className={labelCls}>CPF</label>
              <input {...register('cpf')} placeholder="000.000.000-00" className={inputCls} />
            </div>
          </div>

          {/* Tipo / Razão Social */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo (Modalidade)</label>
              <select {...register('tipo')} className={inputCls}>
                <option value="">Selecionar...</option>
                {opcoes.tipos.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Razão Social</label>
              <select {...register('razao_social')} className={inputCls}>
                <option value="">Selecionar...</option>
                {opcoes.empresas.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Qualidades */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Peso por Qualidade (g)</label>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                Total: <strong className="text-zinc-800 dark:text-zinc-200">{totalPeso.toFixed(3)}g</strong>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {QUALIDADES.map(q => (
                <div key={q}>
                  <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 mb-1 text-center">{QUALIDADE_LABELS[q]}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    {...register(q as keyof FormValues, { valueAsNumber: true })}
                    className={`${inputCls} text-center`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preço / Valor */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Preço Ofertado (R$/g)</label>
              <input type="number" step="0.01" min="0" {...register('preco', { valueAsNumber: true })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Valor Pago (R$)</label>
              <input type="number" step="0.01" min="0" {...register('valor', { valueAsNumber: true })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pago/g (calculado)</label>
              <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                R$ {pagoPorGrama.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                {transacao === 'COMPRA' ? 'Feedback' : 'Motivo Não Compra'}
              </label>
              <select {...register('feedback')} className={inputCls}>
                <option value="">Selecionar...</option>
                {feedbackOptions.map((f, idx) => (
                  <option key={f} value={f}>
                    {transacao === 'NAO_COMPRA' ? `${idx + 1} · ${f}` : f}
                  </option>
                ))}
              </select>
              {errors.feedback && <p className="text-xs text-red-500 mt-1">{errors.feedback.message}</p>}
            </div>
            {transacao === 'NAO_COMPRA' && (
              <div>
                <label className={labelCls}>Motivo Detalhado</label>
                <input {...register('motivo_nc')} placeholder="Detalhes adicionais..." className={inputCls} />
              </div>
            )}
          </div>

          {/* Observação */}
          <div>
            <label className={labelCls}>Observação</label>
            <textarea {...register('observacao')} rows={2} className={`${inputCls} resize-none`} placeholder="Observações adicionais..." />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              >
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
