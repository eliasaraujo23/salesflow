'use client';

import { useRef, useEffect, useState } from 'react';
import { RefreshCw, ChevronDown, Check } from 'lucide-react';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { usePainelFilters } from './painel-filters-context';

function DestinoSelect({ value, onChange, options }: {
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggle(d: string) {
    if (value.includes(d)) onChange(value.filter(x => x !== d));
    else onChange([...value, d]);
  }

  const label =
    value.length === 0 ? 'Todos os destinos'
    : value.length === 1 ? value[0]
    : `${value.length} destinos`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <span className={`max-w-[200px] truncate ${value.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
          {label}
        </span>
        <ChevronDown size={13} className="text-zinc-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[220px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.10] rounded-xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Destino</span>
            {value.length > 0 && (
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold"
              >
                Limpar tudo
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-72">
            {options.map(d => {
              const checked = value.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggle(d)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    checked
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function PainelFilterBar() {
  const { dateRange, setDateRange, destinoFilter, setDestinoFilter, destinosSorted, isFetching, refetchAll } = usePainelFilters();

  return (
    <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] px-4 py-3 shrink-0">
      <div className="flex flex-col gap-0.5 shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Período</span>
        <CalendarDateRangePicker
          dateRange={dateRange}
          setDateRange={setDateRange}
          buttonClassName="border-0 px-0 text-sm font-semibold rounded-none hover:border-0 h-auto"
        />
      </div>

      <div className="w-px h-8 bg-zinc-200 dark:bg-white/[0.08] shrink-0" />

      <div className="flex flex-col gap-0.5 shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Destino</span>
        <DestinoSelect
          value={destinoFilter}
          onChange={setDestinoFilter}
          options={destinosSorted}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isFetching && <span className="text-[11px] text-zinc-400">Atualizando...</span>}
        <button
          onClick={refetchAll}
          disabled={isFetching}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
