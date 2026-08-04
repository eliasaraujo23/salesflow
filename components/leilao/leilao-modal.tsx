'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Leilao } from '@/lib/hooks/use-leiloes';

export const LEILAO_COLORS = [
  { label: 'Petróleo',    value: '#0f766e' },
  { label: 'Azul',        value: '#1d4ed8' },
  { label: 'Céu',         value: '#0284c7' },
  { label: 'Índigo',      value: '#4338ca' },
  { label: 'Laranja',     value: '#ea580c' },
  { label: 'Âmbar',       value: '#d97706' },
  { label: 'Salmão',      value: '#e8745a' },
  { label: 'Roxo',        value: '#7c3aed' },
  { label: 'Rosa',        value: '#db2777' },
  { label: 'Verde',       value: '#15803d' },
  { label: 'Cinza',       value: '#52525b' },
  { label: 'Vermelho',    value: '#b91c1c' },
];

const schema = z.object({
  numero:      z.string().min(1, 'Obrigatório'),
  nome:        z.string().min(1, 'Obrigatório'),
  dataInicio:  z.string().min(1, 'Obrigatório'),
  dataFim:     z.string().min(1, 'Obrigatório'),
  cor:         z.string().min(1),
  observacao:  z.string().optional(),
}).refine(d => d.dataFim >= d.dataInicio, {
  message: 'Data fim deve ser ≥ data início',
  path: ['dataFim'],
});

export type LeilaoFormValues = z.infer<typeof schema>;

interface Props {
  open:      boolean;
  onClose:   () => void;
  onSave:    (values: LeilaoFormValues) => void;
  onDelete?: () => void;
  initial?:  Partial<Leilao>;
}

export function LeilaoModal({ open, onClose, onSave, onDelete, initial }: Props) {
  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors },
  } = useForm<LeilaoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      numero: '', nome: '', dataInicio: '', dataFim: '',
      cor: LEILAO_COLORS[0].value, observacao: '',
    },
  });

  const corAtual = watch('cor');

  useEffect(() => {
    if (open) {
      reset({
        numero:     initial?.numero     ?? '',
        nome:       initial?.nome       ?? '',
        dataInicio: initial?.dataInicio ?? '',
        dataFim:    initial?.dataFim    ?? '',
        cor:        initial?.cor        ?? LEILAO_COLORS[0].value,
        observacao: initial?.observacao ?? '',
      });
    }
  }, [open, initial, reset]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Editar Leilão' : 'Novo Leilão'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numero">Número do leilão</Label>
              <Input id="numero" placeholder="ex: 61" {...register('numero')} />
              {errors.numero && <p className="text-xs text-red-500">{errors.numero.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome / Casa</Label>
              <Input id="nome" placeholder="ex: ETN" {...register('nome')} />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataInicio">Início do pregão</Label>
              <Input id="dataInicio" type="date" {...register('dataInicio')} />
              {errors.dataInicio && <p className="text-xs text-red-500">{errors.dataInicio.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataFim">Fim do pregão</Label>
              <Input id="dataFim" type="date" {...register('dataFim')} />
              {errors.dataFim && <p className="text-xs text-red-500">{errors.dataFim.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {LEILAO_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setValue('cor', c.value)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full transition-all ${
                    corAtual === c.value
                      ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 scale-110'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacao">
              Observação <span className="font-normal text-zinc-400">(opcional)</span>
            </Label>
            <Input id="observacao" placeholder="Notas sobre este leilão..." {...register('observacao')} />
          </div>

          <DialogFooter className="mt-1 flex items-center justify-between gap-2">
            {initial?.id ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
