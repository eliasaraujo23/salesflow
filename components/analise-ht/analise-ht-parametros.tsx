'use client';

import { useState } from 'react';
import { Calculator, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DecimalInput } from '@/components/ui/decimal-input';

interface Props {
  teorMedio: number;
  setTeorMedio: (v: number) => void;
  valorFino: number;
  setValorFino: (v: number) => void;
  percentual: number;
  setPercentual: (v: number) => void;
  limitePagoPorGrama: number;
  setLimitePagoPorGrama: (v: number) => void;
  limiteValorGrama: number;
  setLimiteValorGrama: (v: number) => void;
  pesoMinimo: number;
  setPesoMinimo: (v: number) => void;
  valorBonusPrimeiroPreco: number;
  setValorBonusPrimeiroPreco: (v: number) => void;
  limiteMediaBonusPrimeiroPreco: number;
  setLimiteMediaBonusPrimeiroPreco: (v: number) => void;
  teorMedioLucro: number;
  setTeorMedioLucro: (v: number) => void;
  valorFinoLucro: number;
  setValorFinoLucro: (v: number) => void;
  lojasSemGrupo: string[];
  isCalculating: boolean;
  onCalcular: () => void;
}


const inputCls = 'w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500';
const labelCls = 'text-[11px] text-zinc-500 dark:text-zinc-400';

export function AnaliseHtParametros({
  teorMedio, setTeorMedio,
  valorFino, setValorFino,
  percentual, setPercentual,
  limitePagoPorGrama, setLimitePagoPorGrama,
  limiteValorGrama, setLimiteValorGrama,
  pesoMinimo, setPesoMinimo,
  valorBonusPrimeiroPreco, setValorBonusPrimeiroPreco,
  limiteMediaBonusPrimeiroPreco, setLimiteMediaBonusPrimeiroPreco,
  teorMedioLucro, setTeorMedioLucro,
  valorFinoLucro, setValorFinoLucro,
  lojasSemGrupo,
  isCalculating,
  onCalcular,
}: Props) {
  const [open, setOpen] = useState(false);

  function handleCalcular() {
    onCalcular();
    setTimeout(() => setOpen(false), 1000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.13] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors">
          <Settings2 size={13} />
          Parâmetros
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-100">Parâmetros de cálculo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Bonificação</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Teor médio (%)</label>
                <DecimalInput value={teorMedio} onChange={setTeorMedio} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Valor do fino (R$)</label>
                <DecimalInput value={valorFino} onChange={setValorFino} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Comissão sobre o lucro (%)</label>
                <DecimalInput value={percentual} onChange={setPercentual} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Limite pago/grama (R$)</label>
                <DecimalInput value={limitePagoPorGrama} onChange={setLimitePagoPorGrama} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-white/[0.13] pt-3">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Premiação</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Limite valor/grama (R$)</label>
                <DecimalInput value={limiteValorGrama} onChange={setLimiteValorGrama} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Peso mínimo (g)</label>
                <DecimalInput value={pesoMinimo} onChange={setPesoMinimo} className={inputCls} />
              </div>
            </div>

            {lojasSemGrupo.length > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
                Loja(s) &quot;{lojasSemGrupo.join(', ')}&quot; sem grupo de premiação configurado.
              </p>
            )}
          </div>

          <div className="border-t border-zinc-200 dark:border-white/[0.13] pt-3">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Bônus 1º Preço</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Valor do bônus (R$)</label>
                <DecimalInput value={valorBonusPrimeiroPreco} onChange={setValorBonusPrimeiroPreco} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Média máxima (R$)</label>
                <DecimalInput value={limiteMediaBonusPrimeiroPreco} onChange={setLimiteMediaBonusPrimeiroPreco} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-white/[0.13] pt-3">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Lucro Gerado (Resumo)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Teor médio (%)</label>
                <DecimalInput value={teorMedioLucro} onChange={setTeorMedioLucro} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Valor do fino (R$)</label>
                <DecimalInput value={valorFinoLucro} onChange={setValorFinoLucro} className={inputCls} />
              </div>
            </div>
          </div>

          <button
            onClick={handleCalcular}
            disabled={isCalculating}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 mt-1 mb-3"
          >
            <Calculator size={14} />
            {isCalculating ? 'Calculando...' : 'Calcular'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
