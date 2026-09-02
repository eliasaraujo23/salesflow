'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { type LojaConfig } from '@/lib/controle-config';
import { type MetalRecord, QUALIDADES, QUALIDADE_LABELS } from '@/types/controle';
import { useControleOpcoes } from '@/hooks/use-controle-opcoes';
import { useConfigGlobal } from '@/hooks/use-config-global';
import { localISO, todayLocalISO } from '@/lib/date-utils';
import { type AvaliadorItem } from '@/lib/actions/controle-lojas-config';
import { SingleDatePicker } from '@/components/ui/single-date-picker';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  motivo_nc_id: z.string(),
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
  preco:        z.union([z.literal(''), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  valor:        z.number().min(0),
  observacao:   z.string(),
}).superRefine((values, ctx) => {
  if (values.transacao === 'NAO_COMPRA' && !values.motivo_nc_id) {
    ctx.addIssue({ code: 'custom', path: ['motivo_nc_id'], message: 'Motivo obrigatório' });
  }
  if (values.transacao === 'COMPRA' && values.preco === '') {
    ctx.addIssue({ code: 'custom', path: ['preco'], message: 'Selecione de 1 a 5' });
  }
});

type FormValues = z.infer<typeof schema>;

const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1';

function nowDate(): string { return todayLocalISO(); }

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function recordToFormValues(r: MetalRecord): FormValues {
  const d = new Date(`${r.data}T00:00:00`);
  return {
    data:         localISO(d),
    hora:         r.hora,
    av1:          r.avaliadores[0] ?? '',
    av2:          r.avaliadores[1] ?? '',
    av3:          r.avaliadores[2] ?? '',
    av4:          r.avaliadores[3] ?? '',
    nome:         r.nome,
    cpf:          r.cpf,
    transacao:    r.transacao,
    feedback:     r.feedback_id ?? '',
    motivo_nc_id: r.feedback_nc_id ?? '',
    tipo:         r.modalidade_id ?? '',
    razao_social: r.empresa_id ?? '',
    ouro_24k:     r.ouro_24k,
    ouro_22k:     r.ouro_22k,
    pt:           r.pt,
    ouro_750:     r.ouro_750,
    ouro_720:     r.ouro_720,
    bx:           r.bx,
    platina:      r.platina,
    prata:        r.prata,
    preco:        ([1, 2, 3, 4, 5].includes(r.preco) ? r.preco : '') as FormValues['preco'],
    valor:        r.valor,
    observacao:   r.observacao,
  };
}

interface Props {
  record?: MetalRecord;
  loja: LojaConfig;
  codInterno: string;
  onClose: () => void;
  onSave: (data: Omit<MetalRecord, 'id' | 'created_at' | 'datetime' | 'total_peso' | 'pago_por_grama'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function MetalFormModal({ record, loja, codInterno, onClose, onSave, onDelete }: Props) {
  const isEdit = !!record;
  const opcoes = useControleOpcoes(loja.code);
  const global = useConfigGlobal();

  function avaliadorOptionsFor(idAtual: string | undefined): AvaliadorItem[] {
    if (idAtual && !opcoes.avaliadores.some(a => a.id === idAtual)) {
      const inativo = global.avaliadores.find(a => a.id === idAtual);
      if (inativo) return [inativo, ...opcoes.avaliadores];
    }
    return opcoes.avaliadores;
  }

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({
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
      motivo_nc_id: '',
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
      preco:        '',
      valor:        0,
      observacao:   '',
    },
  });

  const transacao = watch('transacao');
  const razaoSocialWatch = watch('razao_social');
  const motivoNcId = watch('motivo_nc_id');
  const isNaoCompra = transacao === 'NAO_COMPRA';
  const isBijuteria = isNaoCompra && motivoNcId === '4';

  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) return;
    if (transacao === 'COMPRA') setValue('motivo_nc_id', '');
  }, [transacao, setValue]);

  useEffect(() => {
    if (!mountedRef.current) return;
    const empresa = opcoes.empresas.find(e => e.id === razaoSocialWatch);
    if (empresa?.modalidade_id) setValue('tipo', empresa.modalidade_id);
  }, [razaoSocialWatch, setValue, opcoes.empresas]);

  useEffect(() => {
    // Só zera pesos quando o usuário troca o motivo NC durante a edição —
    // nunca ao abrir um registro já salvo, mesmo que ele esteja inconsistente
    // (peso preenchido num motivo Bijuteria salvo antes desta regra existir).
    if (!mountedRef.current) return;
    if (isBijuteria) {
      QUALIDADES.forEach(q => setValue(q as keyof FormValues, 0));
    }
  }, [isBijuteria, setValue]);

  useEffect(() => {
    // Nenhuma NÃO_COMPRA tem "preço ofertado" de verdade — só compras.
    if (!mountedRef.current) return;
    if (isNaoCompra) setValue('preco', '');
  }, [isNaoCompra, setValue]);

  // Marca "montado" só depois de todos os effects de auto-preenchimento acima
  // já terem rodado no primeiro ciclo, para não contarem como edição do usuário.
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const qualValues = QUALIDADES.map(q => watch(q as keyof FormValues) as number);
  const totalPeso = useMemo(() => qualValues.reduce((sum, v) => sum + (Number(v) || 0), 0), [qualValues]);

  const valorWatch = watch('valor');
  const pagoPorGrama = totalPeso > 0 ? ((Number(valorWatch) || 0) / totalPeso) : 0;

  async function onSubmit(values: FormValues) {
    try {
      const avaliadores = [values.av1, values.av2, values.av3, values.av4].filter(Boolean);
      const isCompra = values.transacao === 'COMPRA';

      await onSave({
        cod_interno:        record?.cod_interno ?? codInterno,
        data:               values.data,
        hora:               values.hora,
        avaliadores,
        nome:               values.nome,
        cpf:                values.cpf,
        transacao:          values.transacao,
        feedback_id:        values.feedback || null,
        feedback_nc_id:     !isCompra ? (values.motivo_nc_id || null) : null,
        modalidade_id:      values.tipo || null,
        empresa_id:         values.razao_social || null,
        ouro_24k:           values.ouro_24k,
        ouro_22k:           values.ouro_22k,
        pt:                 values.pt,
        ouro_750:           values.ouro_750,
        ouro_720:           values.ouro_720,
        bx:                 values.bx,
        platina:            values.platina,
        prata:              values.prata,
        preco:              values.preco === '' ? 1 : values.preco,
        valor:              values.valor,
        observacao:         values.observacao,
      });
      if (isEdit) {
        toast.success('Avaliação atualizada com sucesso!');
      } else {
        toast.success(isCompra ? 'Compra efetuada com sucesso!' : 'Não compra registrada com sucesso!');
      }
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

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  function handleClose() {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
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
          <button onClick={handleClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
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
              <Controller
                name="data"
                control={control}
                render={({ field }) => (
                  <SingleDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    clearable={false}
                    placeholder="dd/mm/aaaa"
                  />
                )}
              />
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
              {(['av1', 'av2', 'av3', 'av4'] as const).map((field, i) => {
                const valorAtual = watch(field);
                return (
                  <div key={field}>
                    <label className="block text-[10px] text-zinc-400 mb-1">AV{i + 1}{i === 0 ? ' *' : ''}</label>
                    <select {...register(field)} className={avSelectCls}>
                      <option value="">—</option>
                      {avaliadorOptionsFor(valorAtual).map(a => (
                        <option key={a.id} value={a.id}>{a.nome}{!a.ativo ? ' (inativo)' : ''}</option>
                      ))}
                    </select>
                    {field === 'av1' && errors.av1 && <p className="text-[10px] text-red-500 mt-0.5">{errors.av1.message}</p>}
                  </div>
                );
              })}
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
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Razão Social</label>
              <select {...register('razao_social')} className={inputCls}>
                <option value="">Selecionar...</option>
                {opcoes.empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback (sempre) + Motivo Não Compra (só quando NAO_COMPRA) + Nº Preço */}
          <div className={`grid gap-3 ${transacao === 'NAO_COMPRA' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <label className={labelCls}>Feedback</label>
              <select {...register('feedback')} className={inputCls}>
                <option value="">Selecionar...</option>
                {opcoes.feedbacks_compra.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              {errors.feedback && <p className="text-xs text-red-500 mt-1">{errors.feedback.message}</p>}
            </div>
            {transacao === 'NAO_COMPRA' && (
              <div>
                <label className={labelCls}>Motivo Não Compra</label>
                <select {...register('motivo_nc_id')} className={inputCls}>
                  <option value="">Selecionar...</option>
                  {opcoes.feedbacks_nc.map((f, idx) => (
                    <option key={f.id} value={f.id}>{idx + 1} · {f.nome}</option>
                  ))}
                </select>
                {errors.motivo_nc_id && <p className="text-xs text-red-500 mt-1">{errors.motivo_nc_id.message}</p>}
              </div>
            )}
            <div>
              <label className={labelCls}>Nº do Preço Ofertado</label>
              <select
                {...register('preco', { setValueAs: v => (v === '' ? '' : Number(v)) })}
                disabled={isNaoCompra}
                className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <option value="">Selecionar...</option>
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n}º preço</option>
                ))}
              </select>
              {errors.preco && <p className="text-xs text-red-500 mt-1">Selecione de 1 a 5</p>}
            </div>
          </div>

          {/* Qualidades */}
          <div>
            <label className={labelCls}>Peso por Qualidade (g)</label>
            {isBijuteria && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
                Bijuteria não tem peso — campos bloqueados.
              </p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {QUALIDADES.map(q => (
                <div key={q}>
                  <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 mb-1 text-center">{QUALIDADE_LABELS[q]}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    disabled={isBijuteria}
                    {...register(q as keyof FormValues, { valueAsNumber: true })}
                    className={`${inputCls} text-center disabled:opacity-40 disabled:cursor-not-allowed`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Peso Total / Valor Pago / Pago por Grama */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Peso Total (calculado)</label>
              <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                {totalPeso.toFixed(3)}g
              </div>
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
              <button type="button" onClick={handleClose}
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

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas nesta avaliação. Se sair agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700">
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={onClose}
            >
              Descartar e fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
