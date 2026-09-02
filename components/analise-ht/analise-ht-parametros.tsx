'use client';

import { Calculator } from 'lucide-react';

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
  lojasSemGrupo,
  isCalculating,
  onCalcular,
}: Props) {
  return (
    <aside className="flex flex-col gap-3 shrink-0 w-full lg:w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-3">
      <div>
        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Bonificação</label>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Teor médio (%)</label>
        <input type="number" step="0.01" value={teorMedio} onChange={e => setTeorMedio(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Valor do fino (R$)</label>
        <input type="number" step="0.01" value={valorFino} onChange={e => setValorFino(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Comissão sobre o lucro (%)</label>
        <input type="number" step="0.01" value={percentual} onChange={e => setPercentual(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Limite pago/grama (R$)</label>
        <input type="number" step="0.01" value={limitePagoPorGrama} onChange={e => setLimitePagoPorGrama(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>

      <div className="border-t border-zinc-200 dark:border-white/[0.13] pt-3 mt-1">
        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Premiação</label>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Limite valor/grama (R$)</label>
        <input type="number" step="0.01" value={limiteValorGrama} onChange={e => setLimiteValorGrama(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Peso mínimo (g)</label>
        <input type="number" step="0.01" value={pesoMinimo} onChange={e => setPesoMinimo(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>

      {lojasSemGrupo.length > 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Loja(s) &quot;{lojasSemGrupo.join(', ')}&quot; sem grupo de premiação configurado.
        </p>
      )}

      <div className="border-t border-zinc-200 dark:border-white/[0.13] pt-3 mt-1">
        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Bônus 1º Preço</label>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Valor do bônus (R$)</label>
        <input type="number" step="0.01" value={valorBonusPrimeiroPreco} onChange={e => setValorBonusPrimeiroPreco(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Média máxima para ganhar (R$)</label>
        <input type="number" step="0.01" value={limiteMediaBonusPrimeiroPreco} onChange={e => setLimiteMediaBonusPrimeiroPreco(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>

      <button
        onClick={onCalcular}
        disabled={isCalculating}
        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 mt-1"
      >
        <Calculator size={14} />
        {isCalculating ? 'Calculando...' : 'Calcular'}
      </button>
    </aside>
  );
}
