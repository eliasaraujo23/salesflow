'use client';

import React, { type Dispatch, type SetStateAction } from 'react';
import { type DateRange } from 'react-day-picker';
import { LOJAS } from '@/lib/controle-config';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';

interface Props {
  loja: string;
  onLojaChange: (loja: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>;
}

export function DashboardMetalFilters({ loja, onLojaChange, dateRange, setDateRange }: Props) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 flex-1 min-w-0">
      <div className="flex items-center gap-1 lg:gap-1.5 flex-wrap">
        <button
          onClick={() => onLojaChange('TODAS')}
          className={`px-2.5 lg:px-3.5 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-semibold border-2 transition-all duration-150 ${
            loja === 'TODAS'
              ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-100 shadow-sm'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
          }`}
        >
          Todas
        </button>
        {LOJAS.map(l => (
          <button
            key={l.code}
            onClick={() => onLojaChange(l.code)}
            className={`px-2.5 lg:px-3.5 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-semibold border-2 transition-all duration-150 ${
              loja === l.code
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
            style={loja === l.code ? { backgroundColor: l.cor } : undefined}
          >
            {l.sigla}
          </button>
        ))}
      </div>

      <div className="lg:ml-auto">
        <CalendarDateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
      </div>
    </div>
  );
}
