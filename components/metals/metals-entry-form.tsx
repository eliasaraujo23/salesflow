'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUp, List, Clock } from 'lucide-react';
import { addMetalAction } from '@/lib/actions/metals';
import { toast } from 'sonner';
import { SingleDatePicker } from '@/components/ui/single-date-picker';

const ORIGENS = [
  { value: 'second', label: 'Second Hand' },
  { value: 'scrap',  label: 'Scrap' },
  { value: 'novo',   label: 'Novo' },
  { value: 'proprio', label: 'Próprio' },
];

const schema = z.object({
  data:       z.string().min(1, 'Data obrigatória'),
  metal:      z.enum(['ouro', 'prata', 'platina'], { message: 'Selecione o metal' }),
  origem:     z.string().min(1, 'Selecione a origem'),
  chegou:     z.number().min(0),
  cadastrado: z.number().min(0),
  obs:        z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type TipoTab = 'entrada' | 'cadastro' | 'antigo';

const TABS: { key: TipoTab; label: string; Icon: React.ElementType; desc: string }[] = [
  { key: 'entrada',  label: 'Entrada',  Icon: ArrowUp, desc: 'Adiciona ao saldo' },
  { key: 'cadastro', label: 'Cadastro', Icon: List,    desc: 'Abate do saldo' },
  { key: 'antigo',   label: 'Antigo',   Icon: Clock,   desc: 'Abate do saldo' },
];

const inputCls =
  'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors';

const errCls = 'text-xs text-red-500 mt-1';

export function MetalsEntryForm() {
  const [tipo, setTipo] = useState<TipoTab>('entrada');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { chegou: 0, cadastrado: 0 },
  });


  const handleTabChange = (key: TipoTab) => {
    setTipo(key);
    reset({ chegou: 0, cadastrado: 0 });
  };

  const onSubmit = async (data: FormData) => {
    // Each tab type maps weight differently:
    // entrada  → peso = chegou  (total received, ADDS to balance)
    // cadastro → peso = cadastrado (weight used in pieces, SUBTRACTS)
    // antigo   → peso = chegou  (old existing stock, ADDS to balance)
    const peso = tipo === 'cadastro' ? data.cadastrado : data.chegou;

    if (peso <= 0) {
      toast.error('Informe um peso maior que zero');
      return;
    }

    const result = await addMetalAction({
      tipo,
      metal:      data.metal,
      data:       data.data,
      origem:     data.origem,
      chegou:     tipo === 'entrada' ? data.chegou : 0,
      cadastrado: tipo === 'cadastro' ? data.cadastrado : 0,
      sobrou:     0,
      peso,
      obs: data.obs,
    });

    if (result.success) {
      const msgs: Record<TipoTab, string> = {
        entrada:  'Entrada registrada com sucesso!',
        cadastro: 'Cadastro registrado — saldo abatido',
        antigo:   'Estoque antigo declarado com sucesso!',
      };
      toast.success(msgs[tipo]);
      reset({ chegou: 0, cadastrado: 0 });
    } else {
      toast.error(result.error ?? 'Erro ao registrar');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-5">
      {/* Tab selector */}
      <div className="flex gap-2 mb-2">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${
              tipo === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-[11px] text-center text-zinc-400 dark:text-zinc-500 mb-4">
        {TABS.find(t => t.key === tipo)?.desc}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Data + Metal */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Data</label>
            <Controller
              name="data"
              control={control}
              render={({ field }) => (
                <SingleDatePicker
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  clearable={false}
                  placeholder="dd/mm/aaaa"
                />
              )}
            />
            {errors.data && <p className={errCls}>{errors.data.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Metal</label>
            <select {...register('metal')} className={inputCls}>
              <option value="">Selecione</option>
              <option value="ouro">Ouro</option>
              <option value="prata">Prata</option>
              <option value="platina">Platina</option>
            </select>
            {errors.metal && <p className={errCls}>Selecione o metal</p>}
          </div>
        </div>

        {/* Origem */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Origem</label>
          <select {...register('origem')} className={inputCls}>
            <option value="">Selecione</option>
            {ORIGENS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.origem && <p className={errCls}>{errors.origem.message}</p>}
        </div>

        {/* Weight field — one per tab */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
            {tipo === 'entrada'  ? 'Chegou (g)'            : null}
            {tipo === 'cadastro' ? 'Peso a cadastrar (g)'  : null}
            {tipo === 'antigo'   ? 'Peso antigo (g)'       : null}
          </label>
          <input
            type="number" step="0.01" min="0"
            {...register(tipo === 'cadastro' ? 'cadastrado' : 'chegou', { valueAsNumber: true })}
            placeholder="0.00"
            className={inputCls}
          />
        </div>

        {/* Obs */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
            Observação (opcional)
          </label>
          <textarea
            {...register('obs')}
            rows={2}
            placeholder="Ex: lote da Luciana, anéis antigos..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowUp size={15} />
          {isSubmitting ? 'Salvando...' : `Confirmar ${tipo}`}
        </button>
      </form>
    </div>
  );
}
