'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.substring(0, 10).split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
}

function tm(fat: number, qtd: number) {
  return qtd > 0 ? fat / qtd : 0;
}

const TIPO_CLASS: Record<string, string> = {
  JF: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  JM: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  JC: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  JR: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

type SortKey = 'referencia' | 'produto' | 'subtipo' | 'tipo' | 'custo_real' | 'preco_cobrado' | 'tipo_pedra' | 'data_venda';

const COLS: { label: string; key: SortKey }[] = [
  { label: 'Referência',    key: 'referencia' },
  { label: 'Produto',       key: 'produto' },
  { label: 'Subtipo',       key: 'subtipo' },
  { label: 'Tipo',          key: 'tipo' },
  { label: 'Custo Real',    key: 'custo_real' },
  { label: 'Preço Cobrado', key: 'preco_cobrado' },
  { label: 'Tipo Pedra',    key: 'tipo_pedra' },
  { label: 'Data Venda',    key: 'data_venda' },
];

interface TipoEntry {
  tipo: string;
  fat: number;
  custo: number;
  qtd: number;
  tm: number;
  byProduto: { name: string; value: number; qty: number }[];
}

export default function PainelEternnoPage() {
  const { from, to } = usePainelFilters();

  const { data, isLoading, isError, error } = usePainelVendas(from, to, null);

  // Filtra só ETERNNO
  const eternnoRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(r => r.destino === 'ETERNNO');
  }, [data]);

  // KPIs globais da Eternno
  const kpi = useMemo(() => {
    const fat = eternnoRows.reduce((s, r) => s + r.preco_cobrado, 0);
    const custo = eternnoRows.reduce((s, r) => s + r.custo_real, 0);
    const qtd = eternnoRows.length;
    return { fat, custo, qtd, tm: tm(fat, qtd) };
  }, [eternnoRows]);

  // Por tipo
  const byTipo = useMemo((): TipoEntry[] => {
    const tipos = ['JF', 'JM', 'JR', 'JC'] as const;
    return tipos.flatMap(tipo => {
      const rows = eternnoRows.filter(r => r.tipo === tipo);
      if (rows.length === 0) return [];
      const fat = rows.reduce((s, r) => s + r.preco_cobrado, 0);
      const custo = rows.reduce((s, r) => s + r.custo_real, 0);
      const qtd = rows.length;
      const prodMap = new Map<string, { fat: number; qtd: number }>();
      for (const r of rows) {
        const key = r.produto;
        const e = prodMap.get(key) ?? { fat: 0, qtd: 0 };
        e.fat += r.preco_cobrado; e.qtd++;
        prodMap.set(key, e);
      }
      const byProduto = Array.from(prodMap.entries())
        .map(([name, e]) => ({ name, value: e.fat, qty: e.qtd }))
        .sort((a, b) => b.value - a.value);
      return [{ tipo, fat, custo, qtd, tm: tm(fat, qtd), byProduto }];
    });
  }, [eternnoRows]);

  // Filtros
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<string | null>(null);
  const clearFilter = () => { setSelectedTipo(null); setSelectedProduto(null); };

  const filteredRows = useMemo(() => {
    return eternnoRows.filter(r => {
      if (selectedTipo && r.tipo !== selectedTipo) return false;
      if (selectedProduto && r.produto !== selectedProduto) return false;
      return true;
    });
  }, [eternnoRows, selectedTipo, selectedProduto]);

  // Sort
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

  const TIPO_HEADER: Record<string, string> = {
    JF: 'bg-indigo-600 text-white',
    JM: 'bg-purple-600 text-white',
    JR: 'bg-emerald-600 text-white',
    JC: 'bg-amber-500 text-white',
  };
  const TIPO_LABEL: Record<string, string> = {
    JF: 'Joias Fabricadas — JF',
    JM: 'Joias Modificadas — JM',
    JR: 'Joias Revenda — JR',
    JC: 'Joias Consignadas — JC',
  };

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">

      {/* KPI bar global Eternno */}
      <div className="shrink-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        <div className="px-4 py-2 bg-zinc-900 dark:bg-zinc-800 text-white">
          <span className="text-xs font-bold uppercase tracking-widest">Eternno</span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-zinc-200 dark:divide-white/[0.08]">
          {[
            { label: 'Faturamento',  value: isLoading ? '—' : fmtBRL(kpi.fat) },
            { label: 'Ticket Médio', value: isLoading ? '—' : fmtBRL(kpi.tm) },
            { label: 'Qtd',          value: isLoading ? '—' : String(kpi.qtd) },
          ].map(k => (
            <div key={k.label} className="flex flex-col gap-0.5 px-4 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{k.label}</span>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</span>
            </div>
          ))}
        </div>
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
          {/* Charts por tipo */}
          <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(byTipo.length, 1)}, 1fr)` }}>
            {byTipo.map(t => (
              <div key={t.tipo} className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden flex flex-col transition-colors ${selectedTipo === t.tipo ? 'border-indigo-400 dark:border-indigo-500' : 'border-zinc-200 dark:border-white/[0.08]'}`}>
                <div className={`${TIPO_HEADER[t.tipo] ?? 'bg-zinc-600 text-white'} px-4 py-2 shrink-0`}>
                  <span className="text-xs font-bold uppercase tracking-widest">{TIPO_LABEL[t.tipo] ?? t.tipo}</span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-white/[0.08] border-b border-zinc-200 dark:border-white/[0.08] shrink-0">
                  {[
                    { label: 'Faturamento',  value: fmtBRL(t.fat) },
                    { label: 'Ticket Médio', value: fmtBRL(t.tm) },
                    { label: 'Qtd',          value: String(t.qtd) },
                  ].map(k => (
                    <div key={k.label} className="px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{k.label}</span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-h-0 p-3">
                  <HBarChart
                    data={t.byProduto}
                    color={t.tipo === 'JF' ? '#6366f1' : t.tipo === 'JM' ? '#a855f7' : t.tipo === 'JC' ? '#f59e0b' : '#10b981'}
                    formatter={fmtBRL}
                    fill
                    selected={selectedTipo === t.tipo ? selectedProduto : null}
                    onSelect={v => {
                      if (selectedTipo === t.tipo && selectedProduto === v) clearFilter();
                      else { setSelectedTipo(t.tipo); setSelectedProduto(v); }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Tabela sticky */}
          <div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
            <table className="w-full text-xs border-separate border-spacing-0 data-table">
              <thead>
                <tr>
                  <th colSpan={8} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Detalhamento — {filteredRows.length} vendas
                      </span>
                      {(selectedTipo || selectedProduto) && (
                        <button onClick={clearFilter} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold hover:bg-indigo-100 transition-colors">
                          {selectedTipo ? (TIPO_LABEL[selectedTipo] ?? selectedTipo) : ''}{selectedProduto ? ` — ${selectedProduto}` : ''} <X size={10} />
                        </button>
                      )}
                    </div>
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
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.subtipo ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TIPO_CLASS[r.tipo] ?? TIPO_CLASS.JR}`}>{r.tipo}</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                    <td className="px-3 py-2 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmtBRL(r.preco_cobrado)}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.tipo_pedra ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_venda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedRows.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-sm">Nenhuma venda para Eternno no período.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
