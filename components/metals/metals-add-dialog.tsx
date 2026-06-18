'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { addMetalAction, type AddMetalInput } from '@/lib/actions/metals';
import { toast } from 'sonner';

const schema = z.object({
  metal: z.enum(['ouro', 'prata', 'platina']),
  tipo: z.enum(['entrada', 'cadastro', 'antigo']),
  peso: z.number().positive('Peso deve ser positivo'),
  detalhe: z.string().optional(),
  responsavel: z.string().min(1, 'Responsável obrigatório'),
});

type FormValues = z.infer<typeof schema>;

interface MetalsAddDialogProps {
  onClose: () => void;
  currentUser: string;
}

export function MetalsAddDialog({ onClose, currentUser }: MetalsAddDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { responsavel: currentUser, tipo: 'entrada' },
  });

  const onSubmit = async (values: FormValues) => {
    const result = await addMetalAction(values as AddMetalInput);
    if (result.success) {
      toast.success('Metal registrado com sucesso!');
      onClose();
    } else {
      toast.error(result.error ?? 'Erro ao registrar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text">Registrar Metal</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">Metal</label>
              <select
                {...register('metal')}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
              >
                <option value="ouro">Ouro</option>
                <option value="prata">Prata</option>
                <option value="platina">Platina</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">Tipo</label>
              <select
                {...register('tipo')}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
              >
                <option value="entrada">Entrada</option>
                <option value="cadastro">Cadastro</option>
                <option value="antigo">Antigo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">
              Peso (g)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('peso', { valueAsNumber: true })}
              placeholder="Ex: 12.50"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
            />
            {errors.peso && (
              <p className="text-xs text-semantic-red mt-1">{errors.peso.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">Detalhe</label>
            <input
              {...register('detalhe')}
              placeholder="Opcional"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">Responsável</label>
            <input
              {...register('responsavel')}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
            />
            {errors.responsavel && (
              <p className="text-xs text-semantic-red mt-1">{errors.responsavel.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-bg-surface-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-2 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
