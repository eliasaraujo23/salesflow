'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { useEvolucaoParceiros } from '@/hooks/use-evolucao-parceiros';
import { ParceirosDestinoSidebar } from '@/components/graficos/parceiros-destino-sidebar';
import { EvolucaoParceiroAreaChart } from '@/components/graficos/evolucao-parceiros-area-chart';

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function defaultRange(): DateRange {
  const now = new Date();
  // Último dia do mês atual para não cortar mês em andamento
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { from, to };
}

function fmtBRL(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2).replace('.', ',')}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(2).replace('.', ',')} Mil`;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtMesLabel(mes: string) {
  const [, m] = mes.split('-');
  return MONTHS_PT[parseInt(m) - 1];
}

export default function EvolucaoParceiroPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [tipo, setTipo] = useState<'todos' | 'JF' | 'JM' | 'JR' | 'JC'>('todos');
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());

  const dataInicio = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const dataFim    = dateRange?.to   ? format(dateRange.to,   'yyyy-MM-dd') : undefined;

  const { data, isLoading, isError, error, refetch, isFetching } = useEvolucaoParceiros({
    dataInicio,
    dataFim,
    tipo,
  });

  const allParceiros = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map(r => r.destino))].sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (selectedPartners.size === 0) return data;
    return data.filter(r => selectedPartners.has(r.destino));
  }, [data, selectedPartners]);

  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, number>();
    filteredData.forEach(r => {
      byMonth.set(r.mes, (byMonth.get(r.mes) ?? 0) + r.faturamento);
    });
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes, mesLabel: fmtMesLabel(mes), total }));
  }, [filteredData]);

  const totalFaturamento = filteredData.reduce((s, r) => s + r.faturamento, 0);
  const totalMeses = monthlyData.length;
  const mediaMensal = totalMeses > 0 ? totalFaturamento / totalMeses : 0;

  function handleToggle(p: string) {
    setSelectedPartners(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedPartners(new Set(allParceiros));
  }

  function handleClearAll() {
    setSelectedPartners(new Set());
  }

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-4 min-h-0">
      {/* ── Filter / KPI bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-stretch gap-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 text-sm">
        {/* Data Venda */}
        <div className="flex flex-col justify-center gap-1 px-4 py-3 border-r border-zinc-200 dark:border-white/[0.08]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            Data Venda
          </span>
          <CalendarDateRangePicker
            dateRange={dateRange}
            setDateRange={setDateRange}
            buttonClassName="border-0 px-0 text-xs font-semibold rounded-none hover:border-0"
          />
        </div>

        {/* Tipo */}
        <div className="flex flex-col justify-center gap-1 px-4 py-3 border-r border-zinc-200 dark:border-white/[0.08]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Tipo</span>
          <Select value={tipo} onValueChange={v => setTipo(v as typeof tipo)}>
            <SelectTrigger className="h-auto border-0 p-0 shadow-none text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:ring-0 w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="JF">JF</SelectItem>
              <SelectItem value="JM">JM</SelectItem>
              <SelectItem value="JR">JR</SelectItem>
              <SelectItem value="JC">JC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Faturamento total */}
        <div className="flex flex-col justify-center gap-0.5 px-5 py-3 border-r border-zinc-200 dark:border-white/[0.08] flex-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            Faturamento Total
          </span>
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {isLoading ? '—' : fmtBRL(totalFaturamento)}
          </span>
        </div>

        {/* Média mensal */}
        <div className="flex flex-col justify-center gap-0.5 px-5 py-3 flex-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Média</span>
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {isLoading ? '—' : fmtBRL(mediaMensal)}
          </span>
        </div>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Atualizar"
          className="px-4 border-l border-zinc-200 dark:border-white/[0.08] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Loading ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" />
          Consultando banco de dados...
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
          <button onClick={() => refetch()} className="text-sm text-indigo-500 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Main content: sidebar + chart ────────────────────────── */}
      {data && !isLoading && (
        <div className="flex gap-4 items-stretch min-h-0">
          <ParceirosDestinoSidebar
            parceiros={allParceiros}
            selected={selectedPartners}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
          />

          <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5">
            {monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-[360px] text-zinc-400 text-sm">
                Nenhum dado para o período selecionado.
              </div>
            ) : (
              <EvolucaoParceiroAreaChart data={monthlyData} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
