'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.substring(0, 10).split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
}

const TIPO_CLASS: Record<string, string> = {
  JF: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  JM: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  JC: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  JR: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

export default function PainelParceirosPage() {
  const { from, to, destinoFilter } = usePainelFilters();

  const { data, isLoading, isError, error } = usePainelVendas(
    from,
    to,
    destinoFilter.length > 0 ? destinoFilter : null,
  );

  const jfData = useMemo(
    () => (data?.jfByProduto ?? []).map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd })),
    [data],
  );

  const rvData = useMemo(
    () => (data?.revendaByProduto ?? []).map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd })),
    [data],
  );

  const sections = [
    {
      label: 'Fabricado JF',
      kpis: [
        { label: 'Faturamento',  value: isLoading ? '—' : fmtBRL(data?.jf.faturamento ?? 0) },
        { label: 'Ticket Médio', value: isLoading ? '—' : fmtBRL(data?.jf.tm ?? 0) },
        { label: 'Qtd',          value: isLoading ? '—' : String(data?.jf.qtd ?? 0) },
        { label: 'Lucrat.',      value: isLoading ? '—' : fmtPct(data?.jf.lucrat ?? 0) },
      ],
    },
    {
      label: 'Revenda',
      kpis: [
        { label: 'Faturamento',  value: isLoading ? '—' : fmtBRL(data?.revenda.faturamento ?? 0) },
        { label: 'Ticket Médio', value: isLoading ? '—' : fmtBRL(data?.revenda.tm ?? 0) },
        { label: 'Qtd',          value: isLoading ? '—' : String(data?.revenda.qtd ?? 0) },
        { label: 'Lucrat.',      value: isLoading ? '—' : fmtPct(data?.revenda.lucrat ?? 0) },
      ],
    },
  ];

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">

      {/* KPI bar */}
      <div className="shrink-0 grid grid-cols-2 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 divide-x divide-zinc-200 dark:divide-white/[0.08]">
        {sections.map(s => (
          <div key={s.label}>
            <div className="px-4 pt-2 pb-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{s.label}</span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-zinc-200 dark:divide-white/[0.08]">
              {s.kpis.map(k => (
                <div key={k.label} className="flex flex-col gap-0.5 px-4 py-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{k.label}</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Fill charts — mesmo box, barras adaptam à altura */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col min-h-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Produto — JF Fabricado
              </p>
              <div className="flex-1 min-h-0">
                {jfData.length > 0
                  ? <HBarChart data={jfData} color="#6366f1" formatter={fmtBRL} fill />
                  : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem vendas JF</div>}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col min-h-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Produto — Revenda
              </p>
              <div className="flex-1 min-h-0">
                {rvData.length > 0
                  ? <HBarChart data={rvData} color="#10b981" formatter={fmtBRL} fill />
                  : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem vendas de revenda</div>}
              </div>
            </div>
          </div>

          {/* Scrollable detail table */}
          <div className="shrink-0 h-56 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.08] sticky top-0 bg-white dark:bg-zinc-900 z-10">
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
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TIPO_CLASS[r.tipo] ?? TIPO_CLASS.JR}`}>
                          {r.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmtBRL(r.preco_cobrado)}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.tipo_pedra ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        <span className={r.lucrat >= 40 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : r.lucrat >= 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-red-500'}>
                          {r.lucrat.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_venda)}</td>
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
