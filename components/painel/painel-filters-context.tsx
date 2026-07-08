'use client';

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { useQueryClient } from '@tanstack/react-query';
import { usePainelVendas } from '@/hooks/use-painel-vendas';

function defaultRange(): DateRange {
  const now = new Date();
  const m = now.getMonth();
  const y = m === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const pm = m === 0 ? 11 : m - 1;
  return { from: new Date(y, pm, 1), to: new Date(y, pm + 1, 0) };
}

export interface PainelFiltersValue {
  dateRange: DateRange | undefined;
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>;
  destinoFilter: string[];
  setDestinoFilter: Dispatch<SetStateAction<string[]>>;
  from: string | undefined;
  to: string | undefined;
  destinosSorted: string[];
  isFetching: boolean;
  refetchAll: () => void;
}

const PainelFiltersContext = createContext<PainelFiltersValue | null>(null);

export function PainelFiltersProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [destinoFilter, setDestinoFilter] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  // Busca sem filtro de destino para popular o dropdown com todos os destinos
  const { data, isFetching } = usePainelVendas(from, to, null);
  const destinosSorted = data?.destinosSorted ?? [];

  function refetchAll() {
    queryClient.invalidateQueries({ queryKey: ['painel-vendas'] });
  }

  return (
    <PainelFiltersContext.Provider value={{
      dateRange, setDateRange,
      destinoFilter, setDestinoFilter,
      from, to,
      destinosSorted,
      isFetching,
      refetchAll,
    }}>
      {children}
    </PainelFiltersContext.Provider>
  );
}

export function usePainelFilters(): PainelFiltersValue {
  const ctx = useContext(PainelFiltersContext);
  if (!ctx) throw new Error('usePainelFilters deve ser usado dentro de PainelFiltersProvider');
  return ctx;
}
