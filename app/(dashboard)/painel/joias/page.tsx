'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { RefreshCw } from 'lucide-react';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { useJfDashboard } from '@/hooks/use-jf-dashboard';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function defaultRange(): DateRange {
  const now = new Date();
  return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) };
}

type TabKey = 'cadastradas' | 'detalhamento';

export default function PainelJoiasPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [tab, setTab] = useState<TabKey>('cadastradas');

  const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data: vendas, isLoading: loadingVendas, refetch: refetchVendas, isFetching } = usePainelVendas(from, to);
  const { data: jf, isLoading: loadingJf, refetch: refetchJf } = useJfDashboard();

  const isLoading = loadingVendas || loadingJf;

  // JF stock by product from estoqueCategoria
  const jfEstoqueData = useMemo(() => {
    if (!jf?.estoqueCategoria) return [];
    const byProduto = new Map<string, number>();
    for (const r of jf.estoqueCategoria) {
      if (!r.produto) continue;
      byProduto.set(r.produto, (byProduto.get(r.produto) ?? 0) + r.estoque);
    }
    return Array.from(byProduto.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [jf]);

  // JF sales in period (filtered to JF tipo)
  const jfVendasData = useMemo(() => {
    if (!vendas) return [];
    return vendas.jfByProduto.map(d => ({ name: d.name, value: d.faturamento }));
  }, [vendas]);

  // Detail rows for JF
  const jfDetailRows = useMemo(() => {
    if (!vendas) return [];
    return vendas.rows.filter(r => r.tipo === 'JF');
  }, [vendas]);

  function handleRefetch() {
    refetchVendas();
    refetchJf();
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'cadastradas', label: 'Joias Cadastradas' },
    { key: 'detalhamento', label: 'Detalhamento JF' },
  ];

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-stretch gap-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 text-sm">
        <div className="flex flex-col justify-center gap-1 px-4 py-3 border-r border-zinc-200 dark:border-white/[0.08]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Período</span>
          <CalendarDateRangePicker dateRange={dateRange} setDateRange={setDateRange} buttonClassName="border-0 px-0 text-xs font-semibold rounded-none hover:border-0" />
        </div>
        {/* Tab toggle */}
        <div className="flex items-center gap-1 px-3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* JF KPIs */}
        <div className="flex items-center divide-x divide-zinc-200 dark:divide-white/[0.08] ml-auto">
          <div className="flex flex-col justify-center gap-0.5 px-5 py-3 border-r border-zinc-200 dark:border-white/[0.08]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Em Estoque JF</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{loadingJf ? '—' : jf?.resumo.estoque ?? '—'}</span>
          </div>
          <div className="flex flex-col justify-center gap-0.5 px-5 py-3 border-r border-zinc-200 dark:border-white/[0.08]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Faturamento JF</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{loadingVendas ? '—' : fmtBRL(vendas?.jf.faturamento ?? 0)}</span>
          </div>
          <div className="flex flex-col justify-center gap-0.5 px-5 py-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Lucratividade JF</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{loadingVendas ? '—' : `${vendas?.jf.lucrat ?? 0}%`}</span>
          </div>
        </div>
        <button onClick={handleRefetch} disabled={isFetching} className="px-4 border-l border-zinc-200 dark:border-white/[0.08] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}

      {!isLoading && tab === 'cadastradas' && (
        <div className="grid grid-cols-2 gap-3">
          {/* JF Fabricado (stock) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Joias Cadastradas Fabricado</p>
              <div className="flex gap-3 text-[10px]">
                <span className="text-zinc-500">Estoque: <span className="font-bold text-zinc-900 dark:text-zinc-100">{jf?.resumo.estoque ?? '—'}</span></span>
                <span className="text-zinc-500">Em fab: <span className="font-bold text-zinc-900 dark:text-zinc-100">{jf?.resumo.em_fabricacao ?? '—'}</span></span>
              </div>
            </div>
            {jfEstoqueData.length > 0 ? (
              <HBarChart data={jfEstoqueData} color="#6366f1" formatter={v => String(v)} maxItems={15} />
            ) : (
              <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Sem dados de estoque</div>
            )}
          </div>

          {/* JF faturado no período por produto */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Faturamento Fabricado JF — Período</p>
            {jfVendasData.length > 0 ? (
              <HBarChart data={jfVendasData} color="#6366f1" formatter={fmtBRL} maxItems={15} />
            ) : (
              <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Sem vendas JF no período</div>
            )}
          </div>

          {/* Revenda stock — placeholder */}
          <div className="col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Joias Cadastradas Revenda</p>
            <p className="text-sm text-zinc-400">
              Estoque de revenda disponível via endpoint <code className="text-indigo-400">/estoque-revenda</code> — a ser implementado na API.
              Atualmente são exibidas as vendas de revenda no período selecionado:
            </p>
            <div className="mt-3">
              <HBarChart
                data={(vendas?.revendaByProduto ?? []).map(d => ({ name: d.name, value: d.faturamento }))}
                color="#10b981"
                formatter={fmtBRL}
                maxItems={15}
              />
            </div>
          </div>
        </div>
      )}

      {!isLoading && tab === 'detalhamento' && (
        <div className="flex flex-col gap-3">
          {/* JF Sales KPI */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Faturamento JF por Produto</p>
            {jfVendasData.length > 0 ? (
              <HBarChart data={jfVendasData} color="#6366f1" formatter={fmtBRL} maxItems={15} />
            ) : (
              <div className="flex items-center justify-center py-8 text-zinc-400 text-sm">Sem vendas JF no período</div>
            )}
          </div>

          {/* JF detail table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Detalhamento JF — {jfDetailRows.length} vendas</p>
              <div className="flex gap-4 text-[10px] text-zinc-500">
                <span>Custo: <span className="font-bold text-zinc-900 dark:text-zinc-100">{fmtBRL(jfDetailRows.reduce((s, r) => s + r.custo_real, 0))}</span></span>
                <span>Faturamento: <span className="font-bold text-indigo-600 dark:text-indigo-400">{fmtBRL(jfDetailRows.reduce((s, r) => s + r.preco_cobrado, 0))}</span></span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/[0.06]">
                    {['Referência', 'Produto', 'Subtipo', 'Destino', 'Custo Real', 'Preço Cobrado', 'Tipo Pedra', 'Lucrat.', 'Data Venda'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jfDetailRows.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.referencia}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.subtipo ?? '—'}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.destino}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmtBRL(r.preco_cobrado)}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.tipo_pedra ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        <span className={r.lucrat >= 40 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : r.lucrat >= 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-red-500'}>
                          {r.lucrat}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.data_venda ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jfDetailRows.length === 0 && (
                <div className="text-center py-12 text-zinc-400 text-sm">Nenhuma venda JF no período selecionado.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
