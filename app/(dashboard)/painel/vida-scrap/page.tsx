'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { useScrapVida } from '@/hooks/use-scrap-vida';
import { HBarChart } from '@/components/painel/h-bar-chart';
import { chartCardHeight } from '@/lib/chart-height';
import type { ScrapVidaRow } from '@/lib/actions/fetch-scrap-vida';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = iso.substring(0, 10).split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
}

const BUCKETS = [
  { label: '0–30 d',   min: 0,   max: 30   },
  { label: '31–90 d',  min: 31,  max: 90   },
  { label: '91–180 d', min: 91,  max: 180  },
  { label: '181–365 d',min: 181, max: 365  },
  { label: '+365 d',   min: 366, max: Infinity },
];
const BUCKET_COLORS = ['#10b981','#6366f1','#f59e0b','#f97316','#ef4444'];

const TIPO_CLASS: Record<string, string> = {
  JF: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  JM: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  JC: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  JR: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

type SortKey = keyof Pick<ScrapVidaRow,
  'referencia' | 'tipo' | 'produto' | 'destino' | 'data_entrada' | 'data_venda' | 'dias_vida' | 'custo_real' | 'preco_cobrado'
>;

const COLS: { label: string; key: SortKey }[] = [
  { label: 'Referência', key: 'referencia' },
  { label: 'Tipo',       key: 'tipo' },
  { label: 'Produto',    key: 'produto' },
  { label: 'Destino',    key: 'destino' },
  { label: 'Entrada',    key: 'data_entrada' },
  { label: 'Venda',      key: 'data_venda' },
  { label: 'Dias',       key: 'dias_vida' },
  { label: 'Custo',      key: 'custo_real' },
  { label: 'Preço',      key: 'preco_cobrado' },
];

const DESTINOS_EXCLUIDOS = new Set(['EDUARDO', 'HELTON', 'THAÍS', 'AUGUSTO', 'THAIS']);

export default function VidaScrapPage() {
  const { from, to } = usePainelFilters();
  const { data: rawData = [], isLoading, isError, error } = useScrapVida(from, to);
  const data = rawData.filter(r => !DESTINOS_EXCLUIDOS.has((r.destino ?? '').toUpperCase().trim()));

  const [sortKey, setSortKey] = useState<SortKey>('data_venda');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const kpi = useMemo(() => {
    const valid = data.filter(r => (r.dias_vida ?? -1) >= 0);
    if (!valid.length) return { total: 0, avg: 0, min: 0, max: 0 };
    const dias = valid.map(r => r.dias_vida ?? 0);
    return {
      total: valid.length,
      avg:   Math.round(dias.reduce((s, d) => s + d, 0) / dias.length),
      min:   Math.min(...dias),
      max:   Math.max(...dias),
    };
  }, [data]);

  const distribution = useMemo(() =>
    BUCKETS.map((b, i) => ({
      label: b.label,
      count: data.filter(r => {
        const d = r.dias_vida ?? 0;
        return d >= b.min && d <= b.max;
      }).length,
      color: BUCKET_COLORS[i],
    })).filter(b => b.count > 0),
  [data]);

  const byDestino = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of data) {
      const key = (r.destino ?? '—').toUpperCase().trim();
      const e = map.get(key) ?? { sum: 0, count: 0 };
      e.sum += r.dias_vida ?? 0;
      e.count++;
      map.set(key, e);
    }
    return Array.from(map.entries())
      .map(([name, { sum, count }]) => ({
        name,
        value: Math.round(sum / count),
        qty: count,
        displayLabel: `${Math.round(sum / count)} dias`,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const sortedRows = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className="h-full overflow-y-auto md:overflow-hidden p-4 flex flex-col gap-3">

      {/* KPI */}
      <div className="shrink-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        <div className="px-4 py-2 bg-amber-500 text-white">
          <span className="text-xs font-bold uppercase tracking-widest">Vida das Joias de Scrap</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-zinc-200 dark:divide-white/[0.08]">
          {[
            { label: 'Total Vendidas', value: isLoading ? '—' : String(kpi.total) },
            { label: 'Vida Média',     value: isLoading ? '—' : `${kpi.avg} dias` },
            { label: 'Mínimo',         value: isLoading ? '—' : `${kpi.min} dias` },
            { label: 'Máximo',         value: isLoading ? '—' : `${kpi.max} dias` },
          ].map(k => (
            <div key={k.label} className="flex flex-col gap-0.5 px-2 py-2 md:px-4 md:py-2.5 min-w-0">
              <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-400 truncate">{k.label}</span>
              <span className="text-xs md:text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100 truncate">{k.value}</span>
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-500">{(error as Error)?.message ?? 'Erro ao carregar dados.'}</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Middle */}
          <div className="shrink-0 md:flex-1 md:min-h-0 grid grid-cols-1 md:grid-flow-col md:auto-cols-fr gap-3">

            {/* Distribuição por faixa */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col min-h-[280px] md:min-h-0">
              <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Distribuição por Faixa de Tempo
              </div>
              {distribution.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">Sem dados no período</div>
              ) : (
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-sm">
                              <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">{label}</p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{payload[0].value} itens</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {distribution.map((b, i) => <Cell key={i} fill={b.color} />)}
                        <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#52525b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Vida média por destino */}
            <div
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col md:!min-h-0"
              style={{ minHeight: chartCardHeight(byDestino.length) }}
            >
              <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Vida Média por Destino (dias)
              </div>
              {byDestino.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">Sem dados</div>
              ) : (
                <div className="flex-1 min-h-0">
                  <HBarChart
                    data={byDestino}
                    color="#f59e0b"
                    formatter={v => `${v} dias`}
                    fill
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
            <table className="w-full text-xs border-separate border-spacing-0 data-table">
              <thead>
                <tr>
                  <th colSpan={COLS.length} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Detalhamento — {data.length} {data.length === 1 ? 'item' : 'itens'}
                    </span>
                  </th>
                </tr>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="sticky top-[41px] z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key
                          ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                          : <ChevronsUpDown size={10} className="opacity-30" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.referencia}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TIPO_CLASS[r.tipo?.toUpperCase() ?? ''] ?? TIPO_CLASS.JR}`}>
                        {r.tipo ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{r.destino ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_entrada)}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_venda)}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      <span className={
                        (r.dias_vida ?? 0) <= 30
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : (r.dias_vida ?? 0) <= 90
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : 'text-orange-500 font-semibold'
                      }>
                        {r.dias_vida ?? '—'} d
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                    <td className="px-3 py-2 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmtBRL(r.preco_cobrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedRows.length === 0 && !isLoading && (
              <div className="text-center py-12 text-zinc-400 text-sm">Nenhuma venda de scrap no período.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
