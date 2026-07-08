'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
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

  const [selectedJF, setSelectedJF] = useState<string | null>(null);
  const [selectedJM, setSelectedJM] = useState<string | null>(null);
  const [selectedRV, setSelectedRV] = useState<string | null>(null);

  const jfData = useMemo(
    () => (data?.jfByProduto ?? []).map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd })),
    [data],
  );

  const jmData = useMemo(
    () => (data?.jmByProduto ?? []).map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd })),
    [data],
  );

  const rvData = useMemo(
    () => (data?.revendaByProduto ?? []).map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd })),
    [data],
  );

  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (selectedJF) return data.rows.filter(r => r.tipo === 'JF' && (r.produto === selectedJF || r.subtipo === selectedJF));
    if (selectedJM) return data.rows.filter(r => r.tipo === 'JM' && (r.produto === selectedJM || r.subtipo === selectedJM));
    if (selectedRV) return data.rows.filter(r => r.tipo !== 'JF' && r.tipo !== 'JM' && (r.produto === selectedRV || r.subtipo === selectedRV));
    return data.rows;
  }, [data, selectedJF, selectedJM, selectedRV]);

  const activeFilter = selectedJF ?? selectedJM ?? selectedRV ?? null;
  const activeLabel = selectedJF ? 'JF' : selectedJM ? 'JM' : 'Revenda';
  const clearFilter = () => { setSelectedJF(null); setSelectedJM(null); setSelectedRV(null); };

  type SortKey = 'referencia' | 'produto' | 'subtipo' | 'destino' | 'tipo' | 'custo_real' | 'preco_cobrado' | 'tipo_pedra' | 'lucrat' | 'data_venda';
  const [sortKey, setSortKey] = useState<SortKey>('data_venda');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

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

  const sections = [
    {
      label: 'Joias Fabricadas — JF',
      headerCls: 'bg-indigo-600 text-white',
      kpis: [
        { label: 'Faturamento',  value: isLoading ? '—' : fmtBRL(data?.jf.faturamento ?? 0) },
        { label: 'Ticket Médio', value: isLoading ? '—' : fmtBRL(data?.jf.tm ?? 0) },
        { label: 'Qtd',          value: isLoading ? '—' : String(data?.jf.qtd ?? 0) },
        { label: 'Lucrat.',      value: isLoading ? '—' : fmtPct(data?.jf.lucrat ?? 0) },
      ],
    },
    {
      label: 'Joias Modificadas — JM',
      headerCls: 'bg-purple-600 text-white',
      kpis: [
        { label: 'Faturamento',  value: isLoading ? '—' : fmtBRL(data?.jm.faturamento ?? 0) },
        { label: 'Ticket Médio', value: isLoading ? '—' : fmtBRL(data?.jm.tm ?? 0) },
        { label: 'Qtd',          value: isLoading ? '—' : String(data?.jm.qtd ?? 0) },
        { label: 'Lucrat.',      value: isLoading ? '—' : fmtPct(data?.jm.lucrat ?? 0) },
      ],
    },
    {
      label: 'Joias Revenda — JR',
      headerCls: 'bg-emerald-600 text-white',
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

      {/* KPI bar — 3 seções separadas */}
      <div className="shrink-0 grid grid-cols-3 gap-3">
        {sections.map(s => (
          <div key={s.label} className="border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
            <div className={`px-4 py-2 ${s.headerCls}`}>
              <span className="text-xs font-bold uppercase tracking-widest opacity-95">{s.label}</span>
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
          {/* 3 charts em grid */}
          <div className="flex-1 min-h-0 grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col min-h-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Joias Fabricadas — JF
              </p>
              <div className="flex-1 min-h-0">
                {jfData.length > 0
                  ? <HBarChart data={jfData} color="#6366f1" formatter={fmtBRL} fill selected={selectedJF} onSelect={v => { setSelectedJF(v); setSelectedJM(null); setSelectedRV(null); }} />
                  : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem vendas JF</div>}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col min-h-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Joias Modificadas — JM
              </p>
              <div className="flex-1 min-h-0">
                {jmData.length > 0
                  ? <HBarChart data={jmData} color="#a855f7" formatter={fmtBRL} fill selected={selectedJM} onSelect={v => { setSelectedJM(v); setSelectedJF(null); setSelectedRV(null); }} />
                  : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem vendas JM</div>}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col min-h-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Joias Revenda — JR
              </p>
              <div className="flex-1 min-h-0">
                {rvData.length > 0
                  ? <HBarChart data={rvData} color="#10b981" formatter={fmtBRL} fill selected={selectedRV} onSelect={v => { setSelectedRV(v); setSelectedJF(null); setSelectedJM(null); }} />
                  : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem vendas de revenda</div>}
              </div>
            </div>
          </div>

          {/* Tabela de detalhamento */}
          <div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr>
                  <th colSpan={10} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Detalhamento — {filteredRows.length} vendas
                      </span>
                      {activeFilter && (
                        <button
                          onClick={clearFilter}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                        >
                          {activeLabel} — {activeFilter} <X size={10} />
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
                <tr>
                  {([
                    { label: 'Referência',    key: 'referencia' },
                    { label: 'Produto',       key: 'produto' },
                    { label: 'Subtipo',       key: 'subtipo' },
                    { label: 'Destino',       key: 'destino' },
                    { label: 'Tipo',          key: 'tipo' },
                    { label: 'Custo Real',    key: 'custo_real' },
                    { label: 'Preço Cobrado', key: 'preco_cobrado' },
                    { label: 'Tipo Pedra',    key: 'tipo_pedra' },
                    { label: 'Lucrat.',       key: 'lucrat' },
                    { label: 'Data Venda',    key: 'data_venda' },
                  ] as { label: string; key: SortKey }[]).map(col => (
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
            {filteredRows.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-sm">Nenhuma venda no período selecionado.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
