'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import type { Leilao } from '@/lib/hooks/use-leiloes';

export const TIPOS_LEILAO = [
  { label: 'ETERNNO',     cor: '#0d9488' },
  { label: 'ETERNNO TOP', cor: '#2563eb' },
  { label: 'BRUNO',       cor: '#ea580c' },
  { label: 'BRUNO TOP',   cor: '#d97706' },
  { label: '24K',         cor: '#7c3aed' },
  { label: '24K TOP',     cor: '#db2777' },
] as const;

type TipoLabel = typeof TIPOS_LEILAO[number]['label'];

function corDoTipo(nome: string): string {
  return TIPOS_LEILAO.find(t => t.label === nome)?.cor ?? '#52525b';
}

const schema = z.object({
  numero:     z.string().min(1, 'Obrigatório'),
  nome:       z.string().min(1, 'Selecione o tipo'),
  dataInicio: z.string().min(1, 'Selecione o período'),
  dataFim:    z.string().min(1, 'Selecione o período'),
  observacao: z.string().optional(),
}).refine(d => d.dataFim >= d.dataInicio, {
  message: 'Data fim deve ser ≥ data início',
  path: ['dataFim'],
});

export type LeilaoFormValues = z.infer<typeof schema>;

interface Props {
  open:      boolean;
  onClose:   () => void;
  onSave:    (values: LeilaoFormValues & { cor: string }) => void;
  onDelete?: () => void;
  initial?:  Partial<Leilao>;
}

export function LeilaoModal({ open, onClose, onSave, onDelete, initial }: Props) {
  const {
    register, handleSubmit, setValue, watch, reset, control,
    formState: { errors },
  } = useForm<LeilaoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { numero: '', nome: '', dataInicio: '', dataFim: '', observacao: '' },
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const nomeAtual = watch('nome');

  useEffect(() => {
    if (open) {
      reset({
        numero:     initial?.numero     ?? '',
        nome:       initial?.nome       ?? '',
        dataInicio: initial?.dataInicio ?? '',
        dataFim:    initial?.dataFim    ?? '',
        observacao: initial?.observacao ?? '',
      });
      setDateRange(
        initial?.dataInicio
          ? { from: parseISO(initial.dataInicio), to: initial.dataFim ? parseISO(initial.dataFim) : undefined }
          : undefined,
      );
    }
  }, [open, initial, reset]);

  function handleDateChange(range: DateRange | undefined) {
    setDateRange(range);
    setValue('dataInicio', range?.from ? format(range.from, 'yyyy-MM-dd') : '');
    setValue('dataFim',    range?.to   ? format(range.to,   'yyyy-MM-dd') : '');
  }

  function handleSave(values: LeilaoFormValues) {
    onSave({ ...values, cor: corDoTipo(values.nome) });
  }

  const tipoAtual = TIPOS_LEILAO.find(t => t.label === nomeAtual);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-100">
            {initial?.id ? 'Editar Leilão' : 'Novo Leilão'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="flex flex-col gap-4 mt-1">

          {/* Tipo + Número */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-zinc-700 dark:text-zinc-200">Tipo de leilão</Label>
              <Controller
                name="nome"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_LEILAO.map(t => (
                        <SelectItem key={t.label} value={t.label}>
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.cor }} />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numero" className="text-zinc-700 dark:text-zinc-200">Número do leilão</Label>
              <div className="flex items-center gap-2">
                {tipoAtual && (
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: tipoAtual.cor }} />
                )}
                <Input id="numero" placeholder="ex: 61" className="flex-1" {...register('numero')} />
              </div>
              {errors.numero && <p className="text-xs text-red-500">{errors.numero.message}</p>}
            </div>
          </div>

          {/* Período */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-zinc-700 dark:text-zinc-200">Período do pregão</Label>
            <CalendarDateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
              onDateChange={handleDateChange}
              singleMonth
              buttonClassName="rounded-lg border border-zinc-300 dark:border-white/[0.12] text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/40 w-full justify-start font-medium"
            />
            {(errors.dataInicio || errors.dataFim) && (
              <p className="text-xs text-red-500">
                {errors.dataFim?.message ?? errors.dataInicio?.message}
              </p>
            )}
          </div>

          {/* Observação */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacao" className="text-zinc-700 dark:text-zinc-200">
              Observação <span className="font-normal text-zinc-400 dark:text-zinc-500">(opcional)</span>
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
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-white/[0.12] text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                Cancelar
              </button>
              <Button type="submit">Salvar</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
