'use client';

import { usePathname } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { usePainelFilters } from './painel-filters-context';

// Abas com dados históricos fixos não usam o filtro de período global
const TABS_WITHOUT_PERIOD = ['/painel/evolutivo'];

export function PainelFilterBar() {
  const { dateRange, setDateRange, isFetching, refetchAll } = usePainelFilters();
  const pathname = usePathname();

  if (TABS_WITHOUT_PERIOD.includes(pathname)) return null;

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
