'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUp, List, Clock } from 'lucide-react';
import { addMetalAction } from '@/lib/actions/metals';
import { toast } from 'sonner';

const ORIGENS = [
  { value: 'second', label: 'Second Hand' },
  { value: 'scrap', label: 'Scrap' },
  { value: 'novo', label: 'Novo' },
  { value: 'proprio', label: 'Próprio' },
];

const schema = z.object({
  data: z.string().min(1, 'Data obrigatória'),
  metal: z.enum(['ouro', 'prata', 'platina'], { error: 'Selecione o metal' }),
  origem: z.string().min(1, 'Selecione a origem'),
  chegou: z.number().min(0),
  cadastrado: z.number().min(0),
  obs: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type TipoTab = 'entrada' | 'cadastro' | 'antigo';

const TABS: { key: TipoTab; label: string; Icon: React.ElementType }[] = [
  { key: 'entrada', label: 'Entrada', Icon: ArrowUp },
  { key: 'cadastro', label: 'Cadastro', Icon: List },
  { key: 'antigo', label: 'Antigo', Icon: Clock },
];

const inputCls =
  'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors';

export function MetalsEntryForm() {
  const [tipo, setTipo] = useState<TipoTab>('entrada');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { chegou: 0, cadastrado: 0 },
  });

  const chegou = watch('chegou') ?? 0;
  const cadastrado = watch('cadastrado') ?? 0;
  const sobrou = Math.max(0, Number(chegou) - Number(cadastrado));

  const onSubmit = async (data: FormData) => {
    const result = await addMetalAction({
      tipo,
      metal: data.metal,
      data: data.data,
      origem: data.origem,
      chegou: data.chegou,
      cadastrado: data.cadastrado,
      sobrou,
      peso: data.chegou,
      obs: data.obs,
    });
    if (result.success) {
      toast.success('Entrada registrada com sucesso!');
      reset({ chegou: 0, cadastrado: 0 });
    } else {
      toast.error(result.error ?? 'Erro ao registrar');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-5">
      <div className="flex gap-2 mb-5">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTipo(key)}
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Data
            </label>
            <input type="date" {...register('data')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Metal
            </label>
            <select {...register('metal')} className={inputCls}>
              <option value="">Selecione</option>
              <option value="ouro">Ouro</option>
              <option value="prata">Prata</option>
              <option value="platina">Platina</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Origem
            </label>
            <select {...register('origem')} className={inputCls}>
              <option value="">Selecione</option>
              {ORIGENS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Chegou (g)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('chegou', { valueAsNumber: true })}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Cadastrado no sistema (g)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('cadastrado', { valueAsNumber: true })}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Sobrou
            </label>
            <div className="flex items-center px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg min-h-[38px]">
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {sobrou > 0 ? `${sobrou.toFixed(2)}g` : '— g'}
              </span>
            </div>
          </div>
        </div>

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
