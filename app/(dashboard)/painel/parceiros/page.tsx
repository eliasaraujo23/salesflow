'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { RefreshCw } from 'lucide-react';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

function defaultRange(): DateRange {
  const now = new Date();
  const m = now.getMonth();
  const y = m === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const pm = m === 0 ? 11 : m - 1;
  return { from: new Date(y, pm, 1), to: new Date(y, pm + 1, 0) };
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

export default function PainelParceirosPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);

  const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data, isLoading, isError, error, refetch, isFetching } = usePainelVendas(from, to);

  // Gráfico unificado: barra = faturamento, etiqueta = "R$ X · N un"
  const jfData = useMemo(
    () => (data?.jfByProduto ?? []).map(d => ({
      name: d.name,
      value: d.faturamento,
      displayLabel: `${fmtBRL(d.faturamento)} · ${d.qtd} un`,
    })),
    [data],
  );

  const rvData = useMemo(
    () => (data?.revendaByProduto ?? []).map(d => ({
      name: d.name,
      value: d.faturamento,
      displayLabel: `${fmtBRL(d.faturamento)} · ${d.qtd} un`,
    })),
    [data],
  );

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-stretch gap-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 text-sm">
        <div className="flex flex-col justify-center gap-1 px-4 py-3 border-r border-zinc-200 dark:border-white/[0.08]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Período</span>
          <CalendarDateRangePicker
            dateRange={dateRange}
            setDateRange={setDateRange}
            buttonClassName="border-0 px-0 text-xs font-semibold rounded-none hover:border-0"
          />
        </div>
        <div className="flex flex-col justify-center px-4 py-2 border-r border-zinc-200 dark:border-white/[0.08]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Fabricado JF</span>
          <div className="flex divide-x divide-zinc-200 dark:divide-white/[0.06]">
            <KpiCell label="Faturamento"  value={isLoading ? '—' : fmtBRL(data?.jf.faturamento ?? 0)} />
            <KpiCell label="Ticket Médio" value={isLoading ? '—' : fmtBRL(data?.jf.tm ?? 0)} />
            <KpiCell label="Qtd"          value={isLoading ? '—' : String(data?.jf.qtd ?? 0)} />
            <KpiCell label="Lucrat."      value={isLoading ? '—' : fmtPct(data?.jf.lucrat ?? 0)} border={false} />
          </div>
        </div>
        <div className="flex flex-col justify-center px-4 py-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Revenda</span>
          <div className="flex divide-x divide-zinc-200 dark:divide-white/[0.06]">
            <KpiCell label="Faturamento"  value={isLoading ? '—' : fmtBRL(data?.revenda.faturamento ?? 0)} />
            <KpiCell label="Ticket Médio" value={isLoading ? '—' : fmtBRL(data?.revenda.tm ?? 0)} />
            <KpiCell label="Qtd"          value={isLoading ? '—' : String(data?.revenda.qtd ?? 0)} />
            <KpiCell label="Lucrat."      value={isLoading ? '—' : fmtPct(data?.revenda.lucrat ?? 0)} border={false} />
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 ml-auto border-l border-zinc-200 dark:border-white/[0.08] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors"
        >
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
          {/* 2 gráficos unificados */}
          <div className="grid grid-cols-2 gap-3 items-start">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Produto — JF Fabricado
              </p>
              <HBarChart data={jfData} color="#6366f1" formatter={fmtBRL} />
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Produto — Revenda
              </p>
              <HBarChart data={rvData} color="#10b981" formatter={fmtBRL} />
            </div>
          </div>

          {/* Detail table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.08]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Detalhamento — {data.rows.length} vendas
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/[0.06]">
                    {['Referência', 'Produto', 'Subtipo', 'Destino', 'Tipo', 'Custo Real', 'Preço Cobrado', 'Tipo Pedra', 'Lucrat.', 'Data Venda'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.referencia}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.subtipo ?? '—'}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.destino}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{r.tipo}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmtBRL(r.preco_cobrado)}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.tipo_pedra ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        <span className={r.lucrat >= 40 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : r.lucrat >= 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-red-500'}>
                          {r.lucrat.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.data_venda ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.rows.length === 0 && (
                <div className="text-center py-12 text-zinc-400 text-sm">Nenhuma venda no período selecionado.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
