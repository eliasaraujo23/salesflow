'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { RefreshCw } from 'lucide-react';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function defaultRange(): DateRange {
  const now = new Date();
  return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) };
}

interface KpiCellProps { label: string; value: string; border?: boolean; }
function KpiCell({ label, value, border = true }: KpiCellProps) {
  return (
    <div className={`flex flex-col justify-center gap-0.5 px-5 py-3 ${border ? 'border-r border-zinc-200 dark:border-white/[0.08]' : ''} flex-1 min-w-0`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{value}</span>
    </div>
  );
}

export default function PainelLeloesPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);

  const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data, isLoading, isError, error, refetch, isFetching } = usePainelVendas(from, to);

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-stretch gap-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 text-sm">
        <div className="flex flex-col justify-center gap-1 px-4 py-3 border-r border-zinc-200 dark:border-white/[0.08]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Período</span>
          <CalendarDateRangePicker dateRange={dateRange} setDateRange={setDateRange} buttonClassName="border-0 px-0 text-xs font-semibold rounded-none hover:border-0" />
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="px-4 ml-auto border-l border-zinc-200 dark:border-white/[0.08] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
          <button onClick={() => refetch()} className="text-sm text-indigo-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {data.leiloes.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">
              Nenhuma venda em leilão no período selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {data.leiloes.map(leilao => (
                <div key={leilao.nome} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-stretch divide-x divide-zinc-200 dark:divide-white/[0.08] border-b border-zinc-200 dark:border-white/[0.08]">
                    <div className="flex flex-col justify-center px-5 py-3 min-w-[180px]">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Leilão</span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {leilao.nome.replace('LEILÃO ', '')}
                      </span>
                    </div>
                    <KpiCell label="Faturamento" value={fmtBRL(leilao.faturamento)} />
                    <KpiCell label="Quantidade" value={String(leilao.qtd)} />
                    <KpiCell label="Lucratividade" value={`${leilao.lucrat}%`} />
                    <KpiCell
                      label="Ticket Médio Fabricado"
                      value={leilao.tmJF > 0 ? fmtBRL(leilao.tmJF) : '(Em branco)'}
                    />
                    <KpiCell
                      label="Ticket Médio Revenda"
                      value={leilao.tmRevenda > 0 ? fmtBRL(leilao.tmRevenda) : '(Em branco)'}
                      border={false}
                    />
                  </div>
                  {/* Chart */}
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      Faturamento por Produto — {leilao.nome.replace('LEILÃO ', '')}
                    </p>
                    <HBarChart
                      data={leilao.byProduto.map(p => ({ name: p.name, value: p.faturamento }))}
                      color="#a855f7"
                      formatter={fmtBRL}
                      height={Math.max(120, leilao.byProduto.length * 32 + 40)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
