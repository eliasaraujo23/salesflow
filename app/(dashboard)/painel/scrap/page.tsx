'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { usePainelScrap, type ScrapDetailRow } from '@/hooks/use-painel-scrap';
import { HBarChart } from '@/components/painel/h-bar-chart';
import { chartCardHeight } from '@/lib/chart-height';
import { TipoDonut } from '@/components/painel/tipo-donut';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.substring(0, 10).split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
}

function fmtPeso(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(3)} kg`;
  return `${g.toFixed(2)} g`;
}

const TIPO_CLASS: Record<string, string> = {
  JF: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  JM: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  JC: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  JR: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};


type SortKey = keyof Pick<ScrapDetailRow,
  'referencia' | 'tipo' | 'produto' | 'destino' | 'peso' | 'custo_real' | 'preco_cobrado' | 'data_venda'
>;

const COLS: { label: string; key: SortKey }[] = [
  { label: 'Referência', key: 'referencia' },
  { label: 'Tipo',       key: 'tipo' },
  { label: 'Produto',    key: 'produto' },
  { label: 'Destino',    key: 'destino' },
  { label: 'Peso (g)',   key: 'peso' },
  { label: 'Custo',      key: 'custo_real' },
  { label: 'Preço',      key: 'preco_cobrado' },
  { label: 'Data',       key: 'data_venda' },
];

export default function PainelScrapPage() {
  const { from, to } = usePainelFilters();
  const { data, isLoading, isError, error } = usePainelScrap(from, to);

  const [selectedDestino, setSelectedDestino] = useState<string | null>(null);
  const [sortKey,  setSortKey]  = useState<SortKey>('data_venda');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return selectedDestino
      ? data.rows.filter(r => r.destino === selectedDestino)
      : data.rows;
  }, [data, selectedDestino]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  return (
    <div className="h-full overflow-y-auto md:overflow-hidden p-4 flex flex-col gap-3">

      {/* ── KPI bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        <div className="px-4 py-2 bg-amber-500 text-white">
          <span className="text-xs font-bold uppercase tracking-widest">Scrap</span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-zinc-200 dark:divide-white/[0.08]">
          {[
            { label: 'Faturamento',   value: isLoading || !data ? '—' : fmtBRL(data.kpi.faturamento),    cls: '' },
            { label: 'Quantidade',    value: isLoading || !data ? '—' : String(data.kpi.qtd),             cls: '' },
            { label: 'Ticket Médio',  value: isLoading || !data ? '—' : fmtBRL(data.kpi.tm),             cls: '' },
            { label: 'Peso Total',    value: isLoading || !data ? '—' : fmtPeso(data.kpi.pesoTotal),     cls: '' },
          ].map(k => (
            <div key={k.label} className="flex flex-col gap-0.5 px-2 py-2 md:px-4 md:py-2.5 min-w-0">
              <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-400 truncate">{k.label}</span>
              <span className={`text-xs md:text-sm font-bold tabular-nums truncate ${k.cls || 'text-zinc-900 dark:text-zinc-100'}`}>{k.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Loading / error ─────────────────────────────────────── */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-500">{(error as Error)?.message ?? 'Erro ao carregar dados.'}</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* ── Middle: Por Destino + B2B/B2C + Por Tipo ────────── */}
          <div className="shrink-0 md:flex-1 md:min-h-0 grid grid-cols-1 md:grid-flow-col md:auto-cols-fr gap-3">

            {/* Por Destino */}
            <div
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col md:!min-h-0"
              style={{ minHeight: chartCardHeight(data.byDestino.length) }}
            >
              <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Por Destino
              </div>
              {data.byDestino.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">Sem dados no período</div>
              ) : (
                <div className="flex-1 min-h-0">
                  <HBarChart
                    data={data.byDestino.map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd }))}
                    color="#f59e0b"
                    formatter={fmtBRL}
                    fill
                    selected={selectedDestino}
                    onSelect={v => setSelectedDestino(prev => prev === v ? null : (v ?? null))}
                  />
                </div>
              )}
            </div>

            {/* Right: B2B/B2C + Por Tipo */}
            <div className="flex flex-col gap-3 min-h-0">

              {/* B2B vs B2C */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden shrink-0">
                <div className="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-white/[0.08]">
                  {[
                    { label: 'B2B — Parceiros', kpi: data.b2b, accent: 'text-blue-600 dark:text-blue-400' },
                    { label: 'B2C — Consumidor', kpi: data.b2c, accent: 'text-emerald-600 dark:text-emerald-400' },
                  ].map(({ label, kpi, accent }) => (
                    <div key={label} className="p-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">{label}</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="min-w-0">
                          <div className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-400 truncate">Fat.</div>
                          <div className="text-[11px] md:text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{fmtBRL(kpi.faturamento)}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-400 truncate">Qtd</div>
                          <div className="text-[11px] md:text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{kpi.qtd}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-400 truncate">TM</div>
                          <div className="text-[11px] md:text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{fmtBRL(kpi.tm)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Split bar */}
                {(data.b2b.faturamento + data.b2c.faturamento) > 0 && (() => {
                  const total  = data.b2b.faturamento + data.b2c.faturamento;
                  const b2bPct = (data.b2b.faturamento / total) * 100;
                  return (
                    <div className="mx-3 mb-3">
                      <div className="h-1.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${b2bPct}%` }} />
                        <div className="h-full bg-emerald-400 flex-1" />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] font-semibold text-blue-500">{b2bPct.toFixed(0)}% B2B</span>
                        <span className="text-[10px] font-semibold text-emerald-500">{(100 - b2bPct).toFixed(0)}% B2C</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Por Tipo */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 shrink-0 md:flex-1 min-h-[280px] md:min-h-0 flex flex-col">
                <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                  Por Tipo
                </div>
                {data.byTipo.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">Sem dados</div>
                ) : (
                  <div className="flex-1 min-h-0">
                    <TipoDonut data={data.byTipo} />
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Tabela ──────────────────────────────────────────── */}
          <div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
            <table className="w-full text-xs border-separate border-spacing-0 data-table">
              <thead>
                <tr>
                  <th colSpan={COLS.length} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Detalhamento — {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'itens'}
                      </span>
                      {selectedDestino && (
                        <button
                          onClick={() => setSelectedDestino(null)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                        >
                          {selectedDestino} <X size={10} />
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="sticky top-[41px] z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
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
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TIPO_CLASS[r.tipo] ?? TIPO_CLASS.JR}`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{r.destino}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-right">{r.peso.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                    <td className="px-3 py-2 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmtBRL(r.preco_cobrado)}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_venda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedRows.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-sm">Nenhum item de scrap no período.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
